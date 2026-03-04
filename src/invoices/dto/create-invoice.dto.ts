import { IsString, IsInt, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
  @IsInt()
  client_id: number;

  @IsNumber()
  amount: number;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsInt()
  @IsOptional()
  application_id?: number;

  @IsDateString()
  @IsOptional()
  due_date?: string;

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
