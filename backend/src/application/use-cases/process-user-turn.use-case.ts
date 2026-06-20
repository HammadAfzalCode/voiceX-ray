import { randomUUID } from 'crypto';

import { Inject, Injectable } from '@nestjs/common';

import { SentenceChunkerService } from '@application/services/sentence-chunker.service';
import { type LlmMessage, LlmPort } from '@domain/ports/llm.port';
import { ToolRegistryPort } from '@domain/ports/tool-registry.port';
import { TtsPort } from '@domain/ports/tts.port';
import type { TurnOutputPort } from '@domain/ports/turn-output.port';
import type { MutableLatencyTrace, SpineStage } from '@domain/value-objects/latency-trace';

import { LLM_PORT, TOOL_REGISTRY_PORT, TTS_PORT } from '../../di-tokens';

const SYSTEM_PROMPT =
  'You are a helpful, concise voice assistant. Keep responses to 1–3 sentences unless a tool result requires more detail. Be direct and natural.';
const MAX_HISTORY = 16;

interface PendingCall {
  id: string;
  name: string;
  args: string;
}

@Injectable()
export class ProcessUserTurnUseCase {
  private readonly history: LlmMessage[] = [];

  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(TTS_PORT) private readonly tts: TtsPort,
    @Inject(TOOL_REGISTRY_PORT) private readonly tools: ToolRegistryPort,
  ) {}

  async execute(transcript: string, output: TurnOutputPort): Promise<void> {
    const turnId = randomUUID();
    const t0 = performance.now();
    const trace: MutableLatencyTrace = new Map<SpineStage, number>();
    const chunker = new SentenceChunkerService();

    const mark = (stage: SpineStage): void => {
      const tMs = performance.now() - t0;
      trace.set(stage, tMs);
      output.onLatencyMark(turnId, stage, tMs);
    };

    output.onTurnStart(turnId);
    mark('transcript_received');

    const currentMessages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.history.slice(-MAX_HISTORY),
      { role: 'user', content: transcript },
    ];

    const toolList = this.tools.list();
    mark('llm_request_sent');

    let fullText = '';
    let firstToken = true;
    let firstSentence = true;
    let firstTtsAudio = true;

    const processToken = async (text: string): Promise<void> => {
      if (firstToken) {
        mark('llm_first_token');
        firstToken = false;
      }
      fullText += text;
      output.onToken(turnId, text);

      for (const sentence of chunker.feed(text)) {
        if (firstSentence) {
          mark('first_sentence_ready');
          firstSentence = false;
        }
        output.onSentence(turnId, sentence.text);

        for await (const chunk of this.tts.synthesize(sentence.text)) {
          if (firstTtsAudio) {
            mark('first_tts_audio');
            firstTtsAudio = false;
          }
          output.onAudio(turnId, chunk);
        }
      }
    };

    // ── First LLM stream ──────────────────────────────────────────────────────
    const pendingCalls: PendingCall[] = [];

    for await (const delta of this.llm.stream(currentMessages, toolList)) {
      if (delta.type === 'token') {
        await processToken(delta.text);
      } else if (delta.type === 'tool_call') {
        pendingCalls.push({ id: delta.id, name: delta.name, args: delta.args });
      } else {
        break; // 'done'
      }
    }

    // ── Tool execution ────────────────────────────────────────────────────────
    const toolResultMessages: LlmMessage[] = [];

    if (pendingCalls.length > 0) {
      mark('tool_call_start');

      currentMessages.push({
        role: 'assistant',
        content: '',
        tool_calls: pendingCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.args },
        })),
      });

      for (const tc of pendingCalls) {
        let parsedArgs: unknown;
        try {
          parsedArgs = JSON.parse(tc.args) as unknown;
        } catch {
          parsedArgs = {};
        }

        output.onToolCall(turnId, tc.id, tc.name, parsedArgs);

        let result: unknown;
        try {
          result = await this.tools.execute(tc.name, parsedArgs);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : 'Tool execution failed' };
        }

        output.onToolResult(turnId, tc.id, tc.name, result);

        const toolMsg: LlmMessage = {
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: tc.id,
        };
        currentMessages.push(toolMsg);
        toolResultMessages.push(toolMsg);
      }

      mark('tool_call_end');

      // ── Second LLM stream ────────────────────────────────────────────────────
      for await (const delta of this.llm.stream(currentMessages, toolList)) {
        if (delta.type === 'token') {
          await processToken(delta.text);
        } else {
          break; // 'done'
        }
      }
    }

    // ── Flush remaining sentences ─────────────────────────────────────────────
    for (const sentence of chunker.flush()) {
      if (firstSentence) {
        mark('first_sentence_ready');
        firstSentence = false;
      }
      output.onSentence(turnId, sentence.text);

      for await (const chunk of this.tts.synthesize(sentence.text)) {
        if (firstTtsAudio) {
          mark('first_tts_audio');
          firstTtsAudio = false;
        }
        output.onAudio(turnId, chunk);
      }
    }

    mark('llm_done');

    // ── History ───────────────────────────────────────────────────────────────
    this.history.push({ role: 'user', content: transcript });
    if (pendingCalls.length > 0) {
      this.history.push({
        role: 'assistant',
        content: '',
        tool_calls: pendingCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.args },
        })),
      });
      this.history.push(...toolResultMessages);
    }
    if (fullText) {
      this.history.push({ role: 'assistant', content: fullText });
    }

    mark('turn_complete');
    output.onTurnEnd(turnId, trace);
  }
}
