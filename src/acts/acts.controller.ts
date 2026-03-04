import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ActsService } from './acts.service';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('acts')
@UseGuards(AuthGuard('jwt'))
export class ActsController {
  constructor(
    private actsService: ActsService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllActs() {
    return this.actsService.getAllActs();
  }

  @Get(':id')
  async getActById(@Param('id', ParseIntPipe) id: number) {
    return this.actsService.getActById(id);
  }

  @Post()
  async createAct(@Body() createActDto: CreateActDto, @Req() req: any) {
    const act = await this.actsService.createAct(createActDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'ACT_CREATED',
      entity: 'Act',
      entityId: act.id,
      description: `Создан акт ${act.number} на сумму ${act.amount}₽`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: act.number,
        amount: act.amount,
        status: act.status,
        client_id: act.client_id,
      },
    });

    return act;
  }

  @Put(':id')
  async updateAct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActDto: UpdateActDto,
    @Req() req: any,
  ) {
    const act = await this.actsService.updateAct(id, updateActDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'ACT_UPDATED',
      entity: 'Act',
      entityId: id,
      description: `Обновлён акт ${act.number}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: act.number,
        amount: act.amount,
        status: act.status,
      },
    });

    return act;
  }

  @Delete(':id')
  async deleteAct(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const act = await this.actsService.getActById(id);

    await this.actsService.deleteAct(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'ACT_DELETED',
      entity: 'Act',
      entityId: id,
      description: `Удалён акт ${act.number}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: act.number,
        amount: act.amount,
      },
    });

    return { message: 'Акт успешно удалён' };
  }

  @Post(':id/mark-as-signed')
  async markAsSigned(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const act = await this.actsService.markAsSigned(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'ACT_SIGNED',
      entity: 'Act',
      entityId: id,
      description: `Акт ${act.number} подписан`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: act.number,
      },
    });

    return act;
  }
}
