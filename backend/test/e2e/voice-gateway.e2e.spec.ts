import { describe, it } from 'vitest';

// E2E gateway tests run against the full NestJS app with stub adapters.
// Implemented in Phase 2 alongside the real gateway logic.

describe('VoiceGateway (e2e)', () => {
  it.todo('full turn: user.transcript → stt.final + llm.sentence → turn.end');
});
