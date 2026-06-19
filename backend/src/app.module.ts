import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProcessUserTurnUseCase } from '@application/use-cases/process-user-turn.use-case';
import { envConfig } from '@infrastructure/config/env.config';
import { OpenRouterLlmAdapter } from '@infrastructure/llm/openrouter-llm.adapter';
import { ToolRegistry } from '@infrastructure/tools/tool-registry';
import { ClientPassthroughTtsAdapter } from '@infrastructure/tts/client-passthrough-tts.adapter';
import { VoiceGateway } from '@interface/ws/voice.gateway';

import { AppController } from './app.controller';
import { LLM_PORT, TTS_PORT, TOOL_REGISTRY_PORT } from './di-tokens';

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
    ProcessUserTurnUseCase,
    { provide: LLM_PORT, useClass: OpenRouterLlmAdapter },
    // Phase 3: swap to ElevenLabsTtsAdapter when TTS_MODE=elevenlabs.
    { provide: TTS_PORT, useClass: ClientPassthroughTtsAdapter },
    { provide: TOOL_REGISTRY_PORT, useClass: ToolRegistry },
  ],
})
export class AppModule {}
