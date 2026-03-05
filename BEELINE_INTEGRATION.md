# Интеграция с Билайн CloudPBX

## Режим работы: Polling (опрос API)

Билайн CloudPBX использует **API через портал**. Основные моменты:

1. **Base URL**: `https://cloudpbx.beeline.ru`
2. **API пути**: `/apis/portal/abonents`, `/apis/portal/statistics` и т.д.
3. **Аутентификация**: Заголовок `X-MPBX-API-AUTH-TOKEN: ваш_ключ`
4. **Polling**: Backend опрашивает API каждые 5 минут

---

## Настройка

### 1. Получение API ключа Билайн

1. Зайдите в личный кабинет Билайн CloudPBX: https://cloudpbx.beeline.ru
2. Перейдите в раздел **API** (https://cloudpbx.beeline.ru/new/#/features/api-money)
3. Создайте новый API ключ
4. Скопируйте ключ

### 2. Настройка backend

1. Создайте файл `.env` в папке `dedline-crm-backend`:

```bash
# Beeline Telephony (CloudPBX) - Polling mode
BEELINE_API_KEY="ваш_api_ключ_здесь"
BEELINE_WEBHOOK_ENABLED=true
```

2. Перезапустите backend сервер

### 3. Проверка работы

#### Проверка статуса опроса

```powershell
# Требуется авторизация в CRM
Invoke-RestMethod -Uri 'http://localhost:3000/api/beeline/status' -Method Get
```

Ожидаемый ответ:
```json
{
  "polling": true,
  "interval": "5 minutes",
  "message": "Опрос API Билайн активен"
}
```

#### Принудительный опрос API

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/beeline/fetch' -Method Post -ContentType 'application/json' -Body '{}'
```

#### Проверка в CRM

1. Откройте CRM в браузере
2. Перейдите на страницу **"Входящие звонки"**
3. Проверьте список звонков

---

## API Endpoints Билайн

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/apis/portal/abonents` | GET | Список всех абонентов |
| `/apis/portal/statistics` | GET | История звонков (с параметрами startDate, endDate) |
| `/apis/portal/v2/statistics` | GET | История звонков v2 |
| `/apis/portal/v3/statistics/recordsChart` | GET | Статистика в виде графика |
| `/apis/portal/v3/statistics/callPath` | GET | Путь прохождения звонка |

---

## Как это работает

### Алгоритм опроса

1. **GET /apis/portal/statistics** — получение истории звонков за последний час
2. **Если statistics недоступен**:
   - **GET /apis/portal/abonents** — получение списка абонентов
   - **Для каждого абонента: GET /apis/portal/statistics?userId={id}** — звонки абонента
3. **Фильтрация**:
   - Только входящие (`direction: inbound`)
   - За последний час
   - Не обработанные ранее
4. **Создание звонка в CRM** через `incoming-calls` сервис

### Кэширование

- Обработанные ID звонков сохраняются в памяти
- Кэш очищается при перезапуске сервера
- Можно очистить вручную: `POST /api/beeline/clear-cache`

---

## API Endpoints CRM

| Endpoint | Метод | Описание | Auth |
|----------|-------|----------|------|
| `/api/beeline/status` | GET | Статус опроса API | ✅ |
| `/api/beeline/fetch` | POST | Принудительный опрос API | ✅ |
| `/api/beeline/clear-cache` | POST | Очистка кэша звонков | ✅ |
| `/api/beeline/webhook` | POST | Заглушка (не используется) | ❌ |
| `/api/incoming-calls` | GET | Список всех звонков | ✅ |
| `/api/incoming-calls/:id` | GET | Детали звонка | ✅ |
| `/api/incoming-calls/:id/convert-to-client` | POST | Создать клиента из звонка | ✅ |
| `/api/incoming-calls/:id/convert-to-application` | POST | Создать заявку из звонка | ✅ |

---

## Настройка интервала опроса

По умолчанию: **каждые 5 минут**.

Для изменения отредактируйте `src/beeline/beeline.module.ts`:

```typescript
onModuleInit() {
  const pollingEnabled = this.configService.get<boolean>('BEELINE_WEBHOOK_ENABLED') || false;

  if (pollingEnabled) {
    // Измените на нужное количество минут
    this.beelineService.startPolling(10); // каждые 10 минут
  }
}
```

---

## Отключение интеграции

Установите в `.env`:

```bash
BEELINE_WEBHOOK_ENABLED=false
```

И перезапустите backend.

---

## Решение проблем

### API возвращает ошибку 400

Endpoint `/statistics` требует обязательные параметры `startDate` и `endDate`. Убедитесь, что даты передаются в формате ISO 8601.

### Звонки не создаются

1. Проверьте логи backend
2. Убедитесь, что API ключ действителен
3. Проверьте, что в базе есть активный пользователь

### Дублирование звонков

Очистите кэш:
```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/api/beeline/clear-cache' -Method Post
```

---

## Тестирование API Билайн

### Проверка ключа API

```powershell
$apiKey = "ваш_api_ключ"
Invoke-RestMethod -Uri 'https://cloudpbx.beeline.ru/apis/portal/abonents' `
  -Headers @{ 'X-MPBX-API-AUTH-TOKEN' = $apiKey } `
  -Method Get
```

### Получение истории звонков

```powershell
$apiKey = "ваш_api_ключ"
$startDate = "2025-03-05T00:00:00Z"
$endDate = "2025-03-05T23:59:59Z"
Invoke-RestMethod -Uri "https://cloudpbx.beeline.ru/apis/portal/statistics?startDate=$startDate&endDate=$endDate&limit=10" `
  -Headers @{ 'X-MPBX-API-AUTH-TOKEN' = $apiKey } `
  -Method Get
```

---

## Контакты

По вопросам интеграции обращайтесь к разработчику CRM.
