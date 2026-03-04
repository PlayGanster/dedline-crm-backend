import { Injectable } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ErrorReportService {
  constructor(private telegramService: TelegramService) {}

  async submitErrorReport(data: {
    description: string;
    page: string;
    url: string;
    userAgent: string;
    timestamp: string;
    screenshot?: string;
    user?: {
      id: number;
      email: string;
      name: string;
    };
  }): Promise<boolean> {
    let screenshotBuffer: Buffer | undefined;

    if (data.screenshot) {
      // Convert base64 to buffer
      const base64Data = data.screenshot.split(',')[1] || data.screenshot;
      screenshotBuffer = Buffer.from(base64Data, 'base64');
    }

    return this.telegramService.sendErrorReport({
      description: data.description,
      page: data.page,
      url: data.url,
      userAgent: data.userAgent,
      timestamp: data.timestamp,
      screenshot: screenshotBuffer,
      user: data.user,
    });
  }
}
