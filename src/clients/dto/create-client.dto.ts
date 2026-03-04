import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ClientType } from '@prisma/client';

export class CreateClientDto {
  @IsEnum(ClientType)
  type: ClientType;

  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Для физ. лица
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  middle_name?: string;

  @IsString()
  @IsOptional()
  passport_series?: string;

  @IsString()
  @IsOptional()
  passport_number?: string;

  // Для юр. лица
  @IsString()
  @IsOptional()
  company_name?: string;

  @IsString()
  @IsOptional()
  inn?: string;

  @IsString()
  @IsOptional()
  kpp?: string;

  @IsString()
  @IsOptional()
  ogrn?: string;

  @IsString()
  @IsOptional()
  legal_address?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
