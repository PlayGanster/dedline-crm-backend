import { Module } from '@nestjs/common';
import { PerformerRequisitesService } from './performer-requisites.service';
import { PerformerRequisitesController } from './performer-requisites.controller';
import { DatabaseModule } from '../database/database.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [DatabaseModule, LogsModule],
  controllers: [PerformerRequisitesController],
  providers: [PerformerRequisitesService],
  exports: [PerformerRequisitesService],
})
export class PerformerRequisitesModule {}
