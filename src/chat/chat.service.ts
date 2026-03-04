import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async getUserChats(userId: number) {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            role: true,
          },
        },
        user2: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            role: true,
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return chats.map(chat => {
      const otherUser = chat.user1_id === userId ? chat.user2 : chat.user1;
      const lastMessage = chat.messages[0];
      return {
        id: chat.id,
        user: otherUser,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sender_id: lastMessage.sender_id,
          created_at: lastMessage.created_at,
        } : null,
        updated_at: chat.updated_at,
      };
    });
  }

  async getOrCreateChat(user1_id: number, user2_id: number) {
    // Проверяем существующий чат
    let chat = await this.prisma.chat.findFirst({
      where: {
        OR: [
          { user1_id, user2_id },
          { user1_id: user2_id, user2_id: user1_id },
        ],
      },
      include: {
        user1: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        user2: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { user1_id, user2_id },
        include: {
          user1: { select: { id: true, first_name: true, last_name: true, avatar: true } },
          user2: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        },
      });
    }

    return chat;
  }

  async getChatMessages(chatId: number, limit: number = 50) {
    return this.getMessagesWithAttachments(chatId, limit);
  }

  async sendMessage(chatId: number, senderId: number, content: string) {
    const message = await this.prisma.message.create({
      data: {
        chat_id: chatId,
        sender_id: senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        attachments: true,
        shared_entities: true,
      },
    });

    // Обновляем время чата
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updated_at: new Date() },
    });

    // Отправляем сообщение через WebSocket ТОЛЬКО получателю (не отправителю)
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (chat) {
      // Определяем получателя (второй пользователь)
      const recipientId = chat.user1_id === senderId ? chat.user2_id : chat.user1_id;

      // Отправляем только получателю
      this.eventsGateway.sendToUser(recipientId, 'new-message', {
        chatId,
        message,
      });
    }

    return message;
  }

  async markMessagesAsRead(chatId: number, userId: number) {
    await this.prisma.message.updateMany({
      where: {
        chat_id: chatId,
        sender_id: { not: userId },
        is_read: false,
      },
      data: { is_read: true },
    });
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.message.count({
      where: {
        chat: {
          OR: [
            { user1_id: userId },
            { user2_id: userId },
          ],
        },
        sender_id: { not: userId },
        is_read: false,
      },
    });
    return { count };
  }

  async getChatUnreadCount(chatId: number, userId: number) {
    const count = await this.prisma.message.count({
      where: {
        chat_id: chatId,
        sender_id: { not: userId },
        is_read: false,
      },
    });
    return count;
  }

  async addAttachment(messageId: number, data: {
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    file_path: string;
  }) {
    const attachment = await this.prisma.messageAttachment.create({
      data: {
        message_id: messageId,
        ...data,
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
              },
            },
            attachments: true,
            shared_entities: true,
          },
        },
      },
    });

    // Отправляем обновление через WebSocket
    const chatId = attachment.message.chat_id;
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (chat) {
      // Отправляем обоим пользователям обновленное сообщение с вложением
      this.eventsGateway.sendToUser(chat.user1_id, 'new-message', {
        chatId,
        message: attachment.message,
        isUpdate: true,
      });
      
      if (chat.user2_id !== chat.user1_id) {
        this.eventsGateway.sendToUser(chat.user2_id, 'new-message', {
          chatId,
          message: attachment.message,
          isUpdate: true,
        });
      }
    }

    return attachment;
  }

  async addSharedEntity(messageId: number, data: {
    entity_type: string;
    entity_id: number;
  }) {
    return this.prisma.sharedEntity.create({
      data: {
        message: { connect: { id: messageId } },
        entity_type: data.entity_type as any,
        entity_id: data.entity_id,
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async getMessagesWithAttachments(chatId: number, limit: number = 50) {
    return this.prisma.message.findMany({
      where: { chat_id: chatId },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        attachments: true,
        shared_entities: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
