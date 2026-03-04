import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';

@Injectable()
export class ActsService {
  constructor(private prisma: PrismaService) {}

  async getAllActs() {
    return this.prisma.act.findMany({
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
        invoice: {
          select: {
            id: true,
            number: true,
          },
        },
        application: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getActById(id: number) {
    const act = await this.prisma.act.findUnique({
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
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
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

    if (!act) {
      throw new NotFoundException(`Акт с ID ${id} не найден`);
    }

    return act;
  }

  async generateActNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const lastAct = await this.prisma.act.findFirst({
      where: {
        number: {
          startsWith: `ACT-${year}-${month}-`,
        },
      },
      orderBy: { number: 'desc' },
    });

    let nextNumber = 1;
    if (lastAct) {
      const parts = lastAct.number.split('-');
      const lastNum = parseInt(parts[parts.length - 1]);
      nextNumber = lastNum + 1;
    }

    return `ACT-${year}-${month}-${String(nextNumber).padStart(4, '0')}`;
  }

  async createAct(createActDto: CreateActDto) {
    const number = await this.generateActNumber();
    const { act_date, items, ...data } = createActDto;

    const act = await this.prisma.act.create({
      data: {
        ...data,
        number,
        amount: String(data.amount),
        act_date: act_date ? new Date(act_date) : new Date(),
        items,
      },
    });

    return this.getActById(act.id);
  }

  async updateAct(id: number, updateActDto: UpdateActDto) {
    await this.getActById(id);

    const { act_date, amount, items, ...data } = updateActDto;

    const act = await this.prisma.act.update({
      where: { id },
      data: {
        ...data,
        ...(amount !== undefined && { amount: String(amount) }),
        ...(act_date && { act_date: new Date(act_date) }),
        ...(items !== undefined && { items }),
      },
    });

    return this.getActById(act.id);
  }

  async deleteAct(id: number) {
    await this.getActById(id);

    await this.prisma.act.delete({
      where: { id },
    });

    return { message: 'Акт успешно удалён' };
  }

  async markAsSigned(id: number) {
    const act = await this.getActById(id);

    return this.prisma.act.update({
      where: { id },
      data: {
        status: 'SIGNED',
      },
    });
  }
}
