import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllTransactions() {
    return this.transactionsService.getAllTransactions();
  }

  @Get(':id')
  async getTransactionById(@Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.getTransactionById(id);
  }

  @Post()
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto, @Req() req: any) {
    const transaction = await this.transactionsService.createTransaction(createTransactionDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'TRANSACTION_CREATED',
      entity: 'Transaction',
      entityId: transaction.id,
      description: `Создана транзакция: ${transaction.type} ${transaction.amount}₽`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
      },
    });

    return transaction;
  }

  @Put(':id')
  async updateTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @Req() req: any,
  ) {
    const transaction = await this.transactionsService.updateTransaction(id, updateTransactionDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'TRANSACTION_UPDATED',
      entity: 'Transaction',
      entityId: id,
      description: `Обновлена транзакция #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
      },
    });

    return transaction;
  }

  @Delete(':id')
  async deleteTransaction(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const transaction = await this.transactionsService.getTransactionById(id);

    await this.transactionsService.deleteTransaction(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'TRANSACTION_DELETED',
      entity: 'Transaction',
      entityId: id,
      description: `Удалена транзакция #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        type: transaction.type,
        amount: transaction.amount,
      },
    });

    return { message: 'Транзакция успешно удалена' };
  }
}
