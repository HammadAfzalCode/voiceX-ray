import type { TurnOutputPort } from '@domain/ports/turn-output.port';

export class ProcessUserTurnUseCase {
  // Implemented in Phase 2 — injected ports and full LLM streaming logic.
  execute(_transcript: string, _output: TurnOutputPort): Promise<void> {
    return Promise.reject(new Error('Not yet implemented — Phase 2'));
  }
}
