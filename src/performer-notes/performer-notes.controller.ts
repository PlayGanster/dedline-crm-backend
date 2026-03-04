import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { PerformerNotesService } from './performer-notes.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('performer-notes')
@UseGuards(AuthGuard('jwt'))
export class PerformerNotesController {
  constructor(private performerNotesService: PerformerNotesService) {}

  @Get('performer/:performerId')
  async getNotes(@Param('performerId', ParseIntPipe) performerId: number) {
    return this.performerNotesService.getNotesByPerformerId(performerId);
  }

  @Post()
  async createNote(@Req() req: any, @Body() body: { performerId: number; content: string }) {
    return this.performerNotesService.createNote(req.user.id, body.performerId, body.content);
  }

  @Put(':id')
  async updateNote(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: { content: string }) {
    return this.performerNotesService.updateNote(id, req.user.id, body.content);
  }

  @Delete(':id')
  async deleteNote(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.performerNotesService.deleteNote(id, req.user.id);
  }
}
