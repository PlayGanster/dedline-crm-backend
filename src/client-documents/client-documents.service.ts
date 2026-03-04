import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ClientDocumentsService {
  private readonly logger = new Logger(ClientDocumentsService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads', 'client-documents');

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {
    // Создаём директорию для загрузок если не существует
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Получить все документы клиента
   */
  async getDocumentsByClientId(clientId: number) {
    return this.prisma.clientDocument.findMany({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Проверить документ
   */
  async verifyDocument(id: number, userId: number) {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    return this.prisma.clientDocument.update({
      where: { id },
      data: {
        is_verified: true,
        verified_by: userId,
        verified_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
  }

  /**
   * Снять проверку с документа
   */
  async unverifyDocument(id: number) {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    return this.prisma.clientDocument.update({
      where: { id },
      data: {
        is_verified: false,
        verified_by: null,
        verified_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
  }

  /**
   * Получить документ по ID
   */
  async getDocumentById(id: number) {
    return this.prisma.clientDocument.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });
  }

  /**
   * Загрузить и зашифровать документ
   */
  async uploadDocument(
    userId: number,
    clientId: number,
    file: any,
    description?: string,
  ) {
    // Создаём уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomString}.enc`;
    const encryptedPath = join(this.uploadDir, filename);

    try {
      // Читаем файл и шифруем
      const fileBuffer = readFileSync(file.path);
      const { encrypted, iv, authTag } = this.cryptoService.encryptBuffer(fileBuffer);

      // Сохраняем зашифрованный файл с метаданными
      const metadata = Buffer.alloc(48); // 16 bytes IV + 16 bytes AuthTag + 16 bytes padding
      iv.copy(metadata, 0);
      authTag.copy(metadata, 16);
      Buffer.from(file.originalname, 'utf-8').copy(metadata, 32);

      const finalBuffer = Buffer.concat([metadata, encrypted]);
      writeFileSync(encryptedPath, finalBuffer);

      // Удаляем оригинальный файл
      unlinkSync(file.path);

      // Создаём запись в БД
      const document = await this.prisma.clientDocument.create({
        data: {
          clientId,
          userId,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          encryptedPath: filename,
          description,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              avatar: true,
            },
          },
        },
      });

      this.logger.log(`Document uploaded: ${file.originalname} for client ${clientId}`);
      return document;
    } catch (error) {
      this.logger.error('Document upload failed:', error);
      // Очищаем файл при ошибке
      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Скачать и расшифровать документ
   */
  async downloadDocument(id: number, userId: number) {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    // Проверяем доступ (пользователь загрузивший или админ)
    if (document.userId !== userId) {
      // Можно добавить проверку на роль администратора
      throw new NotFoundException('Доступ запрещён');
    }

    const encryptedPath = join(this.uploadDir, document.encryptedPath);

    if (!existsSync(encryptedPath)) {
      throw new NotFoundException('Файл не найден на диске');
    }

    try {
      // Читаем зашифрованный файл
      const encryptedData = readFileSync(encryptedPath);

      // Извлекаем метаданные
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(16, 32);
      const encrypted = encryptedData.slice(48);

      // Расшифровываем
      const decryptedBuffer = this.cryptoService.decryptBuffer(encrypted, iv, authTag);

      return {
        buffer: decryptedBuffer,
        originalName: document.originalName,
        mimeType: document.mimeType,
      };
    } catch (error) {
      this.logger.error('Document download failed:', error);
      throw error;
    }
  }

  /**
   * Удалить документ
   */
  async deleteDocument(id: number) {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    const encryptedPath = join(this.uploadDir, document.encryptedPath);

    try {
      // Удаляем файл с диска
      if (existsSync(encryptedPath)) {
        unlinkSync(encryptedPath);
      }

      // Удаляем запись из БД
      await this.prisma.clientDocument.delete({
        where: { id },
      });

      this.logger.log(`Document deleted: ${document.originalName}`);
      return { message: 'Документ удалён' };
    } catch (error) {
      this.logger.error('Document deletion failed:', error);
      throw error;
    }
  }
}
