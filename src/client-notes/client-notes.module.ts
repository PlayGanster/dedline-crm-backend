import { Module } from '@nestjs/common';
import { ClientNotesController } from './client-notes.controller';
import { ClientNotesService } from './client-notes.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [ClientNotesController],
  providers: [ClientNotesService, PrismaService],
  exports: [ClientNotesService],
})
export class ClientNotesModule {}
