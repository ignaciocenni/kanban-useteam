import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(200, { message: 'El título no puede superar 200 caracteres' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, {
    message: 'La descripción no puede superar 1000 caracteres',
  })
  description?: string;

  @IsMongoId({ message: 'ID de board inválido' })
  @IsNotEmpty({ message: 'El boardId es obligatorio' })
  boardId: string;

  @IsString()
  @IsNotEmpty({ message: 'La columna es obligatoria' })
  column: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'La posición no puede ser negativa' })
  position?: number;
}
