import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // POST /tasks - Crear tarea
  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  // GET /tasks?boardId=xxx - Listar tareas (opcionalmente filtrar por boardId)
  @Get()
  findAll(@Query('boardId') boardId?: string) {
    return this.tasksService.findAll(boardId);
  }

  // GET /tasks/board/:boardId - Obtener todas las tareas de un board específico
  @Get('board/:boardId')
  findByBoard(@Param('boardId') boardId: string) {
    return this.tasksService.findByBoard(boardId);
  }

  // GET /tasks/:id - Obtener una tarea por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id); // ✅ Sin el +
  }

  // PATCH /tasks/:id - Actualizar tarea
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto); // ✅ Sin el +
  }

  // DELETE /tasks/:id - Eliminar tarea
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id); // ✅ Sin el +
  }

  // PATCH /tasks/:id/position - Actualizar posición (drag & drop)
  @Patch(':id/position')
  updatePosition(
    @Param('id') id: string,
    @Body('column') column: string,
    @Body('position') position: number,
  ) {
    return this.tasksService.updatePosition(id, column, position);
  }
}
