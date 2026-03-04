import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async getAllApplications() {
    return this.prisma.application.findMany({
      include: {
        client: {
          select: {
            id: true,
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
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getApplicationById(id: number) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            company_name: true,
            type: true,
            email: true,
            phone: true,
          },
        },
        performers: {
          include: {
            performer: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                avatar: true,
                is_verified: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    return application;
  }

  async createApplication(createApplicationDto: CreateApplicationDto) {
    const { performer_ids, ...applicationData } = createApplicationDto;

    const application = await this.prisma.application.create({
      data: {
        ...applicationData,
        amount: applicationData.amount ? String(applicationData.amount) : null,
      },
    });

    // Добавляем исполнителей если указаны
    if (performer_ids && performer_ids.length > 0) {
      // Проверяем чтобы количество исполнителей не превышало performers_count
      const maxPerformers = applicationData.performers_count || 1;
      const selectedPerformers = performer_ids.slice(0, maxPerformers);

      await this.prisma.applicationPerformer.createMany({
        data: selectedPerformers.map((performerId) => ({
          applicationId: application.id,
          performerId,
        })),
      });
    }

    return this.getApplicationById(application.id);
  }

  async updateApplication(id: number, updateApplicationDto: UpdateApplicationDto) {
    const application = await this.getApplicationById(id);

    const { performer_ids, client_id, amount, ...applicationData } = updateApplicationDto;

    // Обновляем заявку (client_id не обновляем через update)
    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        ...applicationData,
        ...(amount !== undefined && { amount: String(amount) }),
      },
    });

    // Обновляем исполнителей если указаны
    if (performer_ids) {
      // Удаляем старых исполнителей
      await this.prisma.applicationPerformer.deleteMany({
        where: { applicationId: id },
      });

      // Добавляем новых (не больше performers_count)
      const maxPerformers = updated.performers_count;
      const selectedPerformers = performer_ids.slice(0, maxPerformers);

      if (selectedPerformers.length > 0) {
        await this.prisma.applicationPerformer.createMany({
          data: selectedPerformers.map((performerId) => ({
            applicationId: id,
            performerId,
          })),
        });
      }
    }

    return this.getApplicationById(id);
  }

  async deleteApplication(id: number) {
    await this.getApplicationById(id);

    await this.prisma.application.delete({
      where: { id },
    });

    return { message: 'Заявка успешно удалена' };
  }

  async addPerformerToApplication(applicationId: number, performerId: number) {
    const application = await this.getApplicationById(applicationId);

    // Проверяем чтобы количество исполнителей не превышало performers_count
    const currentPerformersCount = application.performers.length;
    if (currentPerformersCount >= application.performers_count) {
      throw new NotFoundException(
        `Достигнуто максимальное количество исполнителей (${application.performers_count})`,
      );
    }

    // Проверяем что исполнитель ещё не добавлен
    const existing = await this.prisma.applicationPerformer.findFirst({
      where: {
        applicationId,
        performerId,
      },
    });

    if (existing) {
      throw new NotFoundException('Исполнитель уже добавлен в заявку');
    }

    return this.prisma.applicationPerformer.create({
      data: {
        applicationId,
        performerId,
      },
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });
  }

  async removePerformerFromApplication(applicationId: number, performerId: number) {
    await this.prisma.applicationPerformer.deleteMany({
      where: {
        applicationId,
        performerId,
      },
    });

    return { message: 'Исполнитель удалён из заявки' };
  }
}
