import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateIncomingCallDto, ConvertToClientDto, ConvertToApplicationDto } from './dto/create-incoming-call.dto';

@Injectable()
export class IncomingCallsService {
  constructor(private prisma: PrismaService) {}

  async getAllIncomingCalls() {
    return this.prisma.incomingCall.findMany({
      include: {
        crm_user: {
          select: { id: true, first_name: true, last_name: true, email: true, avatar: true },
        },
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        application: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getIncomingCallById(id: number) {
    const call = await this.prisma.incomingCall.findUnique({
      where: { id },
      include: {
        crm_user: {
          select: { id: true, first_name: true, last_name: true, email: true, avatar: true },
        },
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        application: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException(`Входящий звонок с ID ${id} не найден`);
    }

    return call;
  }

  async createIncomingCall(createIncomingCallDto: CreateIncomingCallDto, crmUserId: number) {
    // Ищем клиента по телефону
    const existingClient = await this.prisma.client.findFirst({
      where: { phone: createIncomingCallDto.phone },
    });

    const call = await this.prisma.incomingCall.create({
      data: {
        ...createIncomingCallDto,
        crm_user_id: crmUserId,
        client_id: existingClient?.id || null,
        status: existingClient ? 'ANSWERED' : 'INCOMING',
      },
      include: {
        crm_user: {
          select: { id: true, first_name: true, last_name: true, email: true, avatar: true },
        },
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
          },
        },
      },
    });

    return call;
  }

  async convertToClient(id: number, dto: ConvertToClientDto) {
    const call = await this.getIncomingCallById(id);

    if (call.client_id) {
      throw new NotFoundException('Звонок уже привязан к клиенту');
    }

    // Создаём клиента
    const client = await this.prisma.client.create({
      data: {
        type: dto.type,
        phone: call.phone,
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        company_name: dto.company_name,
        inn: dto.inn,
      },
    });

    // Привязываем клиента к звонку и обновляем статус
    await this.prisma.incomingCall.update({
      where: { id },
      data: { client_id: client.id, status: 'ANSWERED' },
    });

    return { client, message: 'Клиент создан и привязан к звонку' };
  }

  async convertToApplication(id: number, dto: ConvertToApplicationDto, crmUserId: number) {
    const call = await this.getIncomingCallById(id);

    if (!call.client_id) {
      throw new NotFoundException('Сначала необходимо создать или привязать клиента');
    }

    // Создаём заявку
    const application = await this.prisma.application.create({
      data: {
        title: dto.title,
        description: dto.description,
        client_id: call.client_id,
        amount: dto.amount ? String(dto.amount) : null,
        performers_count: dto.performers_count || 1,
      },
    });

    // Привязываем заявку к звонку и обновляем статус
    await this.prisma.incomingCall.update({
      where: { id },
      data: { application_id: application.id, status: 'ANSWERED' },
    });

    return { application, message: 'Заявка создана и привязана к звонку' };
  }

  async updateNotes(id: number, notes: string) {
    return this.prisma.incomingCall.update({
      where: { id },
      data: { notes },
    });
  }
}
