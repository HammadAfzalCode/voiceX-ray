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
  'You are a helpful, concise voice assistant. Keep responses to 1–3 sentences. Be direct and natural.';
const MAX_HISTORY = 16;

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

    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.history.slice(-MAX_HISTORY),
      { role: 'user', content: transcript },
    ];

    mark('llm_request_sent');

    let fullText = '';
    let firstToken = true;
    let firstSentence = true;
    let firstTtsAudio = true;

    for await (const delta of this.llm.stream(messages, this.tools.list())) {
      if (delta.type === 'token') {
        if (firstToken) {
          mark('llm_first_token');
          firstToken = false;
        }

        fullText += delta.text;
        output.onToken(turnId, delta.text);

        for (const sentence of chunker.feed(delta.text)) {
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
      } else if (delta.type === 'done') {
        break;
      }
    }

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

    this.history.push({ role: 'user', content: transcript });
    this.history.push({ role: 'assistant', content: fullText });

    mark('turn_complete');
    output.onTurnEnd(turnId, trace);
  }
}
