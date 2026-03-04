import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      clientsCount,
      performersCount,
      applicationsCount,
      incomingCallsCount,
      transactionsCount,
      invoicesCount,
      actsCount,
      chatsCount,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.performer.count(),
      this.prisma.application.count(),
      this.prisma.incomingCall.count(),
      this.prisma.transaction.count(),
      this.prisma.invoice.count(),
      this.prisma.act.count(),
      this.prisma.chat.count(),
    ]);

    return {
      clients: clientsCount,
      performers: performersCount,
      applications: applicationsCount,
      incomingCalls: incomingCallsCount,
      transactions: transactionsCount,
      invoices: invoicesCount,
      acts: actsCount,
      chats: chatsCount,
    };
  }

  async getFinancialStats(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const income = await this.prisma.transaction.aggregate({
      where: {
        type: 'INCOME',
        status: 'COMPLETED',
        transaction_date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const expense = await this.prisma.transaction.aggregate({
      where: {
        type: 'EXPENSE',
        status: 'COMPLETED',
        transaction_date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const paidInvoices = await this.prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paid_at: { gte: startDate },
      },
      _sum: { amount: true },
    });

    return {
      income: parseFloat(income._sum.amount?.toString() || '0'),
      expense: parseFloat(expense._sum.amount?.toString() || '0'),
      paidInvoices: parseFloat(paidInvoices._sum.amount?.toString() || '0'),
      profit: parseFloat(income._sum.amount?.toString() || '0') - parseFloat(expense._sum.amount?.toString() || '0'),
    };
  }

  async getRecentApplications(limit: number = 5) {
    return this.prisma.application.findMany({
      take: limit,
      include: {
        client: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
          },
        },
        performers: {
          include: {
            performer: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getRecentTransactions(limit: number = 5) {
    return this.prisma.transaction.findMany({
      take: limit,
      include: {
        client: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getIncomingCallsStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayCalls, weekCalls] = await Promise.all([
      this.prisma.incomingCall.count({ where: { created_at: { gte: today } } }),
      this.prisma.incomingCall.count({ where: { created_at: { gte: weekAgo } } }),
    ]);

    return {
      today: todayCalls,
      week: weekCalls,
      missed: 0,
    };
  }

  async getRecentIncomingCalls(limit: number = 5) {
    return this.prisma.incomingCall.findMany({
      take: limit,
      include: {
        client: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
            phone: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getApplicationsByStatus() {
    const statuses = await this.prisma.application.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<string, number> = {};
    statuses.forEach(s => {
      result[s.status] = s._count;
    });

    return result;
  }
}
