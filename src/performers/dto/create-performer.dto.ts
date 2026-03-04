import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreatePerformerDto {
  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  password?: string; // Только для APP пользователей

  @IsString()
  phone: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  middle_name?: string;

  @IsEnum(SourceType)
  source: SourceType;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  professions?: string[];

  // Паспортные данные (будут зашифрованы)
  @IsString()
  @IsOptional()
  passport_series?: string;

  @IsString()
  @IsOptional()
  passport_number?: string;
}
