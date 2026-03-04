import { Module } from '@nestjs/common';
import { AvatarUploadService } from './avatar-upload.service';

@Module({
  providers: [AvatarUploadService],
  exports: [AvatarUploadService],
})
export class AvatarUploadModule {}
