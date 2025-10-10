import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Documento de MongoDB = Entidad + funcionalidades de Mongoose
export type BoardDocument = Board & Document;

@Schema({ timestamps: true }) // timestamps: crea createdAt y updatedAt automáticamente
export class Board {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: ['To Do', 'In Progress', 'Done'] })
  columns: string[]; // Array de nombres de columnas

  // createdAt y updatedAt se agregan automáticamente por { timestamps: true }
}

// Factory para crear el schema de Mongoose
export const BoardSchema = SchemaFactory.createForClass(Board);
