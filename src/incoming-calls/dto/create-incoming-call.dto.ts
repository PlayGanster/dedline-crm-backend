import { IsString, IsInt, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';

export class CreateIncomingCallDto {
  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  caller_name?: string;

  @IsInt()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  recording_url?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  external_call_id?: string; // ID звонка из внешней телефонии (Билайн и т.д.)

  @IsEnum(['INCOMING', 'RINGING', 'ANSWERED', 'MISSED'])
  @IsOptional()
  status?: 'INCOMING' | 'RINGING' | 'ANSWERED' | 'MISSED';

  @IsDateString()
  @IsOptional()
  created_at?: Date; // Дата звонка (для импорта из внешних систем)
}

export class ConvertToClientDto {
  @IsString()
  @IsOptional()
  fio?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY';

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsString()
  @IsOptional()
  inn?: string;
}

export class ConvertToApplicationDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  @IsOptional()
  amount?: number;

  @IsInt()
  @IsOptional()
  performers_count?: number;
}
