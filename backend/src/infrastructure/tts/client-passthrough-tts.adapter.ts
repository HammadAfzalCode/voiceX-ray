import type { TtsPort } from '@domain/ports/tts.port';
import type { AudioChunk } from '@domain/value-objects/audio-chunk';

export class ClientPassthroughTtsAdapter implements TtsPort {
  // Client TTS mode: the frontend speaks via speechSynthesis from llm.sentence events.
  // This adapter yields nothing — TTS is handled entirely in the browser.
  synthesize(_text: string): AsyncIterable<AudioChunk> {
    return {
      [Symbol.asyncIterator](): AsyncIterator<AudioChunk> {
        return { next: () => Promise.resolve({ value: undefined as unknown as AudioChunk, done: true }) };
      },
    };
  }
}
