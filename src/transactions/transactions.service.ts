import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async getAllTransactions() {
    return this.prisma.transaction.findMany({
      include: {
        client: {
          select: {
            id: true,
            fio: true,
            company_name: true,
            type: true,
          },
        },
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        application: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async getTransactionById(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            fio: true,
            company_name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            phone: true,
          },
        },
        application: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Транзакция с ID ${id} не найдена`);
    }

    return transaction;
  }

  async createTransaction(createTransactionDto: CreateTransactionDto) {
    const { transaction_date, ...data } = createTransactionDto;

    const transaction = await this.prisma.transaction.create({
      data: {
        ...data,
        amount: String(data.amount),
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
      },
    });

    return this.getTransactionById(transaction.id);
  }

  async updateTransaction(id: number, updateTransactionDto: UpdateTransactionDto) {
    await this.getTransactionById(id);

    const { transaction_date, amount, ...data } = updateTransactionDto;

    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        ...(amount !== undefined && { amount: String(amount) }),
        ...(transaction_date && { transaction_date: new Date(transaction_date) }),
      },
    });

    return this.getTransactionById(transaction.id);
  }

  async deleteTransaction(id: number) {
    await this.getTransactionById(id);

    await this.prisma.transaction.delete({
      where: { id },
    });

    return { message: 'Транзакция успешно удалена' };
  }
}
