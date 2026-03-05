import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  user2_id: number;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  reply_to_id?: number;
}
