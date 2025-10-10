import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Board', required: true })
  boardId: Types.ObjectId;

  @Prop({ required: true })
  column: string;

  @Prop({ required: true, default: 0 })
  position: number;

  // timestamps: createdAt, updatedAt (automáticos)
}

export const TaskSchema = SchemaFactory.createForClass(Task);
