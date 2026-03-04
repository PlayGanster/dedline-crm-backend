import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService, LogsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
