import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // POST /boards - Crear tablero
  @Post()
  create(@Body() createBoardDto: CreateBoardDto) {
    return this.boardsService.create(createBoardDto);
  }

  // GET /boards - Listar todos los tableros
  @Get()
  findAll() {
    return this.boardsService.findAll();
  }

  // GET /boards/:id - Obtener un tablero por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id); // ✅ Sin el +
  }

  // PATCH /boards/:id - Actualizar tablero
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto) {
    return this.boardsService.update(id, updateBoardDto); // ✅ Sin el +
  }

  // DELETE /boards/:id - Eliminar tablero
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boardsService.remove(id); // ✅ Sin el +
  }
}
