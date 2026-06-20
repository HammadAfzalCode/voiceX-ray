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

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly useCase: ProcessUserTurnUseCase) {}

  handleConnection(client: Socket): void {
    console.warn(`[ws] connected  ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.controllers.get(client.id)?.abort();
    this.controllers.delete(client.id);
    console.warn(`[ws] disconnected ${client.id}`);
  }

  @SubscribeMessage(WsEvents.USER_TRANSCRIPT)
  handleTranscript(
    @MessageBody() dto: UserTranscriptDto,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!dto.isFinal) return;

    // Abort any in-flight turn for this client before starting the new one.
    this.controllers.get(client.id)?.abort();
    const ctrl = new AbortController();
    this.controllers.set(client.id, ctrl);

    const adapter = new SocketTurnOutputAdapter(client, dto.text);
    void this.useCase.execute(dto.text, adapter, ctrl.signal).catch((err: unknown) => {
      this.controllers.delete(client.id);
      if (isAbortError(err)) return;
      console.error('[gateway] turn error:', err);
      client.emit(WsEvents.ERROR, { message: 'Turn failed — please try again.' });
    });
  }

  @SubscribeMessage(WsEvents.USER_INTERRUPT)
  handleInterrupt(@ConnectedSocket() client: Socket): void {
    this.controllers.get(client.id)?.abort();
    this.controllers.delete(client.id);
    // Emit a minimal turn.end so the frontend state machine resets correctly.
    client.emit(WsEvents.TURN_END, { turnId: 'interrupted', latencyTrace: {} });
  }
}
