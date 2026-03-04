import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { ClientNotesModule } from '../client-notes/client-notes.module';
import { ClientDocumentsModule } from '../client-documents/client-documents.module';

@Module({
  imports: [ClientNotesModule, ClientDocumentsModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService, LogsService],
  exports: [ClientsService],
})
export class ClientsModule {}
