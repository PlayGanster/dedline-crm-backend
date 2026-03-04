import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PerformerNotesService {
  constructor(private prisma: PrismaService) {}

  async getNotesByPerformerId(performerId: number) {
    return this.prisma.performerNote.findMany({
      where: { performerId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createNote(userId: number, performerId: number, content: string) {
    return this.prisma.performerNote.create({
      data: { performerId, userId, content },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      },
    });
  }

  async updateNote(id: number, userId: number, content: string) {
    const note = await this.prisma.performerNote.findUnique({ where: { id } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('Заметка не найдена или недоступна');
    }
    return this.prisma.performerNote.update({
      where: { id },
      data: { content },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      },
    });
  }

  async deleteNote(id: number, userId: number) {
    const note = await this.prisma.performerNote.findUnique({ where: { id } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException('Заметка не найдена или недоступна');
    }
    await this.prisma.performerNote.delete({ where: { id } });
    return { message: 'Заметка удалена' };
  }
}
