import { IsString, IsInt, IsOptional } from 'class-validator';

export class UploadClientDocumentDto {
  @IsInt()
  clientId: number;

  @IsString()
  @IsOptional()
  description?: string;
}
