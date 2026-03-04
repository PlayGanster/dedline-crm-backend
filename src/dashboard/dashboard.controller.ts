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
}
