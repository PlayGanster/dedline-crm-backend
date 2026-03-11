import { Module } from '@nestjs/common';
import { CompanyCheckController } from './company-check.controller';
import { CompanyCheckService } from './company-check.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [CompanyCheckController],
  providers: [CompanyCheckService],
  exports: [CompanyCheckService],
})
export class CompanyCheckModule {}
