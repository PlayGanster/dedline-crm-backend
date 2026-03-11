import { Module, forwardRef } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [forwardRef(() => TransactionsModule)],
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService, LogsService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
