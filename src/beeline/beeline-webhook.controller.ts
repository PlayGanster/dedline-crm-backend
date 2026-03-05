import { Controller, Post, Body, Logger } from '@nestjs/common';
import { BeelineTelephonyService } from './beeline-telephony.service';

/**
 * Webhook контроллер для получения Xsi-Events от Билайн
 * POST /api/beeline/webhook
 */
@Controller('beeline/webhook')
export class BeelineWebhookController {
  private readonly logger = new Logger(BeelineWebhookController.name);

  constructor(private beelineService: BeelineTelephonyService) {}

  /**
   * Webhook endpoint для получения событий от Билайн (Xsi-Events)
   * Билайн отправляет события в реальном времени при звонках
   */
  @Post()
  async handleWebhook(@Body() event: any) {
    this.logger.log(`📞 Received Xsi-Event from Beeline: ${JSON.stringify(event)}`);

    try {
      // Преобразуем событие Билайн в наш формат
      const callEvent = this.parseXsiEvent(event);
      
      if (!callEvent) {
        this.logger.warn('Invalid event format, skipping');
        return { success: false, error: 'Invalid event format' };
      }

      this.logger.log(`Processing call event: ${JSON.stringify(callEvent)}`);
      
      // Обрабатываем событие — создаём/обновляем звонок
      await this.beelineService.handleXsiEvent(callEvent);

      this.logger.log(`✅ Xsi-Event processed successfully`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Парсинг Xsi-Event от Билайн
   */
  private parseXsiEvent(event: any): any {
    if (!event) return null;

    // Формат Xsi-Events от Билайн
    const direction = event.direction || event.callDirection;
    const isIncoming = direction === 'INBOUND' || direction === 'inbound' || 
                       direction === 'INCOMING' || direction === 'incoming';

    return {
      callId: event.callId || event.id || `call-${Date.now()}`,
      phoneNumber: event.from || event.fromNumber || event.callingPartyNumber,
      calledNumber: event.to || event.toNumber || event.calledPartyNumber,
      startTime: event.startTime || event.start || new Date().toISOString(),
      endTime: event.endTime || event.end,
      duration: event.duration || event.callDuration,
      status: this.mapXsiStatus(event.status || event.callStatus),
      direction: isIncoming ? 'INBOUND' : 'OUTBOUND',
      recordingUrl: event.recordingUrl || event.recording,
      abonent: event.abonent || event.subscriber,
      rawEvent: event,
    };
  }

  /**
   * Маппинг статусов Xsi-Events
   */
  private mapXsiStatus(status: string): string {
    if (!status) return 'INCOMING';
    
    const s = status.toUpperCase();
    
    switch (s) {
      case 'ALERTING':
      case 'RINGING':
        return 'RINGING';
      case 'ESTABLISHED':
      case 'ANSWERED':
      case 'CONNECTED':
        return 'ANSWERED';
      case 'COMPLETED':
      case 'DISCONNECTED':
        return 'ANSWERED';
      case 'FAILED':
      case 'REJECTED':
      case 'NOANSWER':
        return 'MISSED';
      default:
        return 'INCOMING';
    }
  }
}
