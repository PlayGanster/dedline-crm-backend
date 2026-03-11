import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

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
        manager: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
          },
        },
        director: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            avatar: true,
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
    const { performer_ids, tasks, ...applicationData } = createApplicationDto;

    const application = await this.prisma.application.create({
      data: {
        ...applicationData,
        amount: applicationData.amount ? String(applicationData.amount) : null,
      },
    });

    // Добавляем исполнителей если указаны
    if (performer_ids && performer_ids.length > 0) {
      const maxPerformers = applicationData.performers_count || 1;
      const selectedPerformers = performer_ids.slice(0, maxPerformers);

      await this.prisma.applicationPerformer.createMany({
        data: selectedPerformers.map((performerId) => ({
          applicationId: application.id,
          performerId,
        })),
      });
    }

    // Добавляем задачи если указаны
    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        await this.prisma.applicationTask.create({
          data: {
            applicationId: application.id,
            service_type: task.service_type,
            payment_type: task.payment_type,
            work_location: task.work_location,
            meeting_point: task.meeting_point,
            work_front: task.work_front,
            quantity: task.quantity || 1,
            start_date: task.start_date ? new Date(task.start_date) : null,
            time_from: task.time_from,
            time_to: task.time_to,
            overtime: task.overtime || false,
            rate: String(task.rate),
            payment_unit: task.payment_unit,
            customer_price: task.customer_price ? String(task.customer_price) : null,
            hours: task.hours,
          },
        });
      }
    }

    return this.getApplicationById(application.id);
  }

  async updateApplication(id: number, updateApplicationDto: UpdateApplicationDto) {
    const application = await this.getApplicationById(id);

    const { performer_ids, client_id, manager_id, director_id, manager_comment, ...applicationData } = updateApplicationDto;

    // Обновляем заявку
    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        ...applicationData,
        // Обновляем сумму если указана
        ...(applicationData.amount !== undefined && { amount: String(applicationData.amount) }),
      } as any,
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
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { performers: true },
    });

    // Проверяем верификацию исполнителя
    const performer = await this.prisma.performer.findUnique({
      where: { id: performerId },
      select: { is_verified: true, is_active: true },
    });

    if (!performer) {
      throw new NotFoundException('Исполнитель не найден');
    }

    if (!performer.is_verified) {
      throw new BadRequestException('Нельзя добавить непроверенного исполнителя в заявку');
    }

    if (!performer.is_active) {
      throw new BadRequestException('Нельзя добавить неактивного исполнителя в заявку');
    }

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
            is_verified: true,
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

  async getPerformers(applicationId: number) {
    const applicationPerformers = await this.prisma.applicationPerformer.findMany({
      where: { applicationId },
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            middle_name: true,
            phone: true,
            avatar: true,
            requisites: true,
          },
        },
      },
    });
    return applicationPerformers;
  }

  // Задачи
  async getTasks(applicationId: number) {
    return this.prisma.applicationTask.findMany({
      where: { applicationId },
      orderBy: { created_at: 'asc' },
    });
  }

  async createTask(applicationId: number, taskData: any) {
    return this.prisma.applicationTask.create({
      data: {
        applicationId,
        service_type: taskData.service_type,
        payment_type: taskData.payment_type,
        work_location: taskData.work_location,
        meeting_point: taskData.meeting_point,
        work_front: taskData.work_front,
        quantity: taskData.quantity || 1,
        start_date: taskData.start_date ? new Date(taskData.start_date) : null,
        time_from: taskData.time_from,
        time_to: taskData.time_to,
        overtime: taskData.overtime || false,
        rate: String(taskData.rate),
        payment_unit: taskData.payment_unit,
        customer_price: taskData.customer_price ? String(taskData.customer_price) : null,
        hours: taskData.hours,
        status: taskData.status || 'IN_PROGRESS',
      },
    });
  }

  async updateTask(taskId: number, taskData: any) {
    return this.prisma.applicationTask.update({
      where: { id: taskId },
      data: {
        service_type: taskData.service_type,
        payment_type: taskData.payment_type,
        work_location: taskData.work_location,
        meeting_point: taskData.meeting_point,
        work_front: taskData.work_front,
        quantity: taskData.quantity,
        start_date: taskData.start_date ? new Date(taskData.start_date) : null,
        time_from: taskData.time_from,
        time_to: taskData.time_to,
        overtime: taskData.overtime,
        rate: String(taskData.rate),
        payment_unit: taskData.payment_unit,
        customer_price: taskData.customer_price ? String(taskData.customer_price) : null,
        hours: taskData.hours,
        status: taskData.status,
      },
    });
  }

  async toggleTaskStatus(taskId: number) {
    const task = await this.prisma.applicationTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${taskId} не найдена`);
    }

    const newStatus = task.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';

    return this.prisma.applicationTask.update({
      where: { id: taskId },
      data: { status: newStatus },
    });
  }

  async deleteTask(taskId: number) {
    await this.prisma.applicationTask.delete({
      where: { id: taskId },
    });
    return { message: 'Задача удалена' };
  }

  // Менеджер заявки
  async updateManager(applicationId: number, managerId: number) {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { manager_id: managerId } as any,
    });
  }

  // Директор (главный по заявке)
  async updateDirector(applicationId: number, directorId: number) {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { director_id: directorId } as any,
    });
  }

  // Комментарий менеджера
  async updateManagerComment(applicationId: number, managerComment: string) {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { manager_comment: managerComment },
    });
  }

  // Смены
  async getShifts(applicationId: number) {
    return this.prisma.applicationShift.findMany({
      where: { applicationId },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            payment_type: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createShift(applicationId: number, shiftData: any) {
    // Проверяем задачу если указана
    if (shiftData.task_id) {
      const task = await this.prisma.applicationTask.findUnique({
        where: { id: shiftData.task_id },
      });

      if (!task) {
        throw new NotFoundException(`Задача с ID ${shiftData.task_id} не найдена`);
      }

      // Если задача завершена, нельзя добавить смену
      if (task.status === 'COMPLETED') {
        throw new BadRequestException('Нельзя добавить смену к завершённой задаче');
      }

      // Всегда привязываем смену к задаче
      shiftData.task_id = task.id;
    }

    const shift = await this.prisma.applicationShift.create({
      data: {
        applicationId,
        performer_id: shiftData.performer_id,
        task_id: shiftData.task_id,
        date: new Date(shiftData.date),
        hours: shiftData.hours,
        amount: String(shiftData.amount),
        receipt_sent: shiftData.receipt_sent || false,
      },
    });

    // Создаем транзакцию расхода для исполнителя
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { client_id: true },
    });

    if (application && shiftData.amount) {
      // Статус транзакции зависит от того, отправлен ли чек
      const transactionStatus = shiftData.receipt_sent ? 'COMPLETED' : 'PENDING';

      // Проверяем, существует ли уже транзакция для этой смены
      const existingTransaction = await this.prisma.transaction.findFirst({
        where: {
          application_id: applicationId,
          performer_id: shiftData.performer_id,
          type: 'EXPENSE',
        },
      });

      if (!existingTransaction) {
        await this.transactionsService.createTransaction({
          type: 'EXPENSE',
          amount: parseFloat(String(shiftData.amount)),
          status: transactionStatus,
          description: `Выплата исполнителю по заявке #${applicationId}`,
          performer_id: shiftData.performer_id,
          application_id: applicationId,
          transaction_date: shiftData.date || new Date().toISOString(),
        });
      }
    }

    return shift;
  }

  async deleteShift(shiftId: number) {
    const shift = await this.prisma.applicationShift.findUnique({
      where: { id: shiftId },
      include: { application: { select: { client_id: true } } },
    });

    if (!shift) {
      throw new NotFoundException(`Смена с ID ${shiftId} не найдена`);
    }

    // Обновляем транзакцию на CANCELLED вместо удаления
    await this.prisma.transaction.updateMany({
      where: {
        application_id: shift.applicationId,
        performer_id: shift.performer_id,
        amount: shift.amount,
      },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.prisma.applicationShift.delete({
      where: { id: shiftId },
    });

    return { message: 'Смена удалена' };
  }

  async updateShift(shiftId: number, updateShiftDto: any) {
    const shift = await this.prisma.applicationShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Смена с ID ${shiftId} не найдена`);
    }

    // Если изменился статус receipt_sent, обновляем транзакцию
    if (updateShiftDto.receipt_sent !== undefined && updateShiftDto.receipt_sent !== shift.receipt_sent) {
      const updatedShift = await this.prisma.applicationShift.update({
        where: { id: shiftId },
        data: {
          receipt_sent: updateShiftDto.receipt_sent,
        },
      });

      // Обновляем статус транзакции
      const transactionStatus = updatedShift.receipt_sent ? 'COMPLETED' : 'PENDING';

      await this.prisma.transaction.updateMany({
        where: {
          application_id: shift.applicationId,
          performer_id: shift.performer_id,
          amount: shift.amount,
        },
        data: {
          status: transactionStatus,
        },
      });

      return updatedShift;
    }

    return this.prisma.applicationShift.update({
      where: { id: shiftId },
      data: {
        receipt_sent: updateShiftDto.receipt_sent,
      },
    });
  }

  // Документы
  async getDocuments(applicationId: number) {
    return this.prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { created_at: 'desc' },
    });
  }

  async uploadDocument(applicationId: number, documentData: any) {
    return this.prisma.applicationDocument.create({
      data: {
        applicationId,
        ...documentData,
      },
    });
  }

  async verifyDocument(docId: number) {
    return this.prisma.applicationDocument.update({
      where: { id: docId },
      data: {
        is_verified: true,
        verified_at: new Date(),
      },
    });
  }

  async deleteDocument(docId: number) {
    await this.prisma.applicationDocument.delete({
      where: { id: docId },
    });
    return { message: 'Документ удалён' };
  }
}
