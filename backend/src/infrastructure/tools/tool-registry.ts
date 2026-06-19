import type { ToolRegistryPort, ToolSpec } from '@domain/ports/tool-registry.port';

export class ToolRegistry implements ToolRegistryPort {
  // Implemented in Phase 5.
  list(): readonly ToolSpec[] {
    return [];
  }

  execute(_name: string, _args: unknown): Promise<unknown> {
    return Promise.reject(new Error('Not yet implemented — Phase 5'));
  }
}
