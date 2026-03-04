import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async getAllClients() {
    return this.prisma.client.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getClientById(id: number) {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

  async createClient(userId: number, createClientDto: CreateClientDto) {
    return this.prisma.client.create({
      data: createClientDto,
    });
  }

  async updateClient(id: number, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Клиент с ID ${id} не найден`);
    }

    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async deleteClient(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Клиент с ID ${id} не найден`);
    }

    await this.prisma.client.delete({
      where: { id },
    });

    return { message: 'Клиент успешно удалён' };
  }
}
