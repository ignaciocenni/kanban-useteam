import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede superar 100 caracteres' })
  title: string;

  @IsString()
  @IsOptional() // Campo opcional
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  description?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true }) // Valida que cada elemento del array sea string
  columns?: string[];
}
