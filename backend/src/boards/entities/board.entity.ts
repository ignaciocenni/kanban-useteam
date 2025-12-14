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

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
      },
    ],
    default: [
      { id: '0-to-do', title: 'To Do' },
      { id: '1-in-progress', title: 'In Progress' },
      { id: '2-done', title: 'Done' },
    ],
  })
  columns: { id: string; title: string }[];

  // createdAt y updatedAt se agregan automáticamente por { timestamps: true }
}

// Factory para crear el schema de Mongoose
export const BoardSchema = SchemaFactory.createForClass(Board);
