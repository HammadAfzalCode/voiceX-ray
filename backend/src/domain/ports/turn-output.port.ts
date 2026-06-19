import type { AudioChunk } from '../value-objects/audio-chunk';
import type { LatencyTrace, SpineStage } from '../value-objects/latency-trace';

export interface TurnOutputPort {
  onTurnStart(turnId: string): void;
  onToken(turnId: string, token: string): void;
  onSentence(turnId: string, text: string): void;
  onToolCall(turnId: string, callId: string, name: string, args: unknown): void;
  onToolResult(turnId: string, callId: string, name: string, result: unknown): void;
  onAudio(turnId: string, chunk: AudioChunk): void;
  onLatencyMark(turnId: string, stage: SpineStage, tMs: number): void;
  onTurnEnd(turnId: string, latencyTrace: LatencyTrace): void;
}
