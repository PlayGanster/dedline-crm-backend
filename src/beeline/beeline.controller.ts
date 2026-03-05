import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { BeelineTelephonyService } from './beeline-telephony.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('beeline')
@UseGuards(AuthGuard('jwt'))
export class BeelineController {
  private readonly logger = new Logger(BeelineController.name);

  constructor(private beelineService: BeelineTelephonyService) {}

  /**
   * Принудительный опрос API Билайн
   * POST /api/beeline/fetch
   */
  @Post('fetch')
  async fetchCalls(@Body() body?: { lastMinutes?: number }) {
    const lastMinutes = body?.lastMinutes || 60;
    this.logger.log(`Fetching calls for last ${lastMinutes} minutes`);
    await this.beelineService.fetchCalls(lastMinutes);
    return {
      success: true,
      message: `Запрошены звонки за последние ${lastMinutes} мин. Проверьте логи backend.`,
    };
  }

  /**
   * Очистка кэша обработанных звонков
   * POST /api/beeline/clear-cache
   */
  @Post('clear-cache')
  async clearCache() {
    this.logger.log('Clearing processed calls cache');
    this.beelineService.clearProcessedCallsCache();
    return {
      success: true,
      message: 'Кэш обработанных звонков очищен',
    };
  }

  /**
   * Статус опроса
   * GET /api/beeline/status
   */
  @Get('status')
  async getStatus() {
    return {
      polling: true,
      interval: '5 minutes',
      message: 'Опрос API Билайн активен',
    };
  }

  /**
   * Настройка подписки на Xsi-Events
   * POST /api/beeline/subscribe
   */
  @Post('subscribe')
  async subscribe(@Body() body: { webhookUrl?: string }) {
    const webhookUrl = body.webhookUrl || 'https://your-domain.ru/api/beeline/webhook';
    this.logger.log(`Setting up subscription to: ${webhookUrl}`);
    
    const success = await this.beelineService.setupXsiEventsSubscription(webhookUrl);
    
    return {
      success,
      message: success ? 'Подписка создана' : 'Ошибка при создании подписки',
    };
  }

  /**
   * Проверка подписки
   * GET /api/beeline/subscription
   */
  @Get('subscription')
  async checkSubscription() {
    const subscription = await this.beelineService.checkSubscription();
    return {
      active: !!subscription,
      subscription,
    };
  }

  /**
   * Отмена подписки
   * DELETE /api/beeline/subscribe
   */
  @Post('unsubscribe')
  async unsubscribe(@Body() body: { subscriptionId?: string }) {
    if (!body.subscriptionId) {
      return { success: false, error: 'subscriptionId required' };
    }
    
    const success = await this.beelineService.cancelSubscription(body.subscriptionId);
    return {
      success,
      message: success ? 'Подписка отменена' : 'Ошибка при отмене подписки',
    };
  }
}

/**
 * Контроллер для отладки (без авторизации)
 */
@Controller('beeline-public')
export class BeelinePublicController {
  private readonly logger = new Logger(BeelinePublicController.name);

  constructor(private beelineService: BeelineTelephonyService) {}

  /**
   * Тест API Билайн (без авторизации)
   * GET /api/beeline-public/test
   */
  @Get('test')
  async testApi() {
    this.logger.log('Testing Beeline API...');
    
    try {
      const calls = await (this.beelineService as any).fetchCallHistory(60);
      
      const incomingCalls = calls.filter((c: any) => {
        const dir = (c.direction || '').toUpperCase();
        return dir === 'INBOUND' || dir === 'INCOMING';
      });
      
      return {
        success: true,
        totalCalls: calls.length,
        incomingCalls: incomingCalls.length,
        sample: incomingCalls.slice(0, 3),
        message: incomingCalls.length > 0 ? 'Найдены входящие звонки!' : 'Входящих звонков нет',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Принудительный опрос (без авторизации)
   * POST /api/beeline-public/fetch
   */
  @Post('fetch')
  async fetchCalls() {
    this.logger.log('Force fetching calls...');
    await this.beelineService.fetchCalls(60);
    return { success: true, message: 'Проверьте логи backend' };
  }
}
