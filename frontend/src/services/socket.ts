import { io, Socket } from 'socket.io-client';
import { getClientId } from './clientId';
import type { TaskContract } from '../contracts/task.contract';
import type { BoardContract } from '../contracts/board.contract';

// Generamos un ID único por pestaña.
// Se mantiene durante toda la sesión del navegador.
export const clientId = getClientId();

// --------------------
// Tipos de eventos usando contratos
// --------------------
export type TaskCreatedEvent = TaskContract & { clientId?: string };
export type TaskUpdatedEvent = Partial<TaskContract> & {
  id: string;
  boardId: string;
  updatedAt: string;
  clientId?: string;
};
export type TaskDeletedEvent = {
  id: string;
  boardId: string;
  clientId?: string;
};

export type BoardUpdatedEvent =
  | ({ type: 'created' | 'updated'; board: BoardContract } & {
      clientId?: string;
    })
  | ({ type: 'deleted'; board: BoardContract; boardId: string } & {
      clientId?: string;
    });

// Mapeo de eventos
interface SocketEvents {
  'task.created': (task: TaskCreatedEvent) => void;
  'task.updated': (task: TaskUpdatedEvent) => void;
  'task.deleted': (task: TaskDeletedEvent) => void;
  'board.updated': (payload: BoardUpdatedEvent) => void;
}

let socket: Socket<SocketEvents> | null = null;

// ----------------------
// Singleton del socket
// ----------------------
export function getSocket(): Socket<SocketEvents> {
  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

    socket = io(wsUrl, {
      transports: ['websocket'],
      withCredentials: true,

      // Enviamos el clientId al servidor automáticamente
      auth: { clientId },
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket?.id, 'clientId:', clientId);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error);
    });
  }

  return socket;
}

// ----------------------
// Desconexión manual
// ----------------------
export function disconnectSocket() {
  if (socket) {
    console.log('🔌 Disconnecting WebSocket');
    socket.disconnect();
    socket = null;
  }
}
