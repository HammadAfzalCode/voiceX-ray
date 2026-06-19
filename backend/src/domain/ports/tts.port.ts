import type { AudioChunk } from '../value-objects/audio-chunk';

export interface TtsPort {
  synthesize(text: string): AsyncIterable<AudioChunk>;
}
