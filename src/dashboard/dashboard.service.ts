import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      clientsCount,
      performersCount,
      applicationsCount,
      transactionsCount,
      invoicesCount,
      actsCount,
      chatsCount,
      // New counts
      activeClients,
      activePerformers,
      newApplicationsToday,
      newApplicationsWeek,
      newClientsToday,
      newClientsWeek,
      newPerformersToday,
      newPerformersWeek,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.performer.count(),
      this.prisma.application.count(),
      this.prisma.transaction.count(),
      this.prisma.invoice.count(),
      this.prisma.act.count(),
      this.prisma.chat.count(),
      // New counts
      this.prisma.client.count({ where: { is_active: true } }),
      this.prisma.performer.count({ where: { is_active: true } }),
      this.prisma.application.count({ where: { created_at: { gte: today } } }),
      this.prisma.application.count({ where: { created_at: { gte: weekAgo } } }),
      this.prisma.client.count({ where: { created_at: { gte: today } } }),
      this.prisma.client.count({ where: { created_at: { gte: weekAgo } } }),
      this.prisma.performer.count({ where: { created_at: { gte: today } } }),
      this.prisma.performer.count({ where: { created_at: { gte: weekAgo } } }),
    ]);

    return {
      clients: clientsCount,
      performers: performersCount,
      applications: applicationsCount,
      transactions: transactionsCount,
      invoices: invoicesCount,
      acts: actsCount,
      chats: chatsCount,
      activeClients,
      activePerformers,
      newApplicationsToday,
      newApplicationsWeek,
      newClientsToday,
      newClientsWeek,
      newPerformersToday,
      newPerformersWeek,
    };
  }

  async getFinancialStats(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const startDate = new Date();

    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const [income, expense, paidInvoices, previousIncome, previousExpense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          type: 'INCOME',
          status: 'COMPLETED',
          transaction_date: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          status: 'COMPLETED',
          transaction_date: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paid_at: { gte: startDate },
        },
        _sum: { amount: true },
      }),
      // Previous period for comparison
      this.prisma.transaction.aggregate({
        where: {
          type: 'INCOME',
          status: 'COMPLETED',
          transaction_date: { lt: startDate, gte: this.getPreviousPeriodDate(startDate, period) },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          status: 'COMPLETED',
          transaction_date: { lt: startDate, gte: this.getPreviousPeriodDate(startDate, period) },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentIncome = parseFloat(income._sum.amount?.toString() || '0');
    const currentExpense = parseFloat(expense._sum.amount?.toString() || '0');
    const previousIncomeAmount = parseFloat(previousIncome._sum.amount?.toString() || '0');
    const previousExpenseAmount = parseFloat(previousExpense._sum.amount?.toString() || '0');

    return {
      income: currentIncome,
      expense: currentExpense,
      paidInvoices: parseFloat(paidInvoices._sum.amount?.toString() || '0'),
      profit: currentIncome - currentExpense,
      incomeChange: previousIncomeAmount > 0 ? ((currentIncome - previousIncomeAmount) / previousIncomeAmount) * 100 : 0,
      expenseChange: previousExpenseAmount > 0 ? ((currentExpense - previousExpenseAmount) / previousExpenseAmount) * 100 : 0,
    };
  }

  private getPreviousPeriodDate(startDate: Date, period: string): Date {
    const result = new Date(startDate);
    if (period === 'week') result.setDate(result.getDate() - 7);
    else if (period === 'month') result.setMonth(result.getMonth() - 1);
    else if (period === 'year') result.setFullYear(result.getFullYear() - 1);
    return result;
  }

  async getRecentApplications(limit: number = 5) {
    return this.prisma.application.findMany({
      take: limit,
      include: {
        client: {
          select: {
            fio: true,
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
            fio: true,
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
            fio: true,
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

  async getRevenueChartData(period: 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const groups: { label: string; start: Date; end: Date }[] = [];

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        groups.push({
          label: start.toLocaleDateString('ru-RU', { weekday: 'short' }),
          start,
          end,
        });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        groups.push({
          label: start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          start,
          end,
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now);
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        groups.push({
          label: start.toLocaleDateString('ru-RU', { month: 'short' }),
          start,
          end,
        });
      }
    }

    const chartData = await Promise.all(
      groups.map(async (group) => {
        const [income, expense] = await Promise.all([
          this.prisma.transaction.aggregate({
            where: {
              type: 'INCOME',
              status: 'COMPLETED',
              transaction_date: { gte: group.start, lte: group.end },
            },
            _sum: { amount: true },
          }),
          this.prisma.transaction.aggregate({
            where: {
              type: 'EXPENSE',
              status: 'COMPLETED',
              transaction_date: { gte: group.start, lte: group.end },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          label: group.label,
          income: parseFloat(income._sum.amount?.toString() || '0'),
          expense: parseFloat(expense._sum.amount?.toString() || '0'),
          profit: parseFloat(income._sum.amount?.toString() || '0') - parseFloat(expense._sum.amount?.toString() || '0'),
        };
      }),
    );

    return chartData;
  }

  async getClientTypesStats() {
    const [individuals, legalEntities] = await Promise.all([
      this.prisma.client.count({ where: { type: 'INDIVIDUAL' } }),
      this.prisma.client.count({ where: { type: 'LEGAL_ENTITY' } }),
    ]);

    return {
      individuals,
      legalEntities,
    };
  }

  async getTopPerformers(limit: number = 5) {
    const topPerformers = await this.prisma.performer.findMany({
      take: limit,
      include: {
        applications: {
          select: {
            id: true,
          },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          select: {
            amount: true,
          },
        },
      },
    });

    return topPerformers.map((performer) => ({
      id: performer.id,
      first_name: performer.first_name,
      last_name: performer.last_name,
      phone: performer.phone,
      avatar: performer.avatar,
      applicationsCount: performer.applications.length,
      totalEarnings: performer.transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
    }));
  }

  async getTopClients(limit: number = 5) {
    const topClients = await this.prisma.client.findMany({
      take: limit,
      include: {
        applications: {
          select: {
            id: true,
            amount: true,
          },
        },
        transactions: {
          where: { type: 'INCOME', status: 'COMPLETED' },
          select: {
            amount: true,
          },
        },
      },
    });

    return topClients.map((client) => ({
      id: client.id,
      type: client.type,
      fio: client.fio,
      company_name: client.company_name,
      applicationsCount: client.applications.length,
      totalSpent: client.transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
    }));
  }

  async getMonthlyStats(months: number = 6) {
    const now = new Date();
    const stats = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);

      const [
        newClients,
        newPerformers,
        newApplications,
        completedApplications,
        totalIncome,
        totalExpense,
      ] = await Promise.all([
        this.prisma.client.count({ where: { created_at: { gte: start, lte: end } } }),
        this.prisma.performer.count({ where: { created_at: { gte: start, lte: end } } }),
        this.prisma.application.count({ where: { created_at: { gte: start, lte: end } } }),
        this.prisma.application.count({ where: { status: 'COMPLETED', updated_at: { gte: start, lte: end } } }),
        this.prisma.transaction.aggregate({
          where: {
            type: 'INCOME',
            status: 'COMPLETED',
            transaction_date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            type: 'EXPENSE',
            status: 'COMPLETED',
            transaction_date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
      ]);

      stats.push({
        month: start.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        newClients,
        newPerformers,
        newApplications,
        completedApplications,
        income: parseFloat(totalIncome._sum.amount?.toString() || '0'),
        expense: parseFloat(totalExpense._sum.amount?.toString() || '0'),
      });
    }

    return stats;
  }
}
