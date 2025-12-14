import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { Board, BoardDocument } from './entities/board.entity';
import { EventsGateway } from '../events/events.gateway';
import { TasksService } from '../tasks/tasks.service';
import { BoardsMapper } from './boards.mapper';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private boardModel: Model<BoardDocument>,
    private eventsGateway: EventsGateway,
    private tasksService: TasksService,
  ) {}

  // Crear un nuevo tablero
  async create(
    createBoardDto: CreateBoardDto,
  ): Promise<ReturnType<typeof BoardsMapper.toResponse>> {
    const createdBoard = new this.boardModel(createBoardDto);
    const saved = await createdBoard.save();
    const response = BoardsMapper.toResponse(saved);
    this.eventsGateway.emitBoardUpdated(undefined, {
      type: 'created',
      board: response,
    });

    return response;
  }

  // Obtener todos los tableros
  async findAll(): Promise<ReturnType<typeof BoardsMapper.toResponse>[]> {
    const boards = await this.boardModel.find().exec();
    return BoardsMapper.toResponseList(boards);
  }

  // Obtener un tablero por ID
  async findOne(
    id: string,
  ): Promise<ReturnType<typeof BoardsMapper.toResponse>> {
    const board = await this.boardModel.findById(id).exec();

    if (!board) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }

    return BoardsMapper.toResponse(board);
  }

  // Actualizar un tablero
  async update(
    id: string,
    updateBoardDto: UpdateBoardDto,
  ): Promise<ReturnType<typeof BoardsMapper.toResponse>> {
    const updatedBoard = await this.boardModel
      .findByIdAndUpdate(id, updateBoardDto, { new: true })
      .exec();

    if (!updatedBoard) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }
    const response = BoardsMapper.toResponse(updatedBoard);
    this.eventsGateway.emitBoardUpdated(undefined, {
      type: 'updated',
      board: response,
    });

    return response;
  }

  // Eliminar un tablero y todas sus tareas asociadas
  async remove(
    id: string,
  ): Promise<ReturnType<typeof BoardsMapper.toResponse>> {
    const boardDoc = await this.boardModel.findById(id).exec();

    if (!boardDoc) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }

    // 2) Eliminar todas las tareas asociadas
    const clientId = undefined;
    await this.tasksService.deleteByBoardId(clientId, id);

    // 3) Eliminar el tablero
    await this.boardModel.findByIdAndDelete(id).exec();

    const response = BoardsMapper.toResponse(boardDoc);
    // 4) Emitir evento WebSocket
    this.eventsGateway.emitBoardUpdated(undefined, {
      type: 'deleted',
      boardId: id,
      board: response,
    });

    // 5) Volver el board original (no null, evitar errores de TS)
    return response;
  }
}
