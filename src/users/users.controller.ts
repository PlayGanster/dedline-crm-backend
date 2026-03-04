import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from '../logs/logs.service';
import { EventsGateway } from '../gateway/events.gateway';
import { AvatarUploadService } from '../avatar-upload/avatar-upload.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private usersService: UsersService,
    private logsService: LogsService,
    private eventsGateway: EventsGateway,
    private avatarUploadService: AvatarUploadService,
  ) {}

  @Get()
  async getAllUsers() {
    const users = await this.usersService.getAllUsers();
    console.log('[Users] Get all users:', users.length);
    users.forEach(u => {
      console.log(`[Users] User ${u.id}: avatar =`, u.avatar ? `${u.avatar.substring(0, 50)}...` : 'null');
    });
    return users;
  }

  @Get('me')
  async getCurrentUser(@Req() req: any) {
    return this.usersService.findByEmail(req.user.email);
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    console.log('[Users] Delete user:', id);

    const deletedUser = await this.usersService.deleteUser(id);

    // Отправляем событие удалённому пользователю чтобы его выкинуло
    this.eventsGateway.sendToUser(id, 'force-logout', {
      reason: 'Ваш аккаунт был удалён администратором',
    });

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
      description: `Пользователь ${deletedUser.last_name} ${deletedUser.first_name} удалён из системы`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        deletedUserId: id,
        deletedUserEmail: deletedUser.email,
      },
    });

    return { message: 'Пользователь успешно удалён' };
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    const user = await this.usersService.createUser(createUserDto);

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      description: `Создан новый пользователь ${user.last_name} ${user.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email: user.email, role: user.role },
    });

    return user;
  }

  // Специфичные маршруты должны быть ВЫШЕ параметризованных
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user.id;

    console.log('[Users] Update profile:', userId, updateUserDto);
    if (updateUserDto.avatar) {
      console.log('[Users] Avatar length:', updateUserDto.avatar.length);
    }

    const user = await this.usersService.updateUser(userId, updateUserDto);

    await this.logsService.createLog({
      userId,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: userId,
      description: `Пользователь обновил свой профиль`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar: user.avatar ? 'present' : 'absent',
      },
    });

    return user;
  }

  @Put('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        const filename = `avatar-${uniqueSuffix}${ext}`;
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
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    const userId = req.user.id;

    try {
      // Получаем старую аватарку пользователя
      const oldUser = await this.usersService.findById(userId);

      // Если есть старая аватарка, удаляем её
      if (oldUser?.avatar) {
        const oldFilename = this.avatarUploadService.extractFilenameFromUrl(oldUser.avatar);
        if (oldFilename) {
          this.avatarUploadService.deleteAvatar(oldFilename);
        }
      }

      // Сохраняем новую аватарку
      const avatarUrl = this.avatarUploadService.getAvatarUrl(file.filename);
      console.log('[Users] New avatar URL:', avatarUrl);

      // Обновляем пользователя с новым аватаром
      const user = await this.usersService.updateUser(userId, { avatar: avatarUrl });

      await this.logsService.createLog({
        userId,
        action: 'PROFILE_UPDATED',
        entity: 'User',
        entityId: userId,
        description: `Пользователь загрузил новую аватарку`,
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
      console.error('[Users] Upload avatar error:', error);
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any
  ) {
    console.log('[Users] Update user:', id, updateUserDto);

    // Получаем текущего пользователя до обновления
    const oldUser = await this.usersService.findById(id);
    console.log('[Users] Old user is_active:', oldUser?.is_active);

    const user = await this.usersService.updateUser(id, updateUserDto);
    console.log('[Users] New user is_active:', user.is_active);

    // Если пользователя заблокировали (is_active changed from true to false)
    if (oldUser?.is_active && user.is_active === false) {
      console.log('[Users] User blocked, sending force-logout:', id);
      this.eventsGateway.sendToUser(id, 'force-logout', {
        reason: 'Ваш аккаунт был заблокирован администратором',
      });
      console.log('[Users] force-logout sent');
    } else {
      console.log('[Users] No force-logout needed:', {
        oldUserIsActive: oldUser?.is_active,
        newUserIsActive: user.is_active
      });
    }

    await this.logsService.createLog({
      userId: req.user.id,
      action: 'PROFILE_UPDATED',
      entity: 'User',
      entityId: id,
      description: `Администратор обновил данные пользователя ${user.last_name} ${user.first_name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        targetUserId: id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
      },
    });

    return user;
  }
}
