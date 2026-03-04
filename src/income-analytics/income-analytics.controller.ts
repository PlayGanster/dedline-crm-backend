import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IncomeAnalyticsService } from './income-analytics.service';

@Controller('income-analytics')
@UseGuards(AuthGuard('jwt'))
export class IncomeAnalyticsController {
  constructor(private incomeAnalyticsService: IncomeAnalyticsService) {}

  @Get('overview')
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.incomeAnalyticsService.getIncomeOverview(start, end);
  }

  @Get('expense-overview')
  async getExpenseOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.incomeAnalyticsService.getExpenseOverview(start, end);
  }

  @Get('by-period')
  async getByPeriod(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.incomeAnalyticsService.getIncomeByPeriod(period, start, end);
  }

  @Get('expense-by-period')
  async getExpenseByPeriod(
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.incomeAnalyticsService.getExpenseByPeriod(period, start, end);
  }

  @Get('by-client')
  async getByClient(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.incomeAnalyticsService.getIncomeByClient(start, end);
  }

  @Get('expense-by-performer')
  async getExpenseByPerformer(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.incomeAnalyticsService.getExpenseByPerformer(start, end);
  }

  @Get('pending')
  async getPending() {
    return this.incomeAnalyticsService.getPendingIncome();
  }

  @Get('expense-pending')
  async getExpensePending() {
    return this.incomeAnalyticsService.getPendingExpense();
  }
}
