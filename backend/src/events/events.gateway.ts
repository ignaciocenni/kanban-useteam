import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway {
  @WebSocketServer()
  public server: Server;

  emitTaskCreated(payload: any) {
    this.server?.emit('task.created', payload);
  }

  emitTaskUpdated(payload: any) {
    this.server?.emit('task.updated', payload);
  }

  emitTaskDeleted(payload: any) {
    this.server?.emit('task.deleted', payload);
  }

  emitBoardUpdated(payload: any) {
    this.server?.emit('board.updated', payload);
  }
}
