import { Controller, Get, Query } from '@nestjs/common';
import { CompanyCheckService } from './company-check.service';

@Controller('company-check')
export class CompanyCheckController {
  constructor(private readonly companyCheckService: CompanyCheckService) {}

  @Get('full')
  async getFullCompanyInfo(@Query('query') query: string) {
    return this.companyCheckService.getFullCompanyInfo(query);
  }

  @Get('details')
  async getCompanyDetails(@Query('inn') inn: string) {
    return this.companyCheckService.getCompanyDetailsByInn(inn);
  }
}
