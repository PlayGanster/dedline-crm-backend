import { Module } from '@nestjs/common';
import { IncomingCallsController } from './incoming-calls.controller';
import { IncomingCallsService } from './incoming-calls.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [IncomingCallsController],
  providers: [IncomingCallsService, PrismaService],
  exports: [IncomingCallsService],
})
export class IncomingCallsModule {}
