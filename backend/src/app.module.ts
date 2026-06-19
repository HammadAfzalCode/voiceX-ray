import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envConfig } from '@infrastructure/config/env.config';
import { ClientPassthroughTtsAdapter } from '@infrastructure/tts/client-passthrough-tts.adapter';
import { VoiceGateway } from '@interface/ws/voice.gateway';

import { AppController } from './app.controller';

export const LLM_PORT = Symbol('LLM_PORT');
export const TTS_PORT = Symbol('TTS_PORT');
export const TOOL_REGISTRY_PORT = Symbol('TOOL_REGISTRY_PORT');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
  ],
  controllers: [AppController],
  providers: [
    VoiceGateway,
    // Phase 1: client TTS passthrough (yields nothing; browser speaks via speechSynthesis).
    // Phase 3: swap to ElevenLabsTtsAdapter when TTS_MODE=elevenlabs.
    { provide: TTS_PORT, useClass: ClientPassthroughTtsAdapter },
    // Phase 2: bind real adapters.
    { provide: LLM_PORT, useValue: null },
    { provide: TOOL_REGISTRY_PORT, useValue: null },
  ],
})
export class AppModule {}
