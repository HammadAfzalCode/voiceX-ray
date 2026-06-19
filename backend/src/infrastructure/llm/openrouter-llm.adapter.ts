import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { LlmDelta, LlmMessage, LlmPort } from '@domain/ports/llm.port';
import type { EnvConfig } from '@infrastructure/config/env.config';

@Injectable()
export class OpenRouterLlmAdapter implements LlmPort {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: ConfigService<EnvConfig>) {
    this.client = new OpenAI({
      apiKey: config.get('OPENROUTER_API_KEY') ?? '',
      baseURL: 'https://openrouter.ai/api/v1',
    });
    this.model = config.get('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';
  }

  async *stream(
    messages: readonly LlmMessage[],
    _tools: readonly unknown[],
  ): AsyncGenerator<LlmDelta> {
    const openaiMessages = messages.map<OpenAI.Chat.ChatCompletionMessageParam>((m) => {
      switch (m.role) {
        case 'system':
          return { role: 'system', content: m.content };
        case 'user':
          return { role: 'user', content: m.content };
        case 'assistant':
          return { role: 'assistant', content: m.content };
        case 'tool':
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id ?? '' };
      }
    });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const { delta, finish_reason } = choice;

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          yield {
            type: 'tool_call_delta',
            id: tc.id ?? '',
            name: tc.function?.name ?? '',
            argsChunk: tc.function?.arguments ?? '',
          };
        }
      } else if (delta.content) {
        yield { type: 'token', text: delta.content };
      }

      if (finish_reason === 'stop' || finish_reason === 'tool_calls') {
        yield { type: 'done' };
        return;
      }
    }

    yield { type: 'done' };
  }
}
