import { describe, expect, it } from 'vitest';

import type { AudioChunk } from '@domain/value-objects/audio-chunk';
import { ElevenLabsTtsAdapter } from '@infrastructure/tts/elevenlabs-tts.adapter';

const hasKey = Boolean(process.env['ELEVENLABS_API_KEY']);

function makeAdapter(): ElevenLabsTtsAdapter {
  return new ElevenLabsTtsAdapter({
    get: (key: string): string | undefined => process.env[key],
  } as never);
}

describe.skipIf(!hasKey)('ElevenLabsTtsAdapter (contract)', () => {
  it('yields at least one AudioChunk for a short sentence', async () => {
    const chunks: AudioChunk[] = [];
    for await (const chunk of makeAdapter().synthesize('Hello.')) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.seq).toBe(0);
    expect(chunks[0]?.data.byteLength).toBeGreaterThan(0);
    expect(chunks[0]?.mime).toBe('audio/mpeg');
  });

  it('assigns sequential seq numbers', async () => {
    let expected = 0;
    for await (const chunk of makeAdapter().synthesize('This tests sequential chunk numbering.')) {
      expect(chunk.seq).toBe(expected++);
    }
    expect(expected).toBeGreaterThan(0);
  });
});
