import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ErrorReportService } from './error-report.service';
import { ErrorReportDto } from './dto/error-report.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('error-report')
@UseGuards(AuthGuard('jwt'))
export class ErrorReportController {
  constructor(
    private errorReportService: ErrorReportService,
    private logsService: LogsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submitErrorReport(@Body() dto: ErrorReportDto, @Req() req: any) {
    const success = await this.errorReportService.submitErrorReport(dto);

    // Log error report
    const userId = req.user?.id;
    await this.logsService.createLog({
      userId: userId || 0,
      action: 'ERROR_REPORTED',
      entity: 'ErrorReport',
      description: dto.description,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        page: dto.page,
        url: dto.url,
        userAgent: dto.userAgent,
        timestamp: dto.timestamp,
        userEmail: req.user?.email,
      },
    });

    if (success) {
      return { message: 'Ошибка успешно отправлена' };
    } else {
      return { message: 'Ошибка отправлена (с задержкой)' };
    }
  }
}
