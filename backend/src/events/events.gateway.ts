import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TaskResponseDto } from '../tasks/dto/task-response.dto';
import { BoardResponse } from '../boards/boards.mapper';

/**
 * Payload para eventos de tareas eliminadas
 */
type TaskDeletedPayload = {
  id: string;
  boardId: string;
};

/**
 * Payload para eventos de tableros actualizados
 */
type BoardUpdatedPayload =
  | { type: 'created'; board: BoardResponse }
  | { type: 'updated'; board: BoardResponse }
  | { type: 'deleted'; board: BoardResponse; boardId: string };

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway {
  @WebSocketServer()
  public server: Server;

  /**
   * Adjunta el clientId al payload si viene definido
   */
  private withClientId<T extends object>(
    clientId: string | undefined,
    payload: T,
  ): T & { clientId?: string } {
    return clientId ? { ...payload, clientId } : payload;
  }

  /**
   * Eventos de tareas
   */
  emitTaskCreated(
    clientId: string | undefined,
    payload: TaskResponseDto,
  ): void {
    this.server?.emit('task.created', this.withClientId(clientId, payload));
  }

  emitTaskUpdated(
    clientId: string | undefined,
    payload: TaskResponseDto,
  ): void {
    this.server?.emit('task.updated', this.withClientId(clientId, payload));
  }

  emitTaskDeleted(
    clientId: string | undefined,
    payload: TaskDeletedPayload,
  ): void {
    this.server?.emit('task.deleted', this.withClientId(clientId, payload));
  }

  /**
   * Eventos de tableros
   */
  emitBoardUpdated(
    clientId: string | undefined,
    payload: BoardUpdatedPayload,
  ): void {
    this.server?.emit('board.updated', this.withClientId(clientId, payload));
  }
}
