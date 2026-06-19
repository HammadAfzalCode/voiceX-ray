import type { IncomingMessage } from 'http';
import https from 'https';

import type { ConfigService } from '@nestjs/config';

import type { TtsPort } from '@domain/ports/tts.port';
import type { AudioChunk } from '@domain/value-objects/audio-chunk';
import type { EnvConfig } from '@infrastructure/config/env.config';

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

export class ElevenLabsTtsAdapter implements TtsPort {
  private readonly apiKey: string;
  private readonly voiceId: string;
  private readonly model: string;

  constructor(config: ConfigService<EnvConfig>) {
    this.apiKey = config.get('ELEVENLABS_API_KEY') ?? '';
    this.voiceId = config.get('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE_ID;
    this.model = config.get('ELEVENLABS_MODEL') ?? 'eleven_flash_v2_5';
  }

  private streamRequest(text: string): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
      const body = JSON.stringify({
        text,
        model_id: this.model,
        output_format: 'mp3_44100_128',
      });

      const req = https.request(
        {
          hostname: 'api.elevenlabs.io',
          path: `/v1/text-to-speech/${this.voiceId}/stream`,
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          if ((res.statusCode ?? 0) >= 400) {
            const errChunks: Buffer[] = [];
            res.on('data', (c: Buffer) => {
              errChunks.push(c);
            });
            res.on('end', () => {
              reject(
                new Error(
                  `ElevenLabs ${String(res.statusCode)}: ${Buffer.concat(errChunks).toString()}`,
                ),
              );
            });
          } else {
            resolve(res);
          }
        },
      );

      req.on('error', reject);
      req.end(body);
    });
  }

  async *synthesize(text: string): AsyncGenerator<AudioChunk> {
    const res = await this.streamRequest(text);
    let seq = 0;

    const pending: Buffer[] = [];
    let ended = false;
    let streamError: Error | undefined;
    let notify: (() => void) | null = null;

    const wakeUp = (): void => {
      if (notify) {
        notify();
        notify = null;
      }
    };

    res.on('data', (chunk: Buffer) => {
      pending.push(chunk);
      wakeUp();
    });
    res.on('end', () => {
      ended = true;
      wakeUp();
    });
    res.on('error', (err: Error) => {
      streamError = err;
      ended = true;
      wakeUp();
    });

    while (!ended || pending.length > 0) {
      if (pending.length === 0 && !ended) {
        await new Promise<void>((r) => {
          notify = r;
        });
      }
      if (streamError) throw streamError;
      const chunk = pending.shift();
      if (chunk) {
        yield { seq: seq++, data: chunk, mime: 'audio/mpeg' };
      }
    }

    if (streamError) throw streamError;
  }
}
