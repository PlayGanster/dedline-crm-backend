import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(AuthGuard('jwt'))
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get()
  async getLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('userId') userId?: number,
    @Query('action') action?: string,
  ) {
    return this.logsService.getLogs(
      parseInt(page.toString()),
      parseInt(limit.toString()),
      userId ? parseInt(userId.toString()) : undefined,
      action,
    );
  }

  @Get(':id')
  async getLogById(@Param('id') id: number) {
    return this.logsService.getLogById(id);
  }
}
