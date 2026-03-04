import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Req, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PerformerDocumentsService } from './performer-documents.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('performer-documents')
@UseGuards(AuthGuard('jwt'))
export class PerformerDocumentsController {
  constructor(private performerDocumentsService: PerformerDocumentsService) {}

  @Get('performer/:performerId')
  async getDocuments(@Param('performerId', ParseIntPipe) performerId: number) {
    return this.performerDocumentsService.getDocumentsByPerformerId(performerId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Недопустимый тип файла'), false);
      }
    },
  }))
  async uploadDocument(@Req() req: any, @Body('performerId') performerId: string, @Body('description') description: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Файл не загружен');
    return this.performerDocumentsService.uploadDocument(req.user.id, parseInt(performerId, 10), file, description);
  }

  @Get(':id/download')
  async downloadDocument(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    const { buffer, originalName, mimeType } = await this.performerDocumentsService.downloadDocument(id, req.user.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.send(buffer);
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.performerDocumentsService.deleteDocument(id);
  }

  @Post(':id/verify')
  async verifyDocument(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.performerDocumentsService.verifyDocument(id, req.user.id);
  }

  @Post(':id/unverify')
  async unverifyDocument(@Param('id', ParseIntPipe) id: number) {
    return this.performerDocumentsService.unverifyDocument(id);
  }
}
