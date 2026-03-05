import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateIncomingCallDto, ConvertToClientDto, ConvertToApplicationDto } from './dto/create-incoming-call.dto';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class IncomingCallsService {
  private readonly logger = new Logger(IncomingCallsService.name);
  
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

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
    return this.createIncomingCallWithDate(createIncomingCallDto, crmUserId);
  }

  async createIncomingCallWithDate(createIncomingCallDto: CreateIncomingCallDto, crmUserId: number) {
    // Проверяем, существует ли уже звонок с таким external_call_id
    if (createIncomingCallDto.external_call_id) {
      const existingCall = await this.prisma.incomingCall.findUnique({
        where: { external_call_id: createIncomingCallDto.external_call_id },
      });

      if (existingCall) {
        // Обновляем существующий звонок
        return this.prisma.incomingCall.update({
          where: { id: existingCall.id },
          data: {
            duration: createIncomingCallDto.duration,
            status: createIncomingCallDto.status as any,
            recording_url: createIncomingCallDto.recording_url,
            updated_at: new Date(),
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
      }
    }

    // Ищем клиента по телефону
    const existingClient = await this.prisma.client.findFirst({
      where: { phone: createIncomingCallDto.phone },
    });

    const callData: any = {
      ...createIncomingCallDto,
      crm_user_id: crmUserId,
      client_id: existingClient?.id || null,
      status: createIncomingCallDto.status || (existingClient ? 'ANSWERED' : 'INCOMING'),
    };

    // Если передана дата звонка, используем её
    if (createIncomingCallDto.created_at) {
      callData.created_at = createIncomingCallDto.created_at;
    }

    const call = await this.prisma.incomingCall.create({
      data: callData,
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

    // Отправляем WebSocket событие о новом звонке
    this.logger.log(`📡 Broadcasting new-incoming-call event: ${JSON.stringify(call)}`);
    this.eventsGateway.broadcast('new-incoming-call', call);
    this.logger.log(`✅ Broadcast sent successfully`);

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
