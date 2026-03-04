import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['MANAGER', 'CHIEF_MANAGER', 'ACCOUNTANT', 'HEAD_OF_MANAGERS', 'DIRECTOR', 'LEGAL', 'DEV'])
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
