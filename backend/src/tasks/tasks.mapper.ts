import { Types } from 'mongoose';
import { Task, TaskDocument } from './entities/task.entity';
import { TaskResponseDto } from './dto/task-response.dto'; // ✅ NUEVO IMPORT

/**
 * Mapper de Task (entidad Mongoose) → DTO de respuesta pública
 */
export class TasksMapper {
  static toResponse(task: Task | TaskDocument): TaskResponseDto {
    /**
     * Tipo intermedio plano para normalizar el input
     * (no es el DTO público)
     */
    type TaskPlain = Task & {
      _id?: Types.ObjectId | string;
      id?: string;
      __v?: number;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const doc = task as TaskDocument;

    const plain: TaskPlain =
      typeof doc.toObject === 'function'
        ? (doc.toObject() as TaskPlain)
        : { ...(task as Task) };

    const { _id, id: plainId, boardId, createdAt, updatedAt, ...rest } = plain;

    return {
      ...rest,
      id: this.ensureStringId(_id ?? plainId),
      boardId: this.ensureStringId(boardId),
      createdAt: this.toIsoString(createdAt),
      updatedAt: this.toIsoString(updatedAt),
    };
  }

  static toResponseList(tasks: Array<Task | TaskDocument>): TaskResponseDto[] {
    return tasks.map((t) => this.toResponse(t));
  }

  // --- helpers privados ---

  private static ensureStringId(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Types.ObjectId) return value.toHexString();
    if (
      value &&
      typeof value === 'object' &&
      'toString' in value &&
      typeof (value as { toString: () => string }).toString === 'function'
    ) {
      return (value as { toString: () => string }).toString();
    }
    return '';
  }

  private static toIsoString(value: unknown): string {
    if (!value) return new Date().toISOString();
    const date = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }
}
