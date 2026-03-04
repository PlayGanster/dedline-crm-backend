import { IsString, IsInt, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  client_id?: number;

  @IsInt()
  @IsOptional()
  performer_id?: number;

  @IsInt()
  @IsOptional()
  application_id?: number;

  @IsDateString()
  @IsOptional()
  transaction_date?: string;
}
