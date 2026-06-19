import type { Socket } from 'socket.io';

import type { TurnOutputPort } from '@domain/ports/turn-output.port';
import type { AudioChunk } from '@domain/value-objects/audio-chunk';
import type { LatencyTrace, SpineStage } from '@domain/value-objects/latency-trace';

import { WsEvents } from './ws-messages';

export class SocketTurnOutputAdapter implements TurnOutputPort {
  constructor(
    private readonly socket: Socket,
    private readonly transcript: string,
  ) {}

  onTurnStart(turnId: string): void {
    this.socket.emit(WsEvents.TURN_START, { turnId });
    this.socket.emit(WsEvents.STT_FINAL, { turnId, text: this.transcript });
  }

  onToken(turnId: string, token: string): void {
    this.socket.emit(WsEvents.LLM_TOKEN, { turnId, token });
  }

  onSentence(turnId: string, text: string): void {
    this.socket.emit(WsEvents.LLM_SENTENCE, { turnId, text });
  }

  onToolCall(turnId: string, callId: string, name: string, args: unknown): void {
    this.socket.emit(WsEvents.TOOL_CALL, { turnId, callId, name, args });
  }

  onToolResult(turnId: string, callId: string, name: string, result: unknown): void {
    this.socket.emit(WsEvents.TOOL_RESULT, { turnId, callId, name, result });
  }

  onAudio(turnId: string, chunk: AudioChunk): void {
    this.socket.emit(WsEvents.TTS_AUDIO, {
      turnId,
      seq: chunk.seq,
      data: Buffer.from(chunk.data).toString('base64'),
      mime: chunk.mime,
    });
  }

  onLatencyMark(turnId: string, stage: SpineStage, tMs: number): void {
    this.socket.emit(WsEvents.LATENCY_MARK, { turnId, stage, tMs });
  }

  onTurnEnd(turnId: string, latencyTrace: LatencyTrace): void {
    this.socket.emit(WsEvents.TURN_END, {
      turnId,
      latencyTrace: Object.fromEntries(latencyTrace),
    });
  }
}
