import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PerformersService } from './performers.service';
import { CreatePerformerDto } from './dto/create-performer.dto';
import { UpdatePerformerDto } from './dto/update-performer.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';
import { AvatarUploadService } from '../avatar-upload/avatar-upload.service';
import { PrismaService } from '../database/prisma.service';

@Controller('performers')
@UseGuards(AuthGuard('jwt'))
export class PerformersController {
  constructor(
    private performersService: PerformersService,
    private logsService: LogsService,
    private avatarUploadService: AvatarUploadService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getAllPerformers() {
    return this.performersService.getAllPerformers();
  }

  @Get(':id')
  async getPerformerById(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.getPerformerById(id);
  }

  @Get(':id/passport')
  async getPerformerPassportData(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.getPerformerPassportData(id);
  }

  @Post()
  async createPerformer(@Body() createPerformerDto: CreatePerformerDto, @Req() req: any) {
    const performer = await this.performersService.createPerformer(createPerformerDto, req.user.id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_CREATED',
      entity: 'Performer',
      entityId: performer.id,
      description: `Создан новый исполнитель: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
        source: performer.source,
      },
    });

    return performer;
  }

  @Put(':id')
  async updatePerformer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePerformerDto: UpdatePerformerDto,
    @Req() req: any,
  ) {
    const performer = await this.performersService.updatePerformer(id, updatePerformerDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_UPDATED',
      entity: 'Performer',
      entityId: id,
      description: `Обновлены данные исполнителя: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
      },
    });

    return performer;
  }

  @Delete(':id')
  async deletePerformer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const performer = await this.performersService.getPerformerById(id);

    await this.performersService.deletePerformer(id);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PERFORMER_DELETED',
      entity: 'Performer',
      entityId: id,
      description: `Удалён исполнитель: ${performer.last_name} ${performer.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        email: performer.email,
        phone: performer.phone,
      },
    });

    return { message: 'Исполнитель успешно удалён' };
  }

  @Post(':id/verify')
  async verifyPerformer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.performersService.updatePerformer(id, { is_verified: true } as any);
  }

  @Post(':id/unverify')
  async unverifyPerformer(@Param('id', ParseIntPipe) id: number) {
    return this.performersService.updatePerformer(id, { is_verified: false } as any);
  }

  @Get(':id/notes')
  async getPerformerNotes(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.performerNote.findMany({
      where: { performerId: id },
      include: {
        user: { select: { id: true, first_name: true, last_name: true, avatar: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  @Put(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `performer-${uniqueSuffix}${ext}`;
        cb(null, filename);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        return cb(new Error('Только изображения (JPEG, PNG, GIF, WebP)'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    console.log('[Performers] Upload avatar request received for performer:', id);
    console.log('[Performers] File:', file?.filename, file?.size, file?.mimetype);
    try {
      // Получаем старого исполнителя
      const oldPerformer = await this.performersService.getPerformerById(id);

      // Если есть старая аватарка, удаляем её
      if (oldPerformer?.avatar) {
        const oldFilename = this.avatarUploadService.extractFilenameFromUrl(oldPerformer.avatar);
        if (oldFilename) {
          this.avatarUploadService.deleteAvatar(oldFilename);
        }
      }

      // Сохраняем новую аватарку
      const avatarUrl = this.avatarUploadService.getAvatarUrl(file.filename);

      // Обновляем исполнителя с новым аватаром
      const performer = await this.performersService.updatePerformer(id, { avatar: avatarUrl } as any);

      await this.logsService.createLog({
        userId: req.user.id,
        action: 'PERFORMER_UPDATED',
        entity: 'Performer',
        entityId: id,
        description: `Загружена новая аватарка для исполнителя: ${performer.last_name} ${performer.first_name}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          avatar: avatarUrl,
          filename: file.filename,
          size: file.size,
        },
      });

      return {
        message: 'Аватарка успешно загружена',
        avatar: avatarUrl,
      };
    } catch (error) {
      console.error('[Performers] Upload avatar error:', error);
      throw error;
    }
  }
}
