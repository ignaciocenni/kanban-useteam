import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExportBacklogDto {
  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}
