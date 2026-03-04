import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar: true,
        phone: true,
        secret_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
    return user;
  }

  async findByIdWithPassword(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar: true,
        phone: true,
        secret_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
    return user;
  }

  async findByEmailWithPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async createUser(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Генерируем секретный код
    const secretCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        secret_code: secretCode,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar: true,
        phone: true,
        secret_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
    return user;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar: true,
        phone: true,
        secret_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
    return users;
  }

  async updateUser(id: number, data: any) {
    // Удаляем password из данных, если есть (для безопасности)
    const { password, ...updateData } = data;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar: true,
        phone: true,
        secret_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
    return user;
  }

  async deleteUser(id: number) {
    const deletedUser = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });
    return deletedUser;
  }
}
