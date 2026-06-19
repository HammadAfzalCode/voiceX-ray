import { randomUUID } from 'crypto';

import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { UserTranscriptDto, WsEvents } from './ws-messages';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  handleConnection(client: Socket): void {
    console.warn(`[ws] connected  ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.warn(`[ws] disconnected ${client.id}`);
  }

  @SubscribeMessage(WsEvents.USER_TRANSCRIPT)
  handleTranscript(
    @MessageBody() dto: UserTranscriptDto,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!dto.isFinal) return;

    const turnId = randomUUID();

    // Phase 1: echo loop — no LLM yet.
    client.emit(WsEvents.STT_FINAL, { turnId, text: dto.text });
    client.emit(WsEvents.LLM_SENTENCE, { turnId, text: `Echo: ${dto.text}` });
  }
}
