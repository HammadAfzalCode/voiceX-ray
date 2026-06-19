import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  TTS_MODE: z.enum(['client', 'elevenlabs']).default('client'),
  MAX_HISTORY_TURNS: z.string().default('8'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4o-mini'),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().optional(),
  ELEVENLABS_MODEL: z.string().default('eleven_flash_v2_5'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const envConfig = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${result.error.message}`);
  }
  return result.data;
};
