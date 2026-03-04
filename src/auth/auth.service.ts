import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return null;
    }
    
    if (!user.is_active) {
      throw new UnauthorizedException('Ваш аккаунт заблокирован. Обратитесь к администратору.');
    }
    
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        secret_code: user.secret_code,
      },
    };
  }

  async requestResetPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    // Generate 6-digit code
    const code = randomBytes(3).toString('hex').slice(0, 6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    await this.prisma.resetPasswordToken.create({
      data: {
        email,
        code,
        expires_at: expiresAt,
      },
    });

    // In production, send email here
    // For now, log the code (remove in production!)
    console.log(`Reset password code for ${email}: ${code}`);

    return { message: 'Код сброса пароля отправлен на почту' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const token = await this.prisma.resetPasswordToken.findFirst({
      where: {
        email,
        code,
        used: false,
      },
    });

    if (!token) {
      throw new BadRequestException('Неверный код сброса пароля');
    }

    if (new Date(token.expires_at) < new Date()) {
      throw new BadRequestException('Срок действия кода истёк');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.resetPasswordToken.update({
      where: { id: token.id },
      data: { used: true },
    });

    return { message: 'Пароль успешно изменён' };
  }

  /**
   * Генерирует новый secret_code для пользователя
   */
  async generateSecretCode(userId: number): Promise<string> {
    const secretCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { secret_code: secretCode },
    });

    return secretCode;
  }

  /**
   * Проверяет secret_code пользователя
   */
  async verifySecretCode(userId: number, secretCode: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { secret_code: true },
    });

    return user?.secret_code === secretCode;
  }
}
