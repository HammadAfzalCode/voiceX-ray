import type { ZodObject, ZodRawShape } from 'zod';

export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: ZodObject<ZodRawShape>;
}

export interface ToolRegistryPort {
  list(): readonly ToolSpec[];
  execute(name: string, args: unknown): Promise<unknown>;
}
