import { Module } from '@nestjs/common';
import { ClientDocumentsController } from './client-documents.controller';
import { ClientDocumentsService } from './client-documents.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoModule } from '../crypto/crypto.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Создаём директорию для временных файлов
const tempDir = './uploads/temp';
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

@Module({
  imports: [
    CryptoModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: diskStorage({
          destination: tempDir,
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = extname(file.originalname);
            const filename = `temp-${uniqueSuffix}${ext}`;
            cb(null, filename);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
        },
      }),
    }),
  ],
  controllers: [ClientDocumentsController],
  providers: [ClientDocumentsService, PrismaService],
  exports: [ClientDocumentsService],
})
export class ClientDocumentsModule {}
