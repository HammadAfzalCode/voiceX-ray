import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { LlmDelta, LlmMessage, LlmPort } from '@domain/ports/llm.port';
import type { EnvConfig } from '@infrastructure/config/env.config';

interface AccumulatedCall {
  id: string;
  name: string;
  args: string;
}

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
    tools: readonly unknown[],
  ): AsyncGenerator<LlmDelta> {
    const openaiMessages = messages.map<OpenAI.Chat.ChatCompletionMessageParam>((m) => {
      switch (m.role) {
        case 'system':
          return { role: 'system', content: m.content };
        case 'user':
          return { role: 'user', content: m.content };
        case 'assistant':
          if (m.tool_calls && m.tool_calls.length > 0) {
            return {
              role: 'assistant',
              content: m.content || null,
              tool_calls: m.tool_calls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
              })),
            };
          }
          return { role: 'assistant', content: m.content };
        case 'tool':
          return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id ?? '' };
      }
    });

    const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
      model: this.model,
      messages: openaiMessages,
      stream: true,
    };

    if (tools.length > 0) {
      params.tools = tools as OpenAI.Chat.ChatCompletionTool[];
    }

    const chatStream = await this.client.chat.completions.create(params);
    const accumulated = new Map<number, AccumulatedCall>();

    for await (const chunk of chatStream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const { delta, finish_reason } = choice;

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const existing = accumulated.get(idx);
          if (!existing) {
            accumulated.set(idx, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              args: tc.function?.arguments ?? '',
            });
          } else {
            existing.args += tc.function?.arguments ?? '';
          }
        }
      } else if (delta.content) {
        yield { type: 'token', text: delta.content };
      }

      if (finish_reason === 'tool_calls') {
        for (const call of accumulated.values()) {
          yield { type: 'tool_call', id: call.id, name: call.name, args: call.args };
        }
        yield { type: 'done' };
        return;
      }

      if (finish_reason === 'stop') {
        yield { type: 'done' };
        return;
      }
    }

    yield { type: 'done' };
  }
}
