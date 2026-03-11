import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePerformerRequisitesDto } from './dto/create-performer-requisites.dto';
import { RequisiteType } from '@prisma/client';

@Injectable()
export class PerformerRequisitesService {
  constructor(private prisma: PrismaService) {}

  async getAllRequisites(performerId?: number) {
    if (performerId) {
      return this.prisma.performerRequisites.findMany({
        where: { performerId },
        orderBy: { created_at: 'desc' },
      });
    }
    return this.prisma.performerRequisites.findMany({
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getRequisiteById(id: number) {
    const requisite = await this.prisma.performerRequisites.findUnique({
      where: { id },
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!requisite) {
      throw new NotFoundException(`Реквизиты с ID ${id} не найдены`);
    }

    return requisite;
  }

  async createRequisites(createDto: CreatePerformerRequisitesDto, userId: number) {
    // Проверка на уникальность реквизитов (ИНН + расчетный счет)
    if (createDto.type === 'REQUISITES' && createDto.inn && createDto.account_number) {
      const existing = await this.prisma.performerRequisites.findFirst({
        where: {
          inn: createDto.inn,
          account_number: createDto.account_number,
        },
      });

      if (existing) {
        throw new ConflictException('Реквизиты с таким ИНН и расчетным счетом уже существуют');
      }
    }

    // Если is_default = true, сбрасываем у других записей этого типа
    if (createDto.is_default) {
      await this.prisma.performerRequisites.updateMany({
        where: {
          performerId: createDto.performerId,
          type: createDto.type,
          id: { not: -1 }, // will be set after creation
        },
        data: { is_default: false },
      });
    }

    const requisite = await this.prisma.performerRequisites.create({
      data: {
        performerId: createDto.performerId,
        type: createDto.type,
        name: createDto.name,
        is_default: createDto.is_default || false,
        card_number: createDto.card_number,
        card_holder: createDto.card_holder,
        bank_name: createDto.bank_name,
        sbp_phone: createDto.sbp_phone,
        inn: createDto.inn,
        ogrnip: createDto.inn,
        account_number: createDto.account_number,
        bik: createDto.bik,
        bank_name_full: createDto.bank_name_full,
        correspondent_account: createDto.correspondent_account,
      },
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return requisite;
  }

  async updateRequisites(id: number, updateDto: Partial<CreatePerformerRequisitesDto>) {
    const requisite = await this.getRequisiteById(id);

    // Проверка на уникальность реквизитов при обновлении
    if (updateDto.inn && updateDto.account_number) {
      const existing = await this.prisma.performerRequisites.findFirst({
        where: {
          inn: updateDto.inn,
          account_number: updateDto.account_number,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Реквизиты с таким ИНН и расчетным счетом уже существуют у другого исполнителя');
      }
    }

    // Если is_default = true, сбрасываем у других записей этого типа
    if (updateDto.is_default) {
      await this.prisma.performerRequisites.updateMany({
        where: {
          performerId: requisite.performerId,
          type: requisite.type,
          id: { not: id },
        },
        data: { is_default: false },
      });
    }

    return this.prisma.performerRequisites.update({
      where: { id },
      data: updateDto,
      include: {
        performer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteRequisites(id: number) {
    await this.getRequisiteById(id);

    await this.prisma.performerRequisites.delete({
      where: { id },
    });

    return { message: 'Реквизиты успешно удалены' };
  }

  async setDefaultRequisites(id: number, type: RequisiteType) {
    const requisite = await this.getRequisiteById(id);

    await this.prisma.performerRequisites.updateMany({
      where: {
        performerId: requisite.performerId,
        type,
      },
      data: { is_default: false },
    });

    return this.prisma.performerRequisites.update({
      where: { id },
      data: { is_default: true },
    });
  }
}
