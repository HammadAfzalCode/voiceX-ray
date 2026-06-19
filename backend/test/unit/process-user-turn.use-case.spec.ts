import { describe, it, expect } from 'vitest';

import { ProcessUserTurnUseCase } from '@application/use-cases/process-user-turn.use-case';

describe('ProcessUserTurnUseCase', () => {
  it('throws NotImplemented — will be replaced in Phase 2', async () => {
    const useCase = new ProcessUserTurnUseCase();
    // Phase 1 stub — the real test suite is built in Phase 2.
    await expect(useCase.execute('hello', {} as never)).rejects.toThrow('Not yet implemented');
  });
});
