import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClientDocumentsService } from './client-documents.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('client-documents')
@UseGuards(AuthGuard('jwt'))
export class ClientDocumentsController {
  constructor(private clientDocumentsService: ClientDocumentsService) {}

  @Get('client/:clientId')
  async getDocumentsByClientId(
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    return this.clientDocumentsService.getDocumentsByClientId(clientId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      // Разрешаем только определённые типы файлов
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Недопустимый тип файла'), false);
      }
    },
  }))
  async uploadDocument(
    @Req() req: any,
    @Body('clientId') clientId: string,
    @Body('description') description: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const userId = req.user.id;
    return this.clientDocumentsService.uploadDocument(
      userId,
      parseInt(clientId, 10),
      file,
      description,
    );
  }

  @Get(':id/download')
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const { buffer, originalName, mimeType } =
      await this.clientDocumentsService.downloadDocument(id, userId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );
    res.send(buffer);
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDocumentsService.deleteDocument(id);
  }

  @Post(':id/verify')
  async verifyDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.clientDocumentsService.verifyDocument(id, userId);
  }

  @Post(':id/unverify')
  async unverifyDocument(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientDocumentsService.unverifyDocument(id);
  }
}
