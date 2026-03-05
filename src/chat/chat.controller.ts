import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChatService } from './chat.service';
import { CreateChatDto, SendMessageDto } from './dto/create-chat.dto';
import { AuthGuard } from '@nestjs/passport';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Создаём директорию для вложений
const attachmentsDir = join(process.cwd(), 'uploads', 'chat-attachments');
if (!existsSync(attachmentsDir)) {
  mkdirSync(attachmentsDir, { recursive: true });
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getUserChats(@Req() req: any) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get('with/:userId')
  async getOrCreateChat(@Req() req: any, @Param('userId', ParseIntPipe) userId: number) {
    return this.chatService.getOrCreateChat(req.user.id, userId);
  }

  @Get(':chatId/messages')
  async getChatMessages(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessagesWithAttachmentsAndReadStatus(
      chatId, 
      parseInt(limit) || 50,
      req.user.id
    );
  }

  @Post(':chatId/messages')
  async sendMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: SendMessageDto,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(chatId, req.user.id, dto.content, dto.reply_to_id);
  }

  @Post(':chatId/messages/:messageId/attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: attachmentsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `attachment-${uniqueSuffix}${ext}`;
        cb(null, filename);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  async uploadAttachment(
    @Param('messageId', ParseIntPipe) messageId: number,
    @UploadedFile() file: any,
  ) {
    return this.chatService.addAttachment(messageId, {
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      file_path: `/uploads/chat-attachments/${file.filename}`,
    });
  }

  @Post(':chatId/messages/:messageId/shared-entity')
  async shareEntity(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: { entity_type: string; entity_id: number },
  ) {
    return this.chatService.addSharedEntity(messageId, {
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
    });
  }

  @Post(':chatId/read')
  async markAsRead(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Req() req: any,
  ) {
    await this.chatService.markMessagesAsRead(chatId, req.user.id);
    return { success: true };
  }

  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Get(':chatId/unread-count')
  async getChatUnreadCount(
    @Param('chatId', ParseIntPipe) chatId: number,
    @Req() req: any,
  ) {
    const count = await this.chatService.getChatUnreadCount(chatId, req.user.id);
    return { count };
  }
}
