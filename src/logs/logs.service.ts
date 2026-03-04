import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateLogDto {
  userId: number | null;
  action: string;
  entity?: string;
  entityId?: number;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: CreateLogDto) {
    return this.prisma.log.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getLogs(
    page: number = 1,
    limit: number = 50,
    userId?: number,
    action?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              role: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.log.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(id: number) {
    return this.prisma.log.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });
  }
}
