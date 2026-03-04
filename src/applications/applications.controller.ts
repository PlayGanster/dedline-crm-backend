import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('applications')
@UseGuards(AuthGuard('jwt'))
export class ApplicationsController {
  constructor(
    private applicationsService: ApplicationsService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllApplications() {
    return this.applicationsService.getAllApplications();
  }

  @Get(':id')
  async getApplicationById(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getApplicationById(id);
  }

  @Post()
  async createApplication(@Body() createApplicationDto: CreateApplicationDto, @Req() req: any) {
    const application = await this.applicationsService.createApplication(createApplicationDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'APPLICATION_CREATED',
      entity: 'Application',
      entityId: application.id,
      description: `Создана новая заявка: ${application.title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        title: application.title,
        client_id: application.client_id,
        status: application.status,
      },
    });

    return application;
  }

  @Put(':id')
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateApplicationDto,
    @Req() req: any,
  ) {
    const application = await this.applicationsService.updateApplication(id, updateApplicationDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'APPLICATION_UPDATED',
      entity: 'Application',
      entityId: id,
      description: `Обновлена заявка: ${application.title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        title: application.title,
        status: application.status,
      },
    });

    return application;
  }

  @Delete(':id')
  async deleteApplication(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const application = await this.applicationsService.getApplicationById(id);

    await this.applicationsService.deleteApplication(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'APPLICATION_DELETED',
      entity: 'Application',
      entityId: id,
      description: `Удалена заявка: ${application.title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        title: application.title,
      },
    });

    return { message: 'Заявка успешно удалена' };
  }

  @Post(':id/performers/:performerId')
  async addPerformer(
    @Param('id', ParseIntPipe) id: number,
    @Param('performerId', ParseIntPipe) performerId: number,
  ) {
    return this.applicationsService.addPerformerToApplication(id, performerId);
  }

  @Delete(':id/performers/:performerId')
  async removePerformer(
    @Param('id', ParseIntPipe) id: number,
    @Param('performerId', ParseIntPipe) performerId: number,
  ) {
    return this.applicationsService.removePerformerFromApplication(id, performerId);
  }
}
