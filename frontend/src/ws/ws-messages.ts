// Keep in sync with backend/src/interface/ws/ws-messages.ts

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

// ─── Payload types (server → client) ─────────────────────────────────────────

export interface TurnStartPayload {
  turnId: string;
}

export interface SttFinalPayload {
  turnId: string;
  text: string;
}

export interface LlmTokenPayload {
  turnId: string;
  token: string;
}

export interface LlmSentencePayload {
  turnId: string;
  text: string;
}

export interface ToolCallPayload {
  turnId: string;
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResultPayload {
  turnId: string;
  callId: string;
  name: string;
  result: Record<string, unknown>;
}

export interface TtsAudioPayload {
  turnId: string;
  seq: number;
  data: string; // base64-encoded
  mime: string;
}

export interface LatencyMarkPayload {
  turnId: string;
  stage: string;
  tMs: number;
}

export interface TurnEndPayload {
  turnId: string;
  latencyTrace: Record<string, number>;
}

// ─── Payload types (client → server) ─────────────────────────────────────────

export interface UserTranscriptPayload {
  text: string;
  isFinal: boolean;
}
