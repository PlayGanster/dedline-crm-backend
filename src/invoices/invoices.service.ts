import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

  async getAllInvoices() {
    return this.prisma.invoice.findMany({
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
        application: {
          select: {
            id: true,
            title: true,
          },
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            transaction_date: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getInvoiceById(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
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
        application: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            transaction_date: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Счёт с ID ${id} не найден`);
    }

    return invoice;
  }

  async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        number: {
          startsWith: `INV-${year}-${month}-`,
        },
      },
      orderBy: { number: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const parts = lastInvoice.number.split('-');
      const lastNum = parseInt(parts[parts.length - 1]);
      nextNumber = lastNum + 1;
    }

    return `INV-${year}-${month}-${String(nextNumber).padStart(4, '0')}`;
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto) {
    const number = await this.generateInvoiceNumber();
    const { due_date, items, ...data } = createInvoiceDto;

    const invoice = await this.prisma.invoice.create({
      data: {
        ...data,
        number,
        amount: String(data.amount),
        due_date: due_date ? new Date(due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        items,
      },
    });

    return this.getInvoiceById(invoice.id);
  }

  async updateInvoice(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    await this.getInvoiceById(id);

    const { due_date, amount, items, ...data } = updateInvoiceDto;

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        ...(amount !== undefined && { amount: String(amount) }),
        ...(due_date && { due_date: new Date(due_date) }),
        ...(items !== undefined && { items }),
      },
    });

    return this.getInvoiceById(invoice.id);
  }

  async deleteInvoice(id: number) {
    await this.getInvoiceById(id);

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: 'Счёт успешно удалён' };
  }

  async markAsPaid(id: number) {
    const invoice = await this.getInvoiceById(id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paid_at: new Date(),
      },
    });

    // Создаем транзакцию дохода если ещё не существует
    const existingTransaction = await this.prisma.transaction.findFirst({
      where: { invoice_id: id, type: 'INCOME' },
    });

    if (!existingTransaction && invoice.amount) {
      await this.transactionsService.createTransaction({
        type: 'INCOME',
        amount: parseFloat(String(invoice.amount)),
        status: 'COMPLETED',
        description: `Оплата счёта #${invoice.number}`,
        client_id: invoice.client_id,
        application_id: invoice.application_id,
        transaction_date: new Date().toISOString(),
      });
    }

    return updated;
  }
}
