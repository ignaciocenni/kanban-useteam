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
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private boardsService: BoardsService,
    private eventsGateway: EventsGateway,
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
    const saved = await createdTask.save();
    // Emitir evento en tiempo real
    this.eventsGateway.emitTaskCreated(this.normalizeTask(saved));
    return saved;
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

    // Emitir evento en tiempo real
    this.eventsGateway.emitTaskUpdated(this.normalizeTask(updatedTask));
    return updatedTask;
  }

  // Eliminar una tarea
  async remove(id: string): Promise<Task> {
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();

    if (!deletedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    // Emitir evento en tiempo real
    this.eventsGateway.emitTaskDeleted({
      id: this.ensureStringId(deletedTask.id ?? (deletedTask as any)._id),
      boardId: this.ensureStringId(
        (deletedTask as any).boardId ?? (deletedTask as any).board?.id,
      ),
    });
    return deletedTask;
  }

  // Actualizar posición de una tarea (para drag & drop)
  async updatePosition(
    id: string,
    newColumn: string,
    newPosition: number,
  ): Promise<Task> {
    const taskToMove = await this.taskModel.findById(id).exec();
    
    if (!taskToMove) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    const oldColumn = taskToMove.column;
    const oldPosition = taskToMove.position;

    // Si la tarea se mueve dentro de la misma columna y a la misma posición, no hacer nada
    if (oldColumn === newColumn && oldPosition === newPosition) {
      return taskToMove;
    }

    // Obtener todas las tareas de la columna de destino (excluyendo la que se mueve)
    const tasksInTargetColumn = await this.taskModel
      .find({ 
        boardId: taskToMove.boardId, 
        column: newColumn,
        _id: { $ne: id }
      })
      .sort({ position: 1 })
      .exec();

    // Validar que newPosition esté en rango
    if (newPosition < 0) {
      newPosition = 0;
    }
    if (newPosition > tasksInTargetColumn.length) {
      newPosition = tasksInTargetColumn.length;
    }

    // Construir el nuevo orden: insertar la tarea movida en newPosition
    const updates: Array<{ id: string; position: number }> = [];
    
    // Asignar nuevas posiciones a todas las tareas
    for (let i = 0; i < tasksInTargetColumn.length; i++) {
      const task = tasksInTargetColumn[i];
      let finalPosition: number;
      
      if (i < newPosition) {
        // Tareas antes de la posición de inserción mantienen su índice
        finalPosition = i;
      } else {
        // Tareas después de la posición de inserción se desplazan +1
        finalPosition = i + 1;
      }
      
      if (task.position !== finalPosition) {
        updates.push({ id: (task as any)._id.toString(), position: finalPosition });
      }
    }

    // Actualizar todas las posiciones en batch
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { position: update.position } }
      }
    }));

    if (bulkOps.length > 0) {
      await this.taskModel.bulkWrite(bulkOps);
    }

    // Actualizar la tarea movida
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(
        id,
        { column: newColumn, position: newPosition },
        { new: true },
      )
      .exec();

    // Emitir eventos para todas las tareas actualizadas
    for (const update of updates) {
      const task = await this.taskModel.findById(update.id).exec();
      if (task) {
        this.eventsGateway.emitTaskUpdated(this.normalizeTask(task));
      }
    }

    // Emitir evento para la tarea movida
    this.eventsGateway.emitTaskUpdated(this.normalizeTask(updatedTask!));
    
    return updatedTask!;
  }

  private ensureStringId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof (value as any).toString === 'function') {
      return (value as any).toString();
    }

    return String(value);
  }

  private toIsoString(value: unknown): string {
    if (!value) {
      return new Date().toISOString();
    }

    const date = value instanceof Date ? value : new Date(value as string);

    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  private normalizeTask(task: Task | TaskDocument) {
    const doc = task as any;
    const plain =
      typeof doc.toObject === 'function' ? doc.toObject() : { ...task };

    const {
      _id,
      __v,
      boardId: rawBoardId,
      createdAt,
      updatedAt,
      ...rest
    } = plain;

    return {
      ...rest,
      id: this.ensureStringId(_id ?? plain.id),
      boardId: this.ensureStringId(rawBoardId),
      createdAt: this.toIsoString(createdAt),
      updatedAt: this.toIsoString(updatedAt),
    };
  }
}
