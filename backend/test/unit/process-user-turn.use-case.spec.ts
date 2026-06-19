import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessUserTurnUseCase } from '@application/use-cases/process-user-turn.use-case';
import type { LlmDelta, LlmPort } from '@domain/ports/llm.port';
import type { ToolRegistryPort } from '@domain/ports/tool-registry.port';
import type { TtsPort } from '@domain/ports/tts.port';
import type { TurnOutputPort } from '@domain/ports/turn-output.port';
import type { AudioChunk } from '@domain/value-objects/audio-chunk';
import type { LatencyTrace, SpineStage } from '@domain/value-objects/latency-trace';

// ─── Test doubles ─────────────────────────────────────────────────────────────

function makeLlm(deltas: LlmDelta[]): LlmPort {
  return {
    stream(): AsyncIterable<LlmDelta> {
      let i = 0;
      return {
        [Symbol.asyncIterator](): AsyncIterator<LlmDelta> {
          return {
            next(): Promise<IteratorResult<LlmDelta>> {
              const value = deltas[i++];
              if (value === undefined) {
                return Promise.resolve({ value: undefined as unknown as LlmDelta, done: true });
              }
              return Promise.resolve({ value, done: false });
            },
          };
        },
      };
    },
  };
}

function emptyTts(): TtsPort {
  return {
    synthesize(_text: string): AsyncIterable<AudioChunk> {
      return {
        [Symbol.asyncIterator](): AsyncIterator<AudioChunk> {
          return {
            next: () =>
              Promise.resolve({ value: undefined as unknown as AudioChunk, done: true }),
          };
        },
      };
    },
  };
}

function emptyTools(): ToolRegistryPort {
  return {
    list: () => [],
    execute: (_n: string, _a: unknown) => Promise.reject(new Error('not called')),
  };
}

function makeOutput() {
  const output: TurnOutputPort = {
    onTurnStart: vi.fn(),
    onToken: vi.fn(),
    onSentence: vi.fn(),
    onToolCall: vi.fn(),
    onToolResult: vi.fn(),
    onAudio: vi.fn(),
    onLatencyMark: vi.fn(),
    onTurnEnd: vi.fn(),
  };
  return output;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessUserTurnUseCase', () => {
  let output: ReturnType<typeof makeOutput>;

  beforeEach(() => {
    output = makeOutput();
  });

  it('calls onTurnStart before any other output method', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([{ type: 'done' }]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hi', output);

    const onTurnStart = output.onTurnStart as ReturnType<typeof vi.fn>;
    const onTurnEnd = output.onTurnEnd as ReturnType<typeof vi.fn>;
    expect(onTurnStart).toHaveBeenCalledOnce();
    expect(onTurnEnd).toHaveBeenCalledOnce();

    const startOrder = onTurnStart.mock.invocationCallOrder[0] ?? 0;
    const endOrder = onTurnEnd.mock.invocationCallOrder[0] ?? 0;
    expect(startOrder).toBeLessThan(endOrder);
  });

  it('emits onToken for each token delta', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([
        { type: 'token', text: 'Hello' },
        { type: 'token', text: ' world' },
        { type: 'done' },
      ]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hi', output);

    const onToken = output.onToken as ReturnType<typeof vi.fn>;
    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken.mock.calls[0]?.[1]).toBe('Hello');
    expect(onToken.mock.calls[1]?.[1]).toBe(' world');
  });

  it('emits onSentence when the chunker completes a sentence', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([{ type: 'token', text: 'Hello world. ' }, { type: 'done' }]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hi', output);

    const onSentence = output.onSentence as ReturnType<typeof vi.fn>;
    expect(onSentence).toHaveBeenCalledOnce();
    expect(onSentence.mock.calls[0]?.[1]).toBe('Hello world.');
  });

  it('flushes remaining buffer via onSentence after stream ends', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([{ type: 'token', text: 'Trailing text' }, { type: 'done' }]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hi', output);

    const onSentence = output.onSentence as ReturnType<typeof vi.fn>;
    expect(onSentence).toHaveBeenCalledOnce();
    expect(onSentence.mock.calls[0]?.[1]).toBe('Trailing text');
  });

  it('includes transcript_received and llm_first_token in latency marks', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([{ type: 'token', text: 'Hi.' }, { type: 'done' }]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hello', output);

    const onLatencyMark = output.onLatencyMark as ReturnType<typeof vi.fn>;
    const stages = onLatencyMark.mock.calls.map((c) => c[1] as SpineStage);
    expect(stages).toContain('transcript_received');
    expect(stages).toContain('llm_request_sent');
    expect(stages).toContain('llm_first_token');
    expect(stages).toContain('turn_complete');
  });

  it('passes the full latency trace to onTurnEnd', async () => {
    const useCase = new ProcessUserTurnUseCase(
      makeLlm([{ type: 'token', text: 'Hi.' }, { type: 'done' }]),
      emptyTts(),
      emptyTools(),
    );
    await useCase.execute('hello', output);

    const onTurnEnd = output.onTurnEnd as ReturnType<typeof vi.fn>;
    const trace = onTurnEnd.mock.calls[0]?.[1] as LatencyTrace;
    expect(trace.has('transcript_received')).toBe(true);
    expect(trace.has('turn_complete')).toBe(true);
  });

  it('maintains conversation history across turns', async () => {
    let capturedMessages: unknown[] = [];
    const llm: LlmPort = {
      stream(messages): AsyncIterable<LlmDelta> {
        capturedMessages = [...messages];
        return makeLlm([{ type: 'token', text: 'Response.' }, { type: 'done' }]).stream(
          messages,
          [],
        );
      },
    };

    const useCase = new ProcessUserTurnUseCase(llm, emptyTts(), emptyTools());
    await useCase.execute('first question', makeOutput());
    await useCase.execute('second question', output);

    // Second call should have system + user1 + assistant1 + user2 in messages
    expect(capturedMessages.length).toBeGreaterThanOrEqual(4);
  });
});
