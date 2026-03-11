import { Module } from '@nestjs/common';
import { PerformersController } from './performers.controller';
import { PerformersService } from './performers.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CryptoModule } from '../crypto/crypto.module';
import { AvatarUploadModule } from '../avatar-upload/avatar-upload.module';

@Module({
  imports: [CryptoModule, AvatarUploadModule],
  controllers: [PerformersController],
  providers: [PerformersService, PrismaService, LogsService],
  exports: [PerformersService],
})
export class PerformersModule {}
