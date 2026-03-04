import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class PerformerDocumentsService {
  private readonly logger = new Logger(PerformerDocumentsService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads', 'performer-documents');

  constructor(private prisma: PrismaService, private cryptoService: CryptoService) {
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  async getDocumentsByPerformerId(performerId: number) {
    return this.prisma.performerDocument.findMany({
      where: { performerId },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        verifiedBy: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDocumentById(id: number) {
    return this.prisma.performerDocument.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        verifiedBy: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async uploadDocument(userId: number, performerId: number, file: any, description?: string) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomString}.enc`;
    const encryptedPath = join(this.uploadDir, filename);

    try {
      const fileBuffer = readFileSync(file.path);
      const { encrypted, iv, authTag } = this.cryptoService.encryptBuffer(fileBuffer);
      const metadata = Buffer.alloc(48);
      iv.copy(metadata, 0);
      authTag.copy(metadata, 16);
      Buffer.from(file.originalname, 'utf-8').copy(metadata, 32);
      const finalBuffer = Buffer.concat([metadata, encrypted]);
      writeFileSync(encryptedPath, finalBuffer);
      unlinkSync(file.path);

      const document = await this.prisma.performerDocument.create({
        data: {
          performerId, userId, filename, originalName: file.originalname,
          mimeType: file.mimetype, size: file.size, encryptedPath: filename, description,
        },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        },
      });
      this.logger.log(`Document uploaded: ${file.originalname}`);
      return document;
    } catch (error) {
      this.logger.error('Document upload failed:', error);
      if (existsSync(file.path)) unlinkSync(file.path);
      throw error;
    }
  }

  async downloadDocument(id: number, userId: number) {
    const document = await this.getDocumentById(id);
    if (!document) throw new NotFoundException('Документ не найден');

    const encryptedPath = join(this.uploadDir, document.encryptedPath);
    if (!existsSync(encryptedPath)) throw new NotFoundException('Файл не найден');

    try {
      const encryptedData = readFileSync(encryptedPath);
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(16, 32);
      const encrypted = encryptedData.slice(48);
      const decryptedBuffer = this.cryptoService.decryptBuffer(encrypted, iv, authTag);
      return { buffer: decryptedBuffer, originalName: document.originalName, mimeType: document.mimeType };
    } catch (error) {
      this.logger.error('Document download failed:', error);
      throw error;
    }
  }

  async deleteDocument(id: number) {
    const document = await this.getDocumentById(id);
    if (!document) throw new NotFoundException('Документ не найден');

    const encryptedPath = join(this.uploadDir, document.encryptedPath);
    if (existsSync(encryptedPath)) unlinkSync(encryptedPath);
    await this.prisma.performerDocument.delete({ where: { id } });
    return { message: 'Документ удалён' };
  }

  async verifyDocument(id: number, userId: number) {
    return this.prisma.performerDocument.update({
      where: { id },
      data: { is_verified: true, verified_by: userId, verified_at: new Date() },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        verifiedBy: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }

  async unverifyDocument(id: number) {
    return this.prisma.performerDocument.update({
      where: { id },
      data: { is_verified: false, verified_by: null, verified_at: null },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
        verifiedBy: { select: { id: true, first_name: true, last_name: true } },
      },
    });
  }
}
