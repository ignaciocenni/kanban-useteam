import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { Board, BoardDocument } from './entities/board.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private boardModel: Model<BoardDocument>,
  ) {}

  // Crear un nuevo tablero
  async create(createBoardDto: CreateBoardDto): Promise<Board> {
    const createdBoard = new this.boardModel(createBoardDto);
    return createdBoard.save();
  }

  // Obtener todos los tableros
  async findAll(): Promise<Board[]> {
    return this.boardModel.find().exec();
  }

  // Obtener un tablero por ID
  async findOne(id: string): Promise<Board> {
    const board = await this.boardModel.findById(id).exec();

    if (!board) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }

    return board;
  }

  // Actualizar un tablero
  async update(id: string, updateBoardDto: UpdateBoardDto): Promise<Board> {
    const updatedBoard = await this.boardModel
      .findByIdAndUpdate(id, updateBoardDto, { new: true })
      .exec();

    if (!updatedBoard) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }

    return updatedBoard;
  }

  // Eliminar un tablero
  async remove(id: string): Promise<Board> {
    const deletedBoard = await this.boardModel.findByIdAndDelete(id).exec();

    if (!deletedBoard) {
      throw new NotFoundException(`Board con ID ${id} no encontrado`);
    }

    return deletedBoard;
  }
}
