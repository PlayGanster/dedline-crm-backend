import { Module } from '@nestjs/common';
import { ErrorReportController } from './error-report.controller';
import { ErrorReportService } from './error-report.service';
import { TelegramModule } from '../telegram/telegram.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TelegramModule, LogsModule],
  controllers: [ErrorReportController],
  providers: [ErrorReportService],
})
export class ErrorReportModule {}
