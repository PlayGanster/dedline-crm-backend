import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ClientNotesService } from './client-notes.service';
import { CreateClientNoteDto } from './dto/create-client-note.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('client-notes')
@UseGuards(AuthGuard('jwt'))
export class ClientNotesController {
  constructor(private clientNotesService: ClientNotesService) {}

  @Get('client/:clientId')
  async getNotesByClientId(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.clientNotesService.getNotesByClientId(clientId);
  }

  @Post()
  async createNote(@Req() req: any, @Body() createNoteDto: CreateClientNoteDto) {
    const userId = req.user.id;
    return this.clientNotesService.createNote(userId, createNoteDto);
  }

  @Put(':id')
  async updateNote(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: { content: string }) {
    const userId = req.user.id;
    return this.clientNotesService.updateNote(id, userId, body.content);
  }

  @Delete(':id')
  async deleteNote(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.clientNotesService.deleteNote(id, userId);
  }
}
