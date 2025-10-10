import { PartialType } from '@nestjs/mapped-types';
import { CreateBoardDto } from './create-board.dto';

// PartialType hace que TODOS los campos de CreateBoardDto sean opcionales
export class UpdateBoardDto extends PartialType(CreateBoardDto) {}
