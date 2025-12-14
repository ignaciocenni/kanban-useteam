import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // POST /tasks - Crear tarea
  @Post()
  create(
    @Headers('x-client-id') clientId: string | undefined,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(clientId, createTaskDto);
  }

  // GET /tasks?boardId=...
  @Get()
  findAll(@Query('boardId') boardId?: string) {
    return this.tasksService.findAll(boardId);
  }

  // GET /tasks/board/:boardId
  @Get('board/:boardId')
  findByBoard(@Param('boardId') boardId: string) {
    return this.tasksService.findByBoard(boardId);
  }

  // GET /tasks/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // PATCH /tasks/:id
  @Patch(':id')
  update(
    @Headers('x-client-id') clientId: string | undefined,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(clientId, id, updateTaskDto);
  }

  // DELETE /tasks/:id
  @Delete(':id')
  remove(
    @Headers('x-client-id') clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.tasksService.remove(clientId, id);
  }

  // PATCH /tasks/:id/position
  @Patch(':id/position')
  updatePosition(
    @Headers('x-client-id') clientId: string | undefined,
    @Param('id') id: string,
    @Body() body: { column: string; position: number },
  ) {
    return this.tasksService.updatePosition(
      clientId,
      id,
      body.column,
      body.position,
    );
  }
}
