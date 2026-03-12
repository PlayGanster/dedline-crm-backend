import { Controller, Get, Query, UseGuards, UseInterceptors, CacheInterceptor } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @UseInterceptors(CacheInterceptor)
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('financial')
  @UseInterceptors(CacheInterceptor)
  async getFinancialStats(@Query('period') period: 'week' | 'month' | 'year' = 'month') {
    return this.dashboardService.getFinancialStats(period);
  }

  @Get('applications/recent')
  @UseInterceptors(CacheInterceptor)
  async getRecentApplications(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentApplications(parseInt(limit));
  }

  @Get('transactions/recent')
  @UseInterceptors(CacheInterceptor)
  async getRecentTransactions(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentTransactions(parseInt(limit));
  }

  @Get('calls/stats')
  @UseInterceptors(CacheInterceptor)
  async getIncomingCallsStats() {
    return this.dashboardService.getIncomingCallsStats();
  }

  @Get('calls/recent')
  @UseInterceptors(CacheInterceptor)
  async getRecentIncomingCalls(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentIncomingCalls(parseInt(limit));
  }

  @Get('applications/by-status')
  @UseInterceptors(CacheInterceptor)
  async getApplicationsByStatus() {
    return this.dashboardService.getApplicationsByStatus();
  }

  @Get('revenue-chart')
  @UseInterceptors(CacheInterceptor)
  async getRevenueChartData(@Query('period') period: 'week' | 'month' | 'year' = 'month') {
    return this.dashboardService.getRevenueChartData(period);
  }

  @Get('client-types')
  @UseInterceptors(CacheInterceptor)
  async getClientTypesStats() {
    return this.dashboardService.getClientTypesStats();
  }

  @Get('top-performers')
  @UseInterceptors(CacheInterceptor)
  async getTopPerformers(@Query('limit') limit: string = '5') {
    return this.dashboardService.getTopPerformers(parseInt(limit));
  }

  @Get('top-clients')
  @UseInterceptors(CacheInterceptor)
  async getTopClients(@Query('limit') limit: string = '5') {
    return this.dashboardService.getTopClients(parseInt(limit));
  }

  @Get('monthly-stats')
  @UseInterceptors(CacheInterceptor)
  async getMonthlyStats(@Query('months') months: string = '6') {
    return this.dashboardService.getMonthlyStats(parseInt(months));
  }
}
