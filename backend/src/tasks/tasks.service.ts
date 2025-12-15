import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument } from './entities/task.entity';
import { BoardsService } from '../boards/boards.service';
import { EventsGateway } from '../events/events.gateway';
import { TasksMapper } from './tasks.mapper';
import { TaskResponseDto } from './dto/task-response.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,

    // Inyectar BoardsService para validar boardId
    @Inject(forwardRef(() => BoardsService))
    private boardsService: BoardsService,

    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Crea una nueva tarea.
   */
  async create(
    clientId: string | undefined,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    // Validar que el board existe
    await this.boardsService.findOne(createTaskDto.boardId);

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
    const response = TasksMapper.toResponse(saved);

    // Emitir evento SOLO a otros
    this.eventsGateway.emitTaskCreated(clientId, response);

    return response;
  }

  /**
   * Obtiene todas las tareas disponibles, opcionalmente filtradas por boardId.
   */
  async findAll(boardId?: string): Promise<TaskResponseDto[]> {
    const filter = boardId ? { boardId } : {};
    const tasks = await this.taskModel
      .find(filter)
      .sort({ column: 1, position: 1 })
      .exec();
    return TasksMapper.toResponseList(tasks);
  }

  /**
   * Obtiene todas las tareas asociadas a un board específico.
   */
  async findByBoard(boardId: string): Promise<TaskResponseDto[]> {
    await this.boardsService.findOne(boardId);

    const tasks = await this.taskModel
      .find({ boardId })
      .sort({ position: 1 })
      .exec();
    return TasksMapper.toResponseList(tasks);
  }

  /**
   * Obtiene una tarea por su ID.
   */
  async findOne(id: string): Promise<TaskResponseDto> {
    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    return TasksMapper.toResponse(task);
  }

  /**
   * Actualiza una tarea existente.
   */
  async update(
    clientId: string | undefined,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    if (updateTaskDto.boardId) {
      await this.boardsService.findOne(updateTaskDto.boardId);
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    const response = TasksMapper.toResponse(updatedTask);

    this.eventsGateway.emitTaskUpdated(clientId, response);

    return response;
  }

  /**
   * Elimina una tarea existente.
   */
  async remove(
    clientId: string | undefined,
    id: string,
  ): Promise<TaskResponseDto> {
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();

    if (!deletedTask) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    const response = TasksMapper.toResponse(deletedTask);
    this.eventsGateway.emitTaskDeleted(clientId, {
      id: response.id,
      boardId: response.boardId,
    });

    return response;
  }

  /**
   * Elimina todas las tareas asociadas a un board específico
   */
  async deleteByBoardId(
    clientId: string | undefined,
    boardId: string,
  ): Promise<number> {
    const tasks = await this.taskModel.find({ boardId }).exec();

    if (!tasks.length) return 0;

    // Emitir eventos por cada tarea eliminada
    for (const t of tasks) {
      this.eventsGateway.emitTaskDeleted(clientId, {
        id: this.ensureStringId(t._id),
        boardId: this.ensureStringId(boardId),
      });
    }

    const result = await this.taskModel.deleteMany({ boardId }).exec();
    return result.deletedCount ?? 0;
  }

  // Drag & drop
  /**
   * Reordena una tarea dentro de una columna o entre columnas, garantizando
   * consistencia de índices (`position`) en la columna destino.
   *
   * Estrategia:
   * - Carga la tarea a mover y obtiene `oldColumn`/`oldPosition`.
   * - Obtiene las tareas de la columna destino (sin la tarea movida) ordenadas.
   * - Normaliza `newPosition` para que esté en rango [0, length].
   * - Calcula las posiciones finales de las tareas destino aplicando hueco en `newPosition`
   *   (las tareas con índice >= `newPosition` se desplazan +1).
   * - Ejecuta `bulkWrite` para aplicar el reindexado en la base.
   * - Actualiza la tarea movida con su nueva `column` y `position`.
   * - Emite `task.updated` por cada tarea afectada y por la tarea movida,
   *   permitiendo que los clientes remotos sincronicen el orden local correctamente.
   */
  async updatePosition(
    clientId: string | undefined,
    id: string,
    newColumn: string,
    newPosition: number,
  ): Promise<TaskResponseDto> {
    const taskToMove = await this.taskModel.findById(id).exec();

    if (!taskToMove) {
      throw new NotFoundException(`Task con ID ${id} no encontrada`);
    }

    const oldColumn = taskToMove.column;
    const oldPosition = taskToMove.position;

    this.logger.log({
      msg: 'task:move:start',
      taskId: id,
      fromColumnId: oldColumn,
      toColumnId: newColumn,
      oldPosition,
      newPosition,
    });

    // Si la tarea se mueve a la misma posición, no es necesario actualizar
    if (oldColumn === newColumn && oldPosition === newPosition) {
      return TasksMapper.toResponse(taskToMove);
    }

    // Obtener tareas en la columna destino (sin la tarea movida)
    const tasksInTargetColumn = await this.taskModel
      .find({
        boardId: taskToMove.boardId,
        column: newColumn,
        _id: { $ne: id },
      })
      .sort({ position: 1 })
      .exec();

    // Normalizar newPosition para estar en rango [0, length]
    if (newPosition < 0) newPosition = 0;
    if (newPosition > tasksInTargetColumn.length) {
      newPosition = tasksInTargetColumn.length;
    }

    const updates: Array<{ id: string; position: number }> = [];

    // Calcular posiciones finales considerando hueco en newPosition
    for (let i = 0; i < tasksInTargetColumn.length; i++) {
      const task = tasksInTargetColumn[i];
      const finalPosition = i < newPosition ? i : i + 1;

      // Actualizar posición si ha cambiado
      if (task.position !== finalPosition) {
        updates.push({
          id: this.ensureStringId(task._id),
          position: finalPosition,
        });
      }
    }

    // Aplicar actualizaciones en lote
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { position: update.position } },
      },
    }));

    if (bulkOps.length > 0) {
      await this.taskModel.bulkWrite(bulkOps);
    }

    // Actualizar tarea movida con nueva columna y posición
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(
        id,
        { column: newColumn, position: newPosition },
        { new: true },
      )
      .exec();

    for (const update of updates) {
      const task = await this.taskModel.findById(update.id).exec();
      if (task) {
        this.eventsGateway.emitTaskUpdated(
          clientId,
          TasksMapper.toResponse(task),
        );
      }
    }

    // Emitir evento para tarea movida
    const response = TasksMapper.toResponse(updatedTask!);
    this.eventsGateway.emitTaskUpdated(clientId, response);

    this.logger.log({
      msg: 'task:move:done',
      taskId: id,
      fromColumnId: oldColumn,
      toColumnId: newColumn,
      oldPosition,
      newPosition: response.position,
    });

    return response;
  }

  // --- Helpers ---
  /**
   * Convierte un valor posiblemente ObjectId en cadena hexadecimal.
   * Utilizado para asegurar consistencia en IDs en operaciones de base de datos.
   */
  private ensureStringId(value: unknown): string {
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
}
