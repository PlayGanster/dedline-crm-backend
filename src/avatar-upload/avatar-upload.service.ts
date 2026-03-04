import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Injectable()
export class AvatarUploadService {
  private readonly logger = new Logger(AvatarUploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR') || 'uploads/avatars';
    this.baseUrl = this.configService.get('UPLOAD_URL') || 'http://localhost:3000/uploads/avatars';
    
    // Создаём директорию если не существует
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getStorage() {
    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        // Генерируем уникальное имя файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `avatar-${uniqueSuffix}${ext}`;
        cb(null, filename);
      },
    });
  }

  getFileFilter() {
    return (req, file, cb) => {
      // Разрешаем только изображения
      if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        return cb(new Error('Только изображения (JPEG, PNG, GIF, WebP)'), false);
      }
      cb(null, true);
    };
  }

  // Получить URL аватара по имени файла
  getAvatarUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }

  // Удалить аватар
  deleteAvatar(filename: string): boolean {
    try {
      const filePath = `${this.uploadDir}/${filename}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Avatar deleted: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete avatar: ${error.message}`);
      return false;
    }
  }

  // Извлечь имя файла из полного URL
  extractFilenameFromUrl(url: string): string | null {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
}
