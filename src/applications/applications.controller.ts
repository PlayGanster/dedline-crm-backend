import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('applications')
@UseGuards(AuthGuard('jwt'))
export class ApplicationsController {
  constructor(
    private applicationsService: ApplicationsService,
    private logsService: LogsService,
    private transactionsService: TransactionsService,
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
    @Body() body: { requisiteId?: number },
  ) {
    return this.applicationsService.addPerformerToApplication(id, performerId, body.requisiteId);
  }

  @Get(':id/performers')
  async getPerformers(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getPerformers(id);
  }

  @Delete(':id/performers/:performerId')
  async removePerformer(
    @Param('id', ParseIntPipe) id: number,
    @Param('performerId', ParseIntPipe) performerId: number,
  ) {
    return this.applicationsService.removePerformerFromApplication(id, performerId);
  }

  // Задачи
  @Get(':id/tasks')
  async getTasks(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getTasks(id);
  }

  @Post(':id/tasks')
  async createTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() createTaskDto: any,
    @Req() req: any,
  ) {
    return this.applicationsService.createTask(id, createTaskDto);
  }

  @Put(':id/tasks/:taskId')
  async updateTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() updateTaskDto: any,
    @Req() req: any,
  ) {
    return this.applicationsService.updateTask(taskId, updateTaskDto);
  }

  @Post(':id/tasks/:taskId/toggle-status')
  async toggleTaskStatus(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.applicationsService.toggleTaskStatus(taskId);
  }

  @Delete(':id/tasks/:taskId')
  async deleteTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.applicationsService.deleteTask(taskId);
  }

  // Смены
  @Get(':id/shifts')
  async getShifts(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getShifts(id);
  }

  @Post(':id/shifts')
  async createShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() createShiftDto: any,
  ) {
    return this.applicationsService.createShift(id, createShiftDto);
  }

  @Put(':id/shifts/:shiftId')
  async updateShift(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() updateShiftDto: any,
  ) {
    return this.applicationsService.updateShift(shiftId, updateShiftDto);
  }

  @Delete(':id/shifts/:shiftId')
  async deleteShift(@Param('shiftId', ParseIntPipe) shiftId: number) {
    return this.applicationsService.deleteShift(shiftId);
  }

  @Post(':id/shifts/:shiftId/receipt')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/receipts',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `receipt-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)|application\/pdf/)) {
        return cb(new Error('Только изображения или PDF'), false);
      }
      cb(null, true);
    },
  }))
  async uploadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @UploadedFile() file: any,
  ) {
    return this.applicationsService.uploadReceipt(shiftId, file.filename);
  }

  // Документы
  @Get(':id/documents')
  async getDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.getDocuments(id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/application-documents',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `doc-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.applicationsService.uploadDocument(id, {
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      file_path: `/uploads/application-documents/${file.filename}`,
    });
  }

  @Put(':id/documents/:docId/verify')
  async verifyDocument(@Param('docId', ParseIntPipe) docId: number) {
    return this.applicationsService.verifyDocument(docId);
  }

  @Delete(':id/documents/:docId')
  async deleteDocument(@Param('docId', ParseIntPipe) docId: number) {
    return this.applicationsService.deleteDocument(docId);
  }

  // Менеджер заявки
  @Put(':id/manager')
  async updateManager(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { manager_id: number },
  ) {
    return this.applicationsService.updateManager(id, dto.manager_id);
  }

  // Директор (главный по заявке)
  @Put(':id/director')
  async updateDirector(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { director_id: number },
  ) {
    return this.applicationsService.updateDirector(id, dto.director_id);
  }

  // Комментарий менеджера
  @Put(':id/comment')
  async updateManagerComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { manager_comment: string },
  ) {
    return this.applicationsService.updateManagerComment(id, dto.manager_comment);
  }

  // Создание дохода от заказчика (оплата от клиента)
  @Post(':id/income')
  async createCustomerIncome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { amount: number; description?: string; transaction_date?: string },
  ) {
    const application = await this.applicationsService.getApplicationById(id);
    
    if (!application.client_id) {
      throw new BadRequestException('У заявки нет клиента');
    }

    return this.transactionsService.createTransaction({
      type: 'INCOME',
      amount: dto.amount,
      status: 'COMPLETED',
      description: dto.description || `Оплата от клиента по заявке #${id}`,
      client_id: application.client_id,
      application_id: id,
      transaction_date: dto.transaction_date || new Date().toISOString(),
    });
  }
}
