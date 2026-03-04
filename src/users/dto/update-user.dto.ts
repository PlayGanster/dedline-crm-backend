import { IsEmail, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(['MANAGER', 'CHIEF_MANAGER', 'ACCOUNTANT', 'HEAD_OF_MANAGERS', 'DIRECTOR', 'LEGAL', 'DEV'])
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
