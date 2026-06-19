import type { LlmDelta, LlmMessage, LlmPort } from '@domain/ports/llm.port';

export class OpenRouterLlmAdapter implements LlmPort {
  // Implemented in Phase 2.
  stream(_messages: readonly LlmMessage[], _tools: readonly unknown[]): AsyncIterable<LlmDelta> {
    throw new Error('Not yet implemented — Phase 2');
  }
}
