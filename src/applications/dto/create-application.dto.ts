import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
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
  amount?: number;

  @IsInt()
  @Min(1)
  performers_count?: number;

  @IsInt({ each: true })
  @IsOptional()
  performer_ids?: number[];
}
