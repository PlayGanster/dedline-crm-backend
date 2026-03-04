import { IsString, IsInt } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  user2_id: number;
}

export class SendMessageDto {
  @IsString()
  content: string;
}
