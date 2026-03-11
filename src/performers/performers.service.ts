import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreatePerformerDto } from './dto/create-performer.dto';
import { UpdatePerformerDto } from './dto/update-performer.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class PerformersService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async getAllPerformers() {
    return this.prisma.performer.findMany({
      include: {
        professions: true,
        requisites: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPerformerById(id: number) {
    const performer = await this.prisma.performer.findUnique({
      where: { id },
      include: {
        professions: true,
      },
    });

    if (!performer) {
      throw new NotFoundException(`Исполнитель с ID ${id} не найден`);
    }

    return performer;
  }

  async createPerformer(createPerformerDto: CreatePerformerDto, userId: number) {
    const { professions, passport_series, passport_number, ...performerData } = createPerformerDto;

    // Хэшируем пароль только для APP пользователей
    let hashedPassword: string | null = null;
    if (performerData.source === 'APP' && performerData.password) {
      hashedPassword = await bcrypt.hash(performerData.password, 10);
    }

    try {
      // Создаём исполнителя
      const performer = await this.prisma.performer.create({
        data: {
          ...performerData,
          password: hashedPassword,
        },
        include: {
          professions: true,
        },
      });

      // Сохраняем профессии
      if (professions && professions.length > 0) {
        await this.prisma.performerProfession.createMany({
          data: professions.map((name) => ({
            performerId: performer.id,
            name,
          })),
        });
      }

      // Сохраняем зашифрованные паспортные данные
      if (passport_series) {
        await this.prisma.performerEncryptedData.create({
          data: {
            performerId: performer.id,
            fieldType: 'passport_series',
            encryptedValue: this.cryptoService.encrypt(passport_series),
          },
        });
      }

      if (passport_number) {
        await this.prisma.performerEncryptedData.create({
          data: {
            performerId: performer.id,
            fieldType: 'passport_number',
            encryptedValue: this.cryptoService.encrypt(passport_number),
          },
        });
      }

      return this.getPerformerById(performer.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint failed
          const field = error.meta?.target ? (error.meta.target as string[])[0] : 'поле';
          if (field === 'email') {
            throw new ConflictException('Исполнитель с таким email уже существует');
          } else if (field === 'phone') {
            throw new ConflictException('Исполнитель с таким телефоном уже существует');
          }
        }
      }
      throw new BadRequestException('Не удалось создать исполнителя. Проверьте корректность данных.');
    }
  }

  async updatePerformer(id: number, updatePerformerDto: UpdatePerformerDto) {
    const performer = await this.getPerformerById(id);

    const { professions, passport_series, passport_number, password, ...performerData } = updatePerformerDto;

    // Хэшируем пароль если он передан
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Обновляем исполнителя
    const updated = await this.prisma.performer.update({
      where: { id },
      data: {
        ...performerData,
        ...(hashedPassword && { password: hashedPassword }),
      },
      include: {
        professions: true,
      },
    });

    // Обновляем профессии (удаляем старые и добавляем новые)
    if (professions) {
      await this.prisma.performerProfession.deleteMany({
        where: { performerId: id },
      });

      if (professions.length > 0) {
        await this.prisma.performerProfession.createMany({
          data: professions.map((name) => ({
            performerId: id,
            name,
          })),
        });
      }
    }

    // Обновляем зашифрованные паспортные данные
    if (passport_series) {
      const existingSeries = await this.prisma.performerEncryptedData.findFirst({
        where: { performerId: id, fieldType: 'passport_series' },
      });
      if (existingSeries) {
        await this.prisma.performerEncryptedData.update({
          where: { id: existingSeries.id },
          data: { encryptedValue: this.cryptoService.encrypt(passport_series) },
        });
      } else {
        await this.prisma.performerEncryptedData.create({
          data: { performerId: id, fieldType: 'passport_series', encryptedValue: this.cryptoService.encrypt(passport_series) },
        });
      }
    }

    if (passport_number) {
      const existingNumber = await this.prisma.performerEncryptedData.findFirst({
        where: { performerId: id, fieldType: 'passport_number' },
      });
      if (existingNumber) {
        await this.prisma.performerEncryptedData.update({
          where: { id: existingNumber.id },
          data: { encryptedValue: this.cryptoService.encrypt(passport_number) },
        });
      } else {
        await this.prisma.performerEncryptedData.create({
          data: { performerId: id, fieldType: 'passport_number', encryptedValue: this.cryptoService.encrypt(passport_number) },
        });
      }
    }

    return this.getPerformerById(id);
  }

  async deletePerformer(id: number) {
    await this.getPerformerById(id);

    await this.prisma.performer.delete({
      where: { id },
    });

    return { message: 'Исполнитель успешно удалён' };
  }

  async getPerformerPassportData(id: number) {
    const encryptedData = await this.prisma.performerEncryptedData.findMany({
      where: { performerId: id },
    });

    const decrypted: Record<string, string> = {};

    for (const item of encryptedData) {
      decrypted[item.fieldType] = this.cryptoService.decrypt(item.encryptedValue);
    }

    return decrypted;
  }
}
