import type { ToolCall } from './tool-call';
import type { LatencyTrace } from '../value-objects/latency-trace';

export interface ConversationTurn {
  readonly id: string;
  readonly userTranscript: string;
  readonly assistantText: string;
  readonly toolCalls: readonly ToolCall[];
  readonly latency: LatencyTrace;
}
