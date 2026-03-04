import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  new_password: string;
}

export class RequestResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
