import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';
import { ClientNotesService } from '../client-notes/client-notes.service';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
  constructor(
    private clientsService: ClientsService,
    private logsService: LogsService,
    private clientNotesService: ClientNotesService,
  ) {}

  @Get()
  async getAllClients() {
    return this.clientsService.getAllClients();
  }

  @Get(':id')
  async getClientById(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getClientById(id);
  }

  @Post()
  async createClient(@Body() createClientDto: CreateClientDto, @Req() req: any) {
    const userId = req.user.id;
    const client = await this.clientsService.createClient(userId, createClientDto);

    // Создаём первую заметку от создателя клиента
    if (createClientDto.notes) {
      await this.clientNotesService.createNote(userId, {
        clientId: client.id,
        content: createClientDto.notes,
      });
    }

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'CLIENT_CREATED',
      entity: 'Client',
      entityId: client.id,
      description: `Создан новый клиент: ${client.type === 'INDIVIDUAL' ? client.fio : client.company_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: client.type,
        email: client.email,
        phone: client.phone,
      },
    });

    return client;
  }

  @Put(':id')
  async updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
    @Req() req: any
  ) {
    const client = await this.clientsService.updateClient(id, updateClientDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'CLIENT_UPDATED',
      entity: 'Client',
      entityId: id,
      description: `Обновлены данные клиента: ${client.type === 'INDIVIDUAL' ? client.fio : client.company_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: client.type,
        email: client.email,
        phone: client.phone,
      },
    });

    return client;
  }

  @Delete(':id')
  async deleteClient(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const client = await this.clientsService.getClientById(id);

    await this.clientsService.deleteClient(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'CLIENT_DELETED',
      entity: 'Client',
      entityId: id,
      description: `Удалён клиент: ${client.type === 'INDIVIDUAL' ? client.fio : client.company_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: client.type,
        email: client.email,
      },
    });

    return { message: 'Клиент успешно удалён' };
  }
}
