import { Module } from '@nestjs/common';
import { PerformerDocumentsController } from './performer-documents.controller';
import { PerformerDocumentsService } from './performer-documents.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoModule } from '../crypto/crypto.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const tempDir = './uploads/temp';
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

@Module({
  imports: [
    CryptoModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: diskStorage({
          destination: tempDir,
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `temp-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    }),
  ],
  controllers: [PerformerDocumentsController],
  providers: [PerformerDocumentsService, PrismaService],
  exports: [PerformerDocumentsService],
})
export class PerformerDocumentsModule {}
