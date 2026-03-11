import { IsString, IsOptional, IsBoolean, IsEnum, IsInt } from 'class-validator';
import { RequisiteType } from '@prisma/client';

export class CreatePerformerRequisitesDto {
  @IsInt()
  performerId: number;

  @IsEnum(RequisiteType)
  type: RequisiteType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  // Для CARD
  @IsString()
  @IsOptional()
  card_number?: string;

  @IsString()
  @IsOptional()
  card_holder?: string;

  @IsString()
  @IsOptional()
  bank_name?: string;

  // Для SBP
  @IsString()
  @IsOptional()
  sbp_phone?: string;

  // Для REQUISITES
  @IsString()
  @IsOptional()
  inn?: string;

  @IsString()
  @IsOptional()
  ogrnip?: string;

  @IsString()
  @IsOptional()
  account_number?: string;

  @IsString()
  @IsOptional()
  bik?: string;

  @IsString()
  @IsOptional()
  bank_name_full?: string;

  @IsString()
  @IsOptional()
  correspondent_account?: string;
}
