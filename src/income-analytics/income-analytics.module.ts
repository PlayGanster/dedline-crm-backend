import { Module } from '@nestjs/common';
import { IncomeAnalyticsController } from './income-analytics.controller';
import { IncomeAnalyticsService } from './income-analytics.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [IncomeAnalyticsController],
  providers: [IncomeAnalyticsService, PrismaService],
  exports: [IncomeAnalyticsService],
})
export class IncomeAnalyticsModule {}
