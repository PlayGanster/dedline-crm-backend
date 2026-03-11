import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('financial')
  async getFinancialStats(@Query('period') period: 'week' | 'month' | 'year' = 'month') {
    return this.dashboardService.getFinancialStats(period);
  }

  @Get('applications/recent')
  async getRecentApplications(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentApplications(parseInt(limit));
  }

  @Get('transactions/recent')
  async getRecentTransactions(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentTransactions(parseInt(limit));
  }

  @Get('calls/stats')
  async getIncomingCallsStats() {
    return this.dashboardService.getIncomingCallsStats();
  }

  @Get('calls/recent')
  async getRecentIncomingCalls(@Query('limit') limit: string = '5') {
    return this.dashboardService.getRecentIncomingCalls(parseInt(limit));
  }

  @Get('applications/by-status')
  async getApplicationsByStatus() {
    return this.dashboardService.getApplicationsByStatus();
  }

  @Get('revenue-chart')
  async getRevenueChartData(@Query('period') period: 'week' | 'month' | 'year' = 'month') {
    return this.dashboardService.getRevenueChartData(period);
  }

  @Get('client-types')
  async getClientTypesStats() {
    return this.dashboardService.getClientTypesStats();
  }

  @Get('top-performers')
  async getTopPerformers(@Query('limit') limit: string = '5') {
    return this.dashboardService.getTopPerformers(parseInt(limit));
  }

  @Get('top-clients')
  async getTopClients(@Query('limit') limit: string = '5') {
    return this.dashboardService.getTopClients(parseInt(limit));
  }

  @Get('monthly-stats')
  async getMonthlyStats(@Query('months') months: string = '6') {
    return this.dashboardService.getMonthlyStats(parseInt(months));
  }
}
