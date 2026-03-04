import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class ErrorReportDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  page: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  userAgent: string;

  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @IsOptional()
  screenshot?: string; // base64 string

  @IsOptional()
  @IsObject()
  user?: {
    id: number;
    email: string;
    name: string;
  };
}
