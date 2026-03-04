import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private logsService: LogsService,
  ) {}

  @Get()
  async getAllInvoices() {
    return this.invoicesService.getAllInvoices();
  }

  @Get(':id')
  async getInvoiceById(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Post()
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
    const invoice = await this.invoicesService.createInvoice(createInvoiceDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'INVOICE_CREATED',
      entity: 'Invoice',
      entityId: invoice.id,
      description: `Создан счёт ${invoice.number} на сумму ${invoice.amount}₽`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: invoice.number,
        amount: invoice.amount,
        status: invoice.status,
        client_id: invoice.client_id,
      },
    });

    return invoice;
  }

  @Put(':id')
  async updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Req() req: any,
  ) {
    const invoice = await this.invoicesService.updateInvoice(id, updateInvoiceDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'INVOICE_UPDATED',
      entity: 'Invoice',
      entityId: id,
      description: `Обновлён счёт ${invoice.number}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: invoice.number,
        amount: invoice.amount,
        status: invoice.status,
      },
    });

    return invoice;
  }

  @Delete(':id')
  async deleteInvoice(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const invoice = await this.invoicesService.getInvoiceById(id);

    await this.invoicesService.deleteInvoice(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'INVOICE_DELETED',
      entity: 'Invoice',
      entityId: id,
      description: `Удалён счёт ${invoice.number}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: invoice.number,
        amount: invoice.amount,
      },
    });

    return { message: 'Счёт успешно удалён' };
  }

  @Post(':id/mark-as-paid')
  async markAsPaid(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const invoice = await this.invoicesService.markAsPaid(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'INVOICE_PAID',
      entity: 'Invoice',
      entityId: id,
      description: `Счёт ${invoice.number} отмечен как оплаченный`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        number: invoice.number,
        paid_at: invoice.paid_at,
      },
    });

    return invoice;
  }
}
