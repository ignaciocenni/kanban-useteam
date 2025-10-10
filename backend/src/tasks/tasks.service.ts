import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument } from './entities/task.entity';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private boardsService: BoardsService,
  ) {}

  // Crear una nueva tarea
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validar que el board existe
    await this.boardsService.findOne(createTaskDto.boardId);

    // Si no se proporciona posición, calcular la última posición + 1
    if (createTaskDto.position === undefined) {
      const lastTask = await this.taskModel
        .findOne({
          boardId: createTaskDto.boardId,
          column: createTaskDto.column,
        })
        .sort({ position: -1 })
        .exec();

      createTaskDto.position = lastTask ? lastTask.position + 1 : 0;
    }

    const createdTask = new this.taskModel(createTaskDto);
    return createdTask.save();
  }

  // Obtener todas las tareas (opcionalmente filtrar por boardId)
  async findAll(boardId?: string): Promise<Task[]> {
    const filter = boardId ? { boardId } : {};
    return this.taskModel.find(filter).sort({ column: 1, position: 1 }).exec();
  }

  // Obtener tareas de un board específico agrupadas por columna
  async findByBoard(boardId: string): Promise<Task[]> {
    // Validar que el board existe
    await this.boardsService.findOne(boardId);

    return this.taskModel.find({ boardId }).sort({ position: 1 }).exec();
  }

  // Obtener una tarea por ID
  async findOne(id: string): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    return task;
  }

  // Actualizar una tarea
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Si se cambia el boardId, validar que el nuevo board existe
    if (updateTaskDto.boardId) {
      await this.boardsService.findOne(updateTaskDto.boardId);
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    return updatedTask;
  }

  // Eliminar una tarea
  async remove(id: string): Promise<Task> {
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();

    if (!deletedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    return deletedTask;
  }

  // Actualizar posición de una tarea (para drag & drop)
  async updatePosition(
    id: string,
    newColumn: string,
    newPosition: number,
  ): Promise<Task> {
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(
        id,
        { column: newColumn, position: newPosition },
        { new: true },
      )
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    return updatedTask;
  }
}
