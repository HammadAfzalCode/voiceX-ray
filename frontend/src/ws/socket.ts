import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:3000';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    _socket.on('connect', () => {
      console.warn('[socket] connected');
    });

    _socket.on('disconnect', (reason: string) => {
      console.warn('[socket] disconnected:', reason);
    });

    _socket.on('connect_error', (err: Error) => {
      console.error('[socket] connection error:', err.message);
    });
  }

  return _socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  getSocket().disconnect();
}
