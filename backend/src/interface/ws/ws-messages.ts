// Keep in sync with frontend/src/ws/ws-messages.ts

import { IsBoolean, IsString } from 'class-validator';

// ─── Inbound DTOs (client → server) ──────────────────────────────────────────

export class UserTranscriptDto {
  @IsString()
  text!: string;

  @IsBoolean()
  isFinal!: boolean;
}

export class UserInterruptDto {}

// ─── WS event names ───────────────────────────────────────────────────────────

export const WsEvents = {
  // Server → Client
  TURN_START: 'turn.start',
  STT_FINAL: 'stt.final',
  LLM_TOKEN: 'llm.token',
  LLM_SENTENCE: 'llm.sentence',
  TOOL_CALL: 'tool.call',
  TOOL_RESULT: 'tool.result',
  TTS_AUDIO: 'tts.audio',
  LATENCY_MARK: 'latency.mark',
  TURN_END: 'turn.end',
  ERROR: 'error',

  // Client → Server
  SESSION_START: 'session.start',
  USER_TRANSCRIPT: 'user.transcript',
  USER_INTERRUPT: 'user.interrupt',
} as const;

export type WsEventName = (typeof WsEvents)[keyof typeof WsEvents];
