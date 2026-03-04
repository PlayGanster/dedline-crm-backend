import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService, LogsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
