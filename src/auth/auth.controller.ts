import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto, RequestResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      // Log failed login attempt
      await this.logsService.createLog({
        userId: null,
        action: 'LOGIN_FAILED',
        entity: 'User',
        description: `Неудачная попытка входа для ${loginDto.email}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { email: loginDto.email },
      });
      throw new UnauthorizedException('Неверная почта или пароль');
    }
    
    // Log successful login
    await this.logsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: `Пользователь ${user.last_name} ${user.first_name} вошёл в систему`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: any) {
    const user = await this.usersService.findByEmail(req.user.email);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    return user;
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const userId = req.user.id;
    const user = await this.usersService.findById(userId);
    
    // Log logout
    if (user) {
      await this.logsService.createLog({
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        description: `Пользователь ${user.last_name} ${user.first_name} вышел из системы`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return { message: 'Выход из системы выполнен' };
  }

  @Post('generate-secret-code')
  @UseGuards(AuthGuard('jwt'))
  async generateSecretCode(@Req() req: any) {
    const userId = req.user.id;
    const secretCode = await this.authService.generateSecretCode(userId);
    
    await this.logsService.createLog({
      userId,
      action: 'SECRET_CODE_GENERATED',
      entity: 'User',
      entityId: userId,
      description: `Сгенерирован новый секретный код для пользователя`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    return { secret_code: secretCode };
  }

  @Post('verify-secret-code')
  @UseGuards(AuthGuard('jwt'))
  async verifySecretCode(@Req() req: any, @Body() body: { secret_code: string }) {
    const userId = req.user.id;
    const isValid = await this.authService.verifySecretCode(userId, body.secret_code);
    return { valid: isValid };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Req() req: any, @Body() body: { secret_code: string; new_password: string }) {
    const userId = req.user.id;
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // Проверяем secret_code
    if (user.secret_code !== body.secret_code) {
      throw new BadRequestException('Неверный секретный код');
    }

    // Хэшируем новый пароль и обновляем напрямую через Prisma
    const hashedPassword = await bcrypt.hash(body.new_password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log password change
    await this.logsService.createLog({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      description: `Пользователь изменил свой пароль`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Пароль успешно изменён' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { secret_code: string; new_password: string }, @Req() req: any) {
    // Находим пользователя по secret_code
    const user = await this.prisma.user.findFirst({
      where: { secret_code: body.secret_code },
    });

    if (!user) {
      throw new BadRequestException('Неверный секретный код');
    }

    // Хэшируем новый пароль
    const hashedPassword = await bcrypt.hash(body.new_password, 10);

    // Обновляем пароль
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log password reset
    await this.logsService.createLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      description: `Пароль сброшен через secret_code`,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    return { message: 'Пароль успешно изменён' };
  }
}
