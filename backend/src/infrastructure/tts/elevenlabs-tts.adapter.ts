import type { TtsPort } from '@domain/ports/tts.port';
import type { AudioChunk } from '@domain/value-objects/audio-chunk';

export class ElevenLabsTtsAdapter implements TtsPort {
  // Implemented in Phase 3.
  synthesize(_text: string): AsyncIterable<AudioChunk> {
    throw new Error('Not yet implemented — Phase 3');
  }
}
