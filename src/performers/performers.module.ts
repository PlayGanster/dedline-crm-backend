import { Module } from '@nestjs/common';
import { PerformersController } from './performers.controller';
import { PerformersService } from './performers.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [PerformersController],
  providers: [PerformersService, PrismaService, LogsService],
  exports: [PerformersService],
})
export class PerformersModule {}
