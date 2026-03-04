import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { PerformersService } from './performers.service';
import { CreatePerformerDto } from './dto/create-performer.dto';
import { UpdatePerformerDto } from './dto/update-performer.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('performers')
@UseGuards(AuthGuard('jwt'))
export class PerformersController {
  constructor(
    private performersService: PerformersService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllPerformers() {
    return this.performersService.getAllPerformers();
  }

  @Get(':id')
  async getPerformerById(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.getPerformerById(id);
  }

  @Get(':id/passport')
  async getPerformerPassportData(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.getPerformerPassportData(id);
  }

  @Post()
  async createPerformer(@Body() createPerformerDto: CreatePerformerDto, @Req() req: any) {
    const performer = await this.performersService.createPerformer(createPerformerDto, req.user.id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_CREATED',
      entity: 'Performer',
      entityId: performer.id,
      description: `Создан новый исполнитель: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
        source: performer.source,
      },
    });

    return performer;
  }

  @Put(':id')
  async updatePerformer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePerformerDto: UpdatePerformerDto,
    @Req() req: any,
  ) {
    const performer = await this.performersService.updatePerformer(id, updatePerformerDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_UPDATED',
      entity: 'Performer',
      entityId: id,
      description: `Обновлены данные исполнителя: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
      },
    });

    return performer;
  }

  @Delete(':id')
  async deletePerformer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const performer = await this.performersService.getPerformerById(id);

    await this.performersService.deletePerformer(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_DELETED',
      entity: 'Performer',
      entityId: id,
      description: `Удалён исполнитель: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
      },
    });

    return { message: 'Исполнитель успешно удалён' };
  }

  @Post(':id/verify')
  async verifyPerformer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.performersService.updatePerformer(id, { is_verified: true } as any);
  }

  @Post(':id/unverify')
  async unverifyPerformer(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.updatePerformer(id, { is_verified: false } as any);
  }
}
