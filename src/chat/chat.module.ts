import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../database/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService, EventsGateway],
  exports: [ChatService],
})
export class ChatModule {}
