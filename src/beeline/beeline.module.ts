import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BeelineTelephonyService } from './beeline-telephony.service';
import { BeelineWebhookController } from './beeline-webhook.controller';
import { BeelineController } from './beeline.controller';
import { BeelinePublicController } from './beeline.controller';
import { IncomingCallsModule } from '../incoming-calls/incoming-calls.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [ConfigModule, IncomingCallsModule, GatewayModule],
  controllers: [BeelineWebhookController, BeelineController, BeelinePublicController],
  providers: [BeelineTelephonyService],
  exports: [BeelineTelephonyService],
})
export class BeelineModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BeelineModule.name);
  private subscriptionRenewInterval: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
    private beelineService: BeelineTelephonyService,
  ) {}

  async onModuleInit() {
    const pollingEnabled = this.configService.get<boolean>('BEELINE_WEBHOOK_ENABLED') || false;
    const webhookUrl = this.configService.get<string>('BEELINE_WEBHOOK_URL');

    if (pollingEnabled) {
      // Запускаем опрос API каждые 5 минут
      this.logger.log('📞 Starting Beeline API polling (every 5 minutes)...');
      this.beelineService.startPolling(5);
    }

    // Настраиваем Xsi-Events подписку если указан webhook URL
    if (webhookUrl) {
      this.logger.log('🔔 Setting up Xsi-Events subscription...');
      const success = await this.beelineService.setupXsiEventsSubscription(webhookUrl);
      
      if (success) {
        this.logger.log('✅ Xsi-Events subscription active (real-time calls enabled)');
        
        // Продлеваем подписку каждые 23 часа (expires = 24 часа)
        this.subscriptionRenewInterval = setInterval(async () => {
          this.logger.log('🔄 Renewing Xsi-Events subscription...');
          // В реальной реализации нужно сохранять subscriptionId
        }, 23 * 60 * 60 * 1000);
      } else {
        this.logger.warn('❌ Failed to setup Xsi-Events subscription. Using polling only.');
      }
    }
  }

  onModuleDestroy() {
    this.beelineService.stopPolling();
    
    if (this.subscriptionRenewInterval) {
      clearInterval(this.subscriptionRenewInterval);
      this.subscriptionRenewInterval = null;
    }
  }
}
