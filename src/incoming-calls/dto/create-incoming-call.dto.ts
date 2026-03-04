import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

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
}

export class ConvertToClientDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

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
