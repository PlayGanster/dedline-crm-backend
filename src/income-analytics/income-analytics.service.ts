import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IncomeAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getIncomeOverview(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      transaction_date: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    // Доходы из транзакций (INCOME с статусом COMPLETED)
    const transactionIncome = await this.prisma.transaction.aggregate({
      where: {
        ...dateFilter,
        type: 'INCOME',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Доходы из оплаченных счетов
    const paidInvoices = await this.prisma.invoice.aggregate({
      where: {
        ...(startDate && endDate ? {
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
        } : {
          status: 'PAID',
        }),
        status: 'PAID',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Доходы из подписанных актов
    const signedActs = await this.prisma.act.aggregate({
      where: {
        ...(startDate && endDate ? {
          act_date: {
            gte: startDate,
            lte: endDate,
          },
        } : {}),
        status: 'SIGNED',
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalFromTransactions = parseFloat(transactionIncome._sum.amount?.toString() || '0');
    const totalFromInvoices = parseFloat(paidInvoices._sum.amount?.toString() || '0');
    const totalFromActs = parseFloat(signedActs._sum.amount?.toString() || '0');

    return {
      totalIncome: totalFromTransactions + totalFromInvoices + totalFromActs,
      fromTransactions: totalFromTransactions,
      fromInvoices: totalFromInvoices,
      fromActs: totalFromActs,
      transactionCount: transactionIncome._count,
      invoiceCount: paidInvoices._count,
      actCount: signedActs._count,
    };
  }

  async getExpenseOverview(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      transaction_date: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    // Расходы из транзакций (EXPENSE с статусом COMPLETED)
    const transactionExpenses = await this.prisma.transaction.aggregate({
      where: {
        ...dateFilter,
        type: 'EXPENSE',
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Расходы по выплаченным актам (связанные транзакции)
    const actsWithExpenses = await this.prisma.transaction.aggregate({
      where: {
        ...dateFilter,
        type: 'EXPENSE',
        status: 'COMPLETED',
        performer_id: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalFromTransactions = parseFloat(transactionExpenses._sum.amount?.toString() || '0');
    const totalToPerformers = parseFloat(actsWithExpenses._sum.amount?.toString() || '0');

    return {
      totalExpense: totalFromTransactions,
      toPerformers: totalToPerformers,
      other: totalFromTransactions - totalToPerformers,
      transactionCount: transactionExpenses._count,
    };
  }

  async getIncomeByPeriod(period: 'day' | 'week' | 'month' | 'year', startDate: Date, endDate: Date) {
    const transactions = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, "transaction_date") as period,
        SUM(amount::float) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE type = 'INCOME' 
        AND status = 'COMPLETED'
        AND "transaction_date" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC(${period}, "transaction_date")
      ORDER BY period ASC
    `;

    const invoices = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, "paid_at") as period,
        SUM(amount::float) as amount,
        COUNT(*) as count
      FROM invoices
      WHERE status = 'PAID'
        AND "paid_at" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC(${period}, "paid_at")
      ORDER BY period ASC
    `;

    const acts = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, "act_date") as period,
        SUM(amount::float) as amount,
        COUNT(*) as count
      FROM acts
      WHERE status = 'SIGNED'
        AND "act_date" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC(${period}, "act_date")
      ORDER BY period ASC
    `;

    return {
      transactions: transactions as any[],
      invoices: invoices as any[],
      acts: acts as any[],
    };
  }

  async getExpenseByPeriod(period: 'day' | 'week' | 'month' | 'year', startDate: Date, endDate: Date) {
    const expenses = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, "transaction_date") as period,
        SUM(amount::float) as amount,
        COUNT(*) as count
      FROM transactions
      WHERE type = 'EXPENSE' 
        AND status = 'COMPLETED'
        AND "transaction_date" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC(${period}, "transaction_date")
      ORDER BY period ASC
    `;

    return {
      expenses: expenses as any[],
    };
  }

  async getIncomeByClient(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      transaction_date: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const incomeByClient = await this.prisma.transaction.groupBy({
      by: ['client_id'],
      where: {
        ...dateFilter,
        type: 'INCOME',
        status: 'COMPLETED',
        client_id: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    });

    const clientIds = incomeByClient.map(item => item.client_id).filter(Boolean);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        company_name: true,
        type: true,
      },
    });

    return incomeByClient.map(item => {
      const client = clients.find(c => c.id === item.client_id);
      return {
        client_id: item.client_id,
        client_name: client?.type === 'LEGAL_ENTITY' 
          ? client?.company_name 
          : `${client?.last_name} ${client?.first_name}`,
        total_amount: parseFloat(item._sum.amount?.toString() || '0'),
        transaction_count: item._count,
      };
    }).sort((a, b) => b.total_amount - a.total_amount);
  }

  async getExpenseByPerformer(startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      transaction_date: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const expenseByPerformer = await this.prisma.transaction.groupBy({
      by: ['performer_id'],
      where: {
        ...dateFilter,
        type: 'EXPENSE',
        status: 'COMPLETED',
        performer_id: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    });

    const performerIds = expenseByPerformer.map(item => item.performer_id).filter(Boolean);
    const performers = await this.prisma.performer.findMany({
      where: { id: { in: performerIds } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
    });

    return expenseByPerformer.map(item => {
      const performer = performers.find(p => p.id === item.performer_id);
      return {
        performer_id: item.performer_id,
        performer_name: `${performer?.last_name} ${performer?.first_name}`,
        total_amount: parseFloat(item._sum.amount?.toString() || '0'),
        transaction_count: item._count,
      };
    }).sort((a, b) => b.total_amount - a.total_amount);
  }

  async getPendingIncome() {
    // Ожидаемые доходы из счетов (статус SENT)
    const pendingInvoices = await this.prisma.invoice.aggregate({
      where: {
        status: 'SENT',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Ожидаемые доходы из актов (статус SENT)
    const pendingActs = await this.prisma.act.aggregate({
      where: {
        status: 'SENT',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Ожидаемые транзакции (статус PENDING)
    const pendingTransactions = await this.prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        status: 'PENDING',
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalPending: 
        parseFloat(pendingInvoices._sum.amount?.toString() || '0') +
        parseFloat(pendingActs._sum.amount?.toString() || '0') +
        parseFloat(pendingTransactions._sum.amount?.toString() || '0'),
      fromInvoices: parseFloat(pendingInvoices._sum.amount?.toString() || '0'),
      fromActs: parseFloat(pendingActs._sum.amount?.toString() || '0'),
      fromTransactions: parseFloat(pendingTransactions._sum.amount?.toString() || '0'),
      invoiceCount: pendingInvoices._count,
      actCount: pendingActs._count,
      transactionCount: pendingTransactions._count,
    };
  }

  async getPendingExpense() {
    // Ожидаемые расходы (транзакции со статусом PENDING)
    const pendingTransactions = await this.prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        status: 'PENDING',
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalPending: parseFloat(pendingTransactions._sum.amount?.toString() || '0'),
      fromTransactions: parseFloat(pendingTransactions._sum.amount?.toString() || '0'),
      transactionCount: pendingTransactions._count,
    };
  }
}
