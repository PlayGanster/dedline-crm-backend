import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LogsModule } from '../logs/logs.module';
import { AvatarUploadModule } from '../avatar-upload/avatar-upload.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [LogsModule, AvatarUploadModule, GatewayModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
