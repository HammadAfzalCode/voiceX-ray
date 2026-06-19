import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ProcessUserTurnUseCase } from '@application/use-cases/process-user-turn.use-case';
import { type EnvConfig, envConfig } from '@infrastructure/config/env.config';
import { OpenRouterLlmAdapter } from '@infrastructure/llm/openrouter-llm.adapter';
import { ToolRegistry } from '@infrastructure/tools/tool-registry';
import { ClientPassthroughTtsAdapter } from '@infrastructure/tts/client-passthrough-tts.adapter';
import { ElevenLabsTtsAdapter } from '@infrastructure/tts/elevenlabs-tts.adapter';
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
    {
      provide: TTS_PORT,
      useFactory: (config: ConfigService<EnvConfig>) =>
        config.get('TTS_MODE') === 'elevenlabs'
          ? new ElevenLabsTtsAdapter(config)
          : new ClientPassthroughTtsAdapter(),
      inject: [ConfigService],
    },
    { provide: TOOL_REGISTRY_PORT, useClass: ToolRegistry },
  ],
})
export class AppModule {}
