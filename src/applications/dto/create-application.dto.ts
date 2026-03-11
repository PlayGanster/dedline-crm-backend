import { IsString, IsInt, IsOptional, IsEnum, Min, IsNumber } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class CreateApplicationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  client_id: number;

  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsInt()
  @Min(1)
  performers_count?: number;

  @IsInt()
  @IsOptional()
  manager_id?: number;

  @IsInt()
  @IsOptional()
  director_id?: number;

  @IsString()
  @IsOptional()
  manager_comment?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsInt({ each: true })
  @IsOptional()
  performer_ids?: number[];

  @IsOptional()
  tasks?: CreateTaskDto[];
}

export class CreateTaskDto {
  @IsString()
  service_type: string;

  @IsString()
  payment_type: string;

  @IsString()
  @IsOptional()
  work_location?: string;

  @IsString()
  @IsOptional()
  meeting_point?: string;

  @IsString()
  @IsOptional()
  work_front?: string;

  @IsInt()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  time_from?: string;

  @IsString()
  @IsOptional()
  time_to?: string;

  @IsOptional()
  overtime?: boolean;

  @IsNumber()
  rate: number;

  @IsString()
  payment_unit: string;

  @IsNumber()
  @IsOptional()
  customer_price?: number;

  @IsInt()
  @IsOptional()
  hours?: number;
}
