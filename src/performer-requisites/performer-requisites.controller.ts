import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req, Query } from '@nestjs/common';
import { PerformerRequisitesService } from './performer-requisites.service';
import { CreatePerformerRequisitesDto } from './dto/create-performer-requisites.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';
import { RequisiteType } from '@prisma/client';

@Controller('performer-requisites')
@UseGuards(AuthGuard('jwt'))
export class PerformerRequisitesController {
  constructor(
    private requisitesService: PerformerRequisitesService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllRequisites(@Query('performerId') performerId?: string) {
    if (performerId) {
      return this.requisitesService.getAllRequisites(parseInt(performerId));
    }
    return this.requisitesService.getAllRequisites();
  }

  @Get(':id')
  async getRequisiteById(@Param('id', ParseIntPipe) id: number) {
    return this.requisitesService.getRequisiteById(id);
  }

  @Post()
  async createRequisites(@Body() createDto: CreatePerformerRequisitesDto, @Req() req: any) {
    const requisite = await this.requisitesService.createRequisites(createDto, req.user.id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_REQUISITES_CREATED',
      entity: 'PerformerRequisites',
      entityId: requisite.id,
      description: `Добавлены реквизиты для исполнителя ${requisite.performer.first_name} ${requisite.performer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: requisite.type,
        name: requisite.name,
      },
    });

    return requisite;
  }

  @Put(':id')
  async updateRequisites(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreatePerformerRequisitesDto>,
    @Req() req: any,
  ) {
    const requisite = await this.requisitesService.updateRequisites(id, updateDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_REQUISITES_UPDATED',
      entity: 'PerformerRequisites',
      entityId: id,
      description: `Обновлены реквизиты для исполнителя ${requisite.performer.first_name} ${requisite.performer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return requisite;
  }

  @Delete(':id')
  async deleteRequisites(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const requisite = await this.requisitesService.getRequisiteById(id);

    await this.requisitesService.deleteRequisites(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_REQUISITES_DELETED',
      entity: 'PerformerRequisites',
      entityId: id,
      description: `Удалены реквизиты для исполнителя ${requisite.performer.first_name} ${requisite.performer.last_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Реквизиты успешно удалены' };
  }

  @Post(':id/set-default')
  async setDefaultRequisites(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type: RequisiteType },
    @Req() req: any,
  ) {
    return this.requisitesService.setDefaultRequisites(id, body.type);
  }
}
