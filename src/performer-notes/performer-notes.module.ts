import { Module } from '@nestjs/common';
import { PerformerNotesController } from './performer-notes.controller';
import { PerformerNotesService } from './performer-notes.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [PerformerNotesController],
  providers: [PerformerNotesService, PrismaService],
  exports: [PerformerNotesService],
})
export class PerformerNotesModule {}
