import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientNoteDto } from './dto/create-client-note.dto';

@Injectable()
export class ClientNotesService {
  constructor(private prisma: PrismaService) {}

  async getNotesByClientId(clientId: number) {
    return this.prisma.clientNote.findMany({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createNote(userId: number, createNoteDto: CreateClientNoteDto) {
    return this.prisma.clientNote.create({
      data: {
        clientId: createNoteDto.clientId,
        userId,
        content: createNoteDto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async updateNote(id: number, userId: number, content: string) {
    const note = await this.prisma.clientNote.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException('Заметка не найдена');
    }

    if (note.userId !== userId) {
      throw new NotFoundException('Можно редактировать только свои заметки');
    }

    return this.prisma.clientNote.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async deleteNote(id: number, userId: number) {
    const note = await this.prisma.clientNote.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException('Заметка не найдена');
    }

    if (note.userId !== userId) {
      throw new NotFoundException('Можно удалять только свои заметки');
    }

    await this.prisma.clientNote.delete({
      where: { id },
    });

    return { message: 'Заметка удалена' };
  }
}
