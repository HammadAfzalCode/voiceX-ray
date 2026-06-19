export type LlmDelta =
  | { readonly type: 'token'; readonly text: string }
  | {
      readonly type: 'tool_call_delta';
      readonly id: string;
      readonly name: string;
      readonly argsChunk: string;
    }
  | { readonly type: 'done' };

export interface LlmToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface LlmMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly LlmToolCall[];
}

export interface LlmPort {
  stream(
    messages: readonly LlmMessage[],
    tools: readonly unknown[],
  ): AsyncIterable<LlmDelta>;
}
