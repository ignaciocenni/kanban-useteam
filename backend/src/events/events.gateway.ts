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
   * Adjunta el `clientId` al payload si viene definido.
   *
   * Contexto:
   * - El servidor emite eventos a todos los clientes (incluyendo al origen).
   * - Para evitar duplicaciones de UI y toasts en el cliente que originó el cambio,
   *   el frontend compara el `clientId` del payload con su ID de pestaña y descarta
   *   eventos propios.
   * - Este método centraliza el agregado opcional de `clientId` para todos los eventos.
   */
  private withClientId<T extends object>(
    clientId: string | undefined,
    payload: T,
  ): T & { clientId?: string } {
    return clientId ? { ...payload, clientId } : payload;
  }

  /**
   * Emite creación de tarea a todos los clientes, incluyendo el que la generó.
   *
   * Detalle:
   * - Se usa `server.emit` (broadcast global).
   * - El `clientId` viaja en el payload para que el frontend ignore el evento
   *   si proviene de la misma pestaña que hizo la acción.
   */
  emitTaskCreated(
    clientId: string | undefined,
    payload: TaskResponseDto,
  ): void {
    this.server?.emit('task.created', this.withClientId(clientId, payload));
  }

  /**
   * Emite actualización de tarea (edición o movimiento) con `clientId` adjunto.
   * El frontend diferencia ediciones vs movimientos y filtra eventos propios.
   */
  emitTaskUpdated(
    clientId: string | undefined,
    payload: TaskResponseDto,
  ): void {
    this.server?.emit('task.updated', this.withClientId(clientId, payload));
  }

  /**
   * Emite eliminación de tarea. El `clientId` permite evitar toasts duplicados
   * en la pestaña que realizó la eliminación.
   */
  emitTaskDeleted(
    clientId: string | undefined,
    payload: TaskDeletedPayload,
  ): void {
    this.server?.emit('task.deleted', this.withClientId(clientId, payload));
  }

  /**
   * Emite cambios en tableros (creado/actualizado/eliminado).
   * El `clientId` es opcional: algunos cambios pueden originarse en backend.
   */
  emitBoardUpdated(
    clientId: string | undefined,
    payload: BoardUpdatedPayload,
  ): void {
    this.server?.emit('board.updated', this.withClientId(clientId, payload));
  }
}
