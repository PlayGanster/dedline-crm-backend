import { Module } from '@nestjs/common';
import { ActsController } from './acts.controller';
import { ActsService } from './acts.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';

@Module({
  controllers: [ActsController],
  providers: [ActsService, PrismaService, LogsService],
  exports: [ActsService],
})
export class ActsModule {}
