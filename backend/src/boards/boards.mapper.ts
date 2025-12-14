import { Types } from 'mongoose';
import { Board, BoardDocument } from './entities/board.entity';

export type BoardResponse = ReturnType<typeof BoardsMapper.toResponse>;

export class BoardsMapper {
  static toResponse(board: Board | BoardDocument) {
    type BoardPlain = Board & {
      _id?: Types.ObjectId | string;
      id?: string;
      __v?: number;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const doc = board as BoardDocument;
    const plain: BoardPlain =
      typeof doc.toObject === 'function'
        ? (doc.toObject() as BoardPlain)
        : { ...(board as Board) };

    const { _id, id: plainId, createdAt, updatedAt, columns, ...rest } = plain;

    return {
      ...rest,
      columns: Array.isArray(columns) ? columns : [],
      id: this.ensureStringId(_id ?? plainId),
      createdAt: this.toIsoString(createdAt),
      updatedAt: this.toIsoString(updatedAt),
    };
  }

  static toResponseList(boards: Array<Board | BoardDocument>) {
    return boards.map((b) => this.toResponse(b));
  }

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
