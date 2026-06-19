import { describe, it } from 'vitest';

// Contract tests for LlmPort adapters.
// Real tests run in Phase 2 when OpenRouterLlmAdapter is implemented.
// They require OPENROUTER_API_KEY to be set.

describe.skipIf(!process.env['OPENROUTER_API_KEY'])('OpenRouterLlmAdapter contract', () => {
  it.todo('yields at least one token delta for a simple prompt');
  it.todo('yields exactly one done delta as the final item');
  it.todo('yields tool_call_delta items when tools are provided and the model uses them');
});
