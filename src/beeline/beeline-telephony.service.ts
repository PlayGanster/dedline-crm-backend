import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingCallsService } from '../incoming-calls/incoming-calls.service';

export interface BeelineCall {
  id: string;
  from: string;
  to: string;
  start: string;
  end?: string;
  duration?: number;
  status?: string;
  direction?: string;
  recording?: string;
}

@Injectable()
export class BeelineTelephonyService {
  private readonly logger = new Logger(BeelineTelephonyService.name);
  private readonly apiKey: string;
  private readonly pollingEnabled: boolean;
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedCallIds: Set<string> = new Set();

  constructor(
    private configService: ConfigService,
    private incomingCallsService: IncomingCallsService,
  ) {
    this.apiKey = this.configService.get<string>('BEELINE_API_KEY') || '';
    this.pollingEnabled = this.configService.get<boolean>('BEELINE_WEBHOOK_ENABLED') || false;

    if (!this.apiKey && this.pollingEnabled) {
      this.logger.warn('Beeline API key not configured. Polling will not work.');
    }
  }

  /**
   * Получение истории звонков
   * GET /apis/portal/statistics
   */
  async fetchCalls(lastMinutes: number = 60): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('Beeline API key not configured. Skipping call fetch.');
      return;
    }

    try {
      // Очищаем кэш перед новым импортом - импортируем ВСЕ звонки
      this.processedCallIds.clear();
      this.logger.log('Cleared processed calls cache');
      
      // Получаем историю звонков из API Билайн
      const calls = await this.fetchCallHistory(lastMinutes);
      this.logger.log(`📞 Fetched ${calls.length} total calls from Beeline API`);

      let createdCount = 0;
      let incomingCount = 0;
      
      // Обрабатываем каждый звонок
      for (const call of calls) {
        const direction = (call.direction || '').toUpperCase();
        if (direction === 'INBOUND' || direction === 'INCOMING') {
          incomingCount++;
          const beforeCount = await this.countIncomingCalls();
          await this.processCall(call, null);
          const afterCount = await this.countIncomingCalls();
          if (afterCount > beforeCount) {
            createdCount++;
          }
        }
      }
      
      this.logger.log(`✅ Import complete: ${incomingCount} incoming calls, ${createdCount} created in CRM`);
    } catch (error) {
      this.logger.error(`Error fetching calls: ${error.message}`);
    }
  }

  /**
   * Подсчет количества звонков в БД
   */
  private async countIncomingCalls(): Promise<number> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const count = await prisma.incomingCall.count();
      await prisma.$disconnect();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Получение истории звонков
   * GET /apis/portal/statistics
   * Параметры: dateFrom, dateTo (формат DD.MM.YYYY), page, pageSize (10-100)
   */
  private async fetchCallHistory(lastMinutes: number): Promise<any[]> {
    try {
      // Билайн API лучше работает без параметров даты - возвращает последние звонки
      const url = `https://cloudpbx.beeline.ru/apis/portal/statistics?page=0&pageSize=100`;
      this.logger.log(`Fetching calls: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Beeline API error: ${response.status} - ${errorText}`);
        return [];
      }

      const data = await response.json();
      this.logger.log(`✅ Got ${Array.isArray(data) ? data.length : 'unknown'} calls`);
      
      // Билайн возвращает массив звонков
      if (Array.isArray(data)) {
        return data;
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error fetching call history: ${error.message}`);
      return [];
    }
  }

  /**
   * Получение звонков без параметров даты (фолбэк)
   */
  private async fetchCallsWithoutDates(): Promise<any[]> {
    return this.fetchCallHistory(60);
  }

  /**
   * Получение звонков через список абонентов (фолбэк)
   */
  private async fetchCallsViaAbonents(): Promise<any[]> {
    try {
      this.logger.log('Fetching abonents list...');
      const abonents = await this.fetchAbonents();
      this.logger.log(`Found ${abonents.length} abonents`);
      
      if (abonents.length === 0) {
        this.logger.warn('No abonents found');
        return [];
      }
      
      const allCalls: any[] = [];

      // Пробуем получить звонки для каждого абонента
      for (const abonent of abonents.slice(0, 20)) {
        const abonentCalls = await this.fetchAbonentCalls(abonent);
        if (abonentCalls && abonentCalls.length > 0) {
          this.logger.log(`Found ${abonentCalls.length} calls for abonent ${abonent.phone || abonent.extension}`);
          allCalls.push(...abonentCalls);
        }
      }

      this.logger.log(`Total calls found: ${allCalls.length}`);
      return allCalls;
    } catch (error) {
      this.logger.error(`Error fetching calls via abonents: ${error.message}`);
      return [];
    }
  }

  /**
   * Получение звонков конкретного абонента
   */
  private async fetchAbonentCalls(abonent: any): Promise<any[]> {
    try {
      const abonentId = abonent.userId || abonent.id || abonent.extension;
      const phone = abonent.phone || abonent.phoneNumber;
      
      if (!abonentId) {
        this.logger.warn(`No ID for abonent: ${JSON.stringify(abonent)}`);
        return [];
      }

      const now = new Date();
      const past = new Date(now.getTime() - 60 * 60 * 1000); // 1 час
      
      const startDate = past.toISOString().replace(/\.\d{3}Z$/, 'Z');
      const endDate = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

      // Пробуем разные endpoints для получения звонков абонента
      const urlsToTry = [
        `https://cloudpbx.beeline.ru/apis/portal/statistics?userId=${abonentId}&startDate=${startDate}&endDate=${endDate}&limit=50`,
        `https://cloudpbx.beeline.ru/apis/portal/abonents/${encodeURIComponent(abonentId)}/calls?limit=50`,
        `https://cloudpbx.beeline.ru/apis/portal/v2/statistics?userId=${abonentId}&limit=50`,
      ];

      for (const url of urlsToTry) {
        try {
          this.logger.log(`Trying: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-MPBX-API-AUTH-TOKEN': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            this.logger.log(`✅ Success for ${phone || abonentId}: ${Array.isArray(data) ? data.length : 'unknown'} records`);
            
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.calls)) return data.calls;
            if (data && Array.isArray(data.items)) return data.items;
            if (data && Array.isArray(data.records)) return data.records;
            if (data && Array.isArray(data.data)) return data.data;
            
            return [];
          }
          
          const errorText = await response.text();
          this.logger.warn(`Failed ${response.status}: ${errorText.substring(0, 100)}`);
        } catch (err) {
          this.logger.warn(`Request failed: ${err.message}`);
        }
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error fetching abonent calls: ${error.message}`);
      return [];
    }
  }

  /**
   * Получение списка абонентов
   * GET /apis/portal/abonents
   */
  private async fetchAbonents(): Promise<any[]> {
    try {
      const response = await fetch('https://cloudpbx.beeline.ru/apis/portal/abonents', {
        method: 'GET',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Beeline API error: ${response.status} - ${errorText}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.logger.error(`Error fetching abonents: ${error.message}`);
      return [];
    }
  }

  /**
   * Обработка одного звонка
   */
  private async processCall(call: any, abonent: any): Promise<void> {
    try {
      const callId = call.id || call.callId || call.uuid || `${call.startDate}-${call.phone}`;
      
      // Пропускаем уже обработанные звонки
      if (this.processedCallIds.has(callId)) {
        return;
      }

      // Определяем направление - нам нужны только входящие
      const direction = call.direction || call.type;
      if (direction !== 'inbound' && direction !== 'INBOUND' && direction !== 'incoming' && direction !== 'INCOMING') {
        return;
      }

      // Определяем номер звонящего
      const fromNumber = call.phone || call.phoneNumber || call.from || call.caller;
      if (!fromNumber) {
        this.logger.warn(`Call ${callId} has no phone number`);
        return;
      }

      this.logger.log(`Processing incoming call from ${fromNumber}, callId: ${callId}`);

      // Находим CRM пользователя по номеру абонента (кто принял звонок)
      const abonentInfo = call.abonent || abonent;
      const crmUserId = await this.findCrmUserByAbonent(abonentInfo);
      
      if (crmUserId) {
        // Длительность в секундах (Билайн возвращает в миллисекундах)
        const durationSeconds = call.duration ? Math.floor(call.duration / 1000) : 0;
        
        // Дата звонка из timestamp
        const callDate = new Date(call.startDate || 0);
        
        this.logger.log(`Creating call from ${fromNumber}, date: ${callDate.toISOString()}, userId: ${crmUserId}`);
        
        // Создаём звонок с правильной датой
        await this.incomingCallsService.createIncomingCallWithDate(
          {
            phone: fromNumber,
            duration: durationSeconds,
            recording_url: call.recording || call.recordingUrl || null,
            notes: `Звонок через Билайн API. Call ID: ${callId}, Status: ${call.status}`,
            external_call_id: callId,
            status: this.mapBeelineStatus(call.status),
            created_at: callDate, // Передаём дату звонка
          },
          crmUserId,
        );
        
        // Добавляем в обработанные
        this.processedCallIds.add(callId);
        this.logger.log(`✅ Created incoming call from ${fromNumber}`);
      } else {
        this.logger.warn(`No CRM user found for abonent: ${JSON.stringify(abonentInfo)}`);
      }
    } catch (error) {
      this.logger.error(`Error processing call: ${error.message}`);
    }
  }

  /**
   * Поиск CRM пользователя по данным абонента Билайн
   */
  private async findCrmUserByAbonent(abonent: any): Promise<number | null> {
    if (!abonent) return null;
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Получаем номер телефона или добавочный
      const phone = abonent.phone || abonent.phoneNumber;
      const extension = abonent.extension;
      const userId = abonent.userId;
      
      this.logger.log(`Looking for CRM user: phone=${phone}, extension=${extension}, userId=${userId}`);
      
      // Пробуем найти по номеру телефона (убираем +7 и первые цифры)
      if (phone) {
        // Очищаем номер от лишних символов
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Ищем пользователя с таким телефоном
        const userByPhone = await prisma.user.findFirst({
          where: {
            phone: {
              contains: cleanPhone.slice(-10), // Последние 10 цифр
            },
          },
          select: { id: true },
        });
        
        if (userByPhone) {
          this.logger.log(`Found user by phone: ${userByPhone.id}`);
          await prisma.$disconnect();
          return userByPhone.id;
        }
      }
      
      // Пробуем найти по добавочному номеру (extension)
      if (extension) {
        const userByExtension = await prisma.user.findFirst({
          where: {
            phone: {
              contains: extension,
            },
          },
          select: { id: true },
        });
        
        if (userByExtension) {
          this.logger.log(`Found user by extension: ${userByExtension.id}`);
          await prisma.$disconnect();
          return userByExtension.id;
        }
      }
      
      // Пробуем найти по userId (если он содержит email или что-то ещё)
      if (userId) {
        // Извлекаем номер из userId вида "9630085667@krg.ur.ims..."
        const userIdNumber = userId.split('@')[0];
        
        const userByUserId = await prisma.user.findFirst({
          where: {
            phone: {
              contains: userIdNumber,
            },
          },
          select: { id: true },
        });
        
        if (userByUserId) {
          this.logger.log(`Found user by userId: ${userByUserId.id}`);
          await prisma.$disconnect();
          return userByUserId.id;
        }
      }
      
      await prisma.$disconnect();
      
      // Если не нашли — возвращаем null (неизвестный пользователь)
      this.logger.log(`No CRM user found for this abonent`);
      return null;
    } catch (error) {
      this.logger.error(`Error finding CRM user: ${error.message}`);
      return null;
    }
  }

  /**
   * Маппинг статусов Билайн в наши статусы
   * Билайн статусы: RECIEVED, PLACED, MISSED, FAILED, и т.д.
   */
  private mapBeelineStatus(beelineStatus: string): 'INCOMING' | 'RINGING' | 'ANSWERED' | 'MISSED' {
    const status = beelineStatus?.toUpperCase();
    
    switch (status) {
      case 'RECIEVED':  // Опечатка в API Билайн
      case 'RECEIVED':
      case 'ANSWERED':
      case 'COMPLETED':
      case 'ESTABLISHED':
      case 'SUCCESS':
      case 'PLACED':  // Исходящий успешный
        return 'ANSWERED';
        
      case 'MISSED':
      case 'NO-ANSWER':
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
        return 'MISSED';
        
      case 'RINGING':
      case 'CALLING':
      case 'ALERTING':
      case 'INCOMING':
        return 'RINGING';
        
      default:
        return 'INCOMING';
    }
  }

  /**
   * Поиск активного пользователя CRM для привязки звонка
   */
  private async findActiveCrmUser(): Promise<number | null> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const user = await prisma.user.findFirst({
        where: { is_active: true },
        select: { id: true },
      });

      await prisma.$disconnect();

      if (user) {
        this.logger.log(`Found active user: ${user.id}`);
        return user.id;
      }

      this.logger.warn('No active users found in database');
      return null;
    } catch (error) {
      this.logger.error(`Error finding active user: ${error.message}`);
      return null;
    }
  }

  /**
   * Запуск периодического опроса API
   */
  startPolling(intervalMinutes: number = 5): void {
    if (!this.apiKey) {
      this.logger.warn('Cannot start polling: API key not configured');
      return;
    }

    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.logger.log(`📞 Starting Beeline API polling every ${intervalMinutes} minutes`);

    // Немедленный первый запуск
    this.fetchCalls(60);

    // Затем по расписанию
    this.pollingInterval = setInterval(() => {
      this.fetchCalls(intervalMinutes + 5); // Берём запас в 5 минут
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Остановка опроса
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('Stopped Beeline API polling');
    }
  }

  /**
   * Обработка Xsi-Event в реальном времени
   */
  async handleXsiEvent(event: any): Promise<void> {
    this.logger.log(`Handling Xsi-Event: ${JSON.stringify(event)}`);

    try {
      // Пропускаем исходящие звонки
      const direction = event.direction || '';
      if (direction !== 'INBOUND' && direction !== 'INCOMING') {
        this.logger.log('Skipping outbound call');
        return;
      }

      const callId = event.callId;
      
      // Пропускаем уже обработанные
      if (this.processedCallIds.has(callId)) {
        this.logger.log(`Call ${callId} already processed`);
        return;
      }

      // Находим пользователя по абоненту
      const abonentInfo = event.abonent;
      const crmUserId = await this.findCrmUserByAbonent(abonentInfo);

      if (crmUserId) {
        const durationSeconds = event.duration ? Math.floor(event.duration / 1000) : 0;
        const callDate = event.startTime ? new Date(event.startTime) : new Date();

        await this.incomingCallsService.createIncomingCallWithDate(
          {
            phone: event.phoneNumber,
            duration: durationSeconds,
            recording_url: event.recordingUrl || null,
            notes: `Xsi-Event. Call ID: ${callId}, Status: ${event.status}`,
            external_call_id: callId,
            status: event.status as any,
            created_at: callDate,
          },
          crmUserId,
        );

        this.processedCallIds.add(callId);
        this.logger.log(`✅ Created call from Xsi-Event: ${event.phoneNumber}`);
      } else {
        // Создаём звонок без пользователя (неизвестный)
        const durationSeconds = event.duration ? Math.floor(event.duration / 1000) : 0;
        const callDate = event.startTime ? new Date(event.startTime) : new Date();

        await this.incomingCallsService.createIncomingCallWithDate(
          {
            phone: event.phoneNumber,
            duration: durationSeconds,
            recording_url: event.recordingUrl || null,
            notes: `Xsi-Event. Call ID: ${callId}, Status: ${event.status}. Пользователь не найден`,
            external_call_id: callId,
            status: event.status as any,
            created_at: callDate,
          },
          null, // null = неизвестный пользователь
        );

        this.processedCallIds.add(callId);
        this.logger.log(`✅ Created call from Xsi-Event (unknown user): ${event.phoneNumber}`);
      }
    } catch (error) {
      this.logger.error(`Error handling Xsi-Event: ${error.message}`);
    }
  }

  /**
   * Очистка кэша обработанных звонков
   */
  clearProcessedCallsCache(): void {
    const oldSize = this.processedCallIds.size;
    this.processedCallIds.clear();
    this.logger.log(`Cleared ${oldSize} processed call IDs from cache`);
  }

  /**
   * Настройка подписки на Xsi-Events (Билайн)
   * PUT /apis/portal/subscription
   */
  async setupXsiEventsSubscription(webhookUrl: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Cannot setup Xsi-Events subscription: API key not configured');
      return false;
    }

    try {
      const url = 'https://cloudpbx.beeline.ru/apis/portal/subscription';
      
      this.logger.log(`Setting up Xsi-Events subscription to: ${webhookUrl}`);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          subscriptionType: 'ABONENT',
          pattern: '*', // Подписка на всех абонентов
          expires: 86400, // 24 часа в секундах
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.logger.log(`✅ Xsi-Events subscription created: ${JSON.stringify(data)}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to create subscription: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`);
      return false;
    }
  }

  /**
   * Проверка текущей подписки
   * GET /apis/portal/subscription
   */
  async checkSubscription(): Promise<any> {
    if (!this.apiKey) return null;

    try {
      const url = 'https://cloudpbx.beeline.ru/apis/portal/subscription';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.logger.log(`Current subscription: ${JSON.stringify(data)}`);
        return data;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error checking subscription: ${error.message}`);
      return null;
    }
  }

  /**
   * Продление подписки
   */
  async renewSubscription(subscriptionId: string, expires: number): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const url = `https://cloudpbx.beeline.ru/apis/portal/subscription/${encodeURIComponent(subscriptionId)}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires: expires,
        }),
      });

      if (response.ok) {
        this.logger.log(`✅ Subscription renewed`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error renewing subscription: ${error.message}`);
      return false;
    }
  }

  /**
   * Отмена подписки
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const url = `https://cloudpbx.beeline.ru/apis/portal/subscription/${encodeURIComponent(subscriptionId)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-MPBX-API-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.logger.log(`✅ Subscription cancelled`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error cancelling subscription: ${error.message}`);
      return false;
    }
  }
}
