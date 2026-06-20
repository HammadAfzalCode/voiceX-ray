import { zodToJsonSchema as _zodToJsonSchema } from 'zod-to-json-schema';

import type { ToolRegistryPort, ToolSpec } from '@domain/ports/tool-registry.port';

// Cast to a simpler signature to avoid TS2589 (excessively deep type instantiation)
// when zodToJsonSchema's conditional types are resolved against ZodObject<ZodRawShape>.
const zodToJsonSchema = _zodToJsonSchema as (
  schema: object,
  options: object,
) => Record<string, unknown>;

function specToJsonSchema(spec: ToolSpec): Record<string, unknown> {
  return zodToJsonSchema(spec.parameters, { $refStrategy: 'none' });
}

import { executeKnowledge, knowledgeSpec } from './knowledge.tool';
import { executeTime, timeSpec } from './time.tool';
import { executeWeather, weatherSpec } from './weather.tool';

type ToolHandler = (args: unknown) => unknown;

interface ToolEntry {
  spec: ToolSpec;
  handler: ToolHandler;
}

const TOOLS: readonly ToolEntry[] = [
  { spec: weatherSpec, handler: executeWeather },
  { spec: timeSpec, handler: executeTime },
  { spec: knowledgeSpec, handler: executeKnowledge },
];

const HANDLER_MAP = new Map<string, ToolHandler>(TOOLS.map((t) => [t.spec.name, t.handler]));

const OPENAI_TOOLS = TOOLS.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.spec.name,
    description: t.spec.description,
    parameters: specToJsonSchema(t.spec),
  },
}));

export class ToolRegistry implements ToolRegistryPort {
  list(): readonly unknown[] {
    return OPENAI_TOOLS;
  }

  execute(name: string, args: unknown): Promise<unknown> {
    const handler = HANDLER_MAP.get(name);
    if (!handler) return Promise.reject(new Error(`Unknown tool: ${name}`));
    return Promise.resolve(handler(args));
  }
}
