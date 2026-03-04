import { IsString, IsInt } from 'class-validator';

export class CreateClientNoteDto {
  @IsInt()
  clientId: number;

  @IsString()
  content: string;
}
