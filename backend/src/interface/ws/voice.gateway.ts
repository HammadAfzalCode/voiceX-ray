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

import { ProcessUserTurnUseCase } from '@application/use-cases/process-user-turn.use-case';

import { SocketTurnOutputAdapter } from './socket-turn-output.adapter';
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

  constructor(private readonly useCase: ProcessUserTurnUseCase) {}

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

    const adapter = new SocketTurnOutputAdapter(client, dto.text);
    void this.useCase.execute(dto.text, adapter).catch((err: unknown) => {
      console.error('[gateway] turn error:', err);
      client.emit(WsEvents.ERROR, { message: 'Turn failed — please try again.' });
    });
  }
}
