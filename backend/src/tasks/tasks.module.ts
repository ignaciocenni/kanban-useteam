import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task, TaskSchema } from './entities/task.entity';
import { BoardsModule } from '../boards/boards.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    BoardsModule, // Importamos BoardsModule para validar que el board existe
    EventsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
