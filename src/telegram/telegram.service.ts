import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        this.logger.log('Message sent to Telegram');
        return true;
      } else {
        this.logger.error(`Telegram API error: ${result.description}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send message to Telegram: ${error.message}`);
      return false;
    }
  }

  async sendPhotoWithCaption(photo: Buffer, caption: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('chat_id', this.chatId);
      formData.append('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'error-screenshot.jpg');
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const response = await fetch(`${this.apiUrl}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.ok) {
        this.logger.log('Photo sent to Telegram');
        return true;
      } else {
        this.logger.error(`Telegram API error: ${result.description}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send photo to Telegram: ${error.message}`);
      return false;
    }
  }

  async sendErrorReport(data: {
    description: string;
    page: string;
    url: string;
    userAgent: string;
    timestamp: string;
    screenshot?: Buffer;
    user?: {
      id: number;
      email: string;
      name: string;
    };
  }): Promise<boolean> {
    const message = this.formatErrorMessage(data);
    
    if (data.screenshot) {
      return this.sendPhotoWithCaption(data.screenshot, message);
    } else {
      return this.sendMessage(message);
    }
  }

  private formatErrorMessage(data: any): string {
    let message = `🚨 <b>Новая ошибка в CRM</b>\n\n`;
    
    if (data.user) {
      message += `👤 <b>Пользователь:</b> ${this.escapeHtml(data.user.name)} (${this.escapeHtml(data.user.email)})\n`;
      message += `🔖 <b>ID:</b> ${data.user.id}\n\n`;
    }
    
    message += `📄 <b>Страница:</b> ${this.escapeHtml(data.page)}\n`;
    message += `🔗 <b>URL:</b> ${this.escapeHtml(data.url)}\n`;
    message += `📝 <b>Описание:</b> ${this.escapeHtml(data.description)}\n`;
    message += `🖥 <b>Браузер:</b> ${this.extractBrowser(data.userAgent)}\n`;
    message += `📅 <b>Дата:</b> ${data.timestamp}`;
    
    return message.trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
}
