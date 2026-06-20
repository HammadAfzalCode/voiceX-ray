import { z } from 'zod';

import type { ToolSpec } from '@domain/ports/tool-registry.port';

const argsSchema = z.object({
  timezone: z.string().default('UTC').describe('IANA timezone name, e.g. "Asia/Karachi"'),
});

export const timeSpec: ToolSpec = {
  name: 'get_time',
  description: 'Get the current date and time in any timezone.',
  parameters: argsSchema,
};

export function executeTime(rawArgs: unknown): unknown {
  const { timezone } = argsSchema.parse(rawArgs);

  const now = new Date();
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(now);

  return { timezone, datetime: formatted };
}
