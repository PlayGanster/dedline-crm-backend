import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { IncomingCallsService } from './incoming-calls.service';
import { CreateIncomingCallDto, ConvertToClientDto, ConvertToApplicationDto } from './dto/create-incoming-call.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('incoming-calls')
@UseGuards(AuthGuard('jwt'))
export class IncomingCallsController {
  constructor(private incomingCallsService: IncomingCallsService) {}

  @Get()
  async getAllIncomingCalls() {
    return this.incomingCallsService.getAllIncomingCalls();
  }

  @Get(':id')
  async getIncomingCallById(@Param('id', ParseIntPipe) id: number) {
    return this.incomingCallsService.getIncomingCallById(id);
  }

  @Post()
  async createIncomingCall(@Body() dto: CreateIncomingCallDto, @Req() req: any) {
    return this.incomingCallsService.createIncomingCall(dto, req.user.id);
  }

  @Post(':id/convert-to-client')
  async convertToClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertToClientDto,
  ) {
    return this.incomingCallsService.convertToClient(id, dto);
  }

  @Post(':id/convert-to-application')
  async convertToApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertToApplicationDto,
    @Req() req: any,
  ) {
    return this.incomingCallsService.convertToApplication(id, dto, req.user.id);
  }

  @Post(':id/notes')
  async updateNotes(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { notes: string },
  ) {
    return this.incomingCallsService.updateNotes(id, body.notes);
  }
}
