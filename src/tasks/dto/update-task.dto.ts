import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
}
