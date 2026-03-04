import { IsString, IsInt, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { ActStatus } from '@prisma/client';

export class CreateActDto {
  @IsInt()
  client_id: number;

  @IsInt()
  @IsOptional()
  invoice_id?: number;

  @IsInt()
  @IsOptional()
  application_id?: number;

  @IsNumber()
  amount: number;

  @IsEnum(ActStatus)
  @IsOptional()
  status?: ActStatus;

  @IsDateString()
  @IsOptional()
  act_date?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  items?: string; // JSON array

  @IsString()
  @IsOptional()
  notes?: string;
}
