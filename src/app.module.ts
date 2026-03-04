import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { PerformersModule } from './performers/performers.module';
import { ApplicationsModule } from './applications/applications.module';
import { IncomingCallsModule } from './incoming-calls/incoming-calls.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ActsModule } from './acts/acts.module';
import { IncomeAnalyticsModule } from './income-analytics/income-analytics.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PerformerNotesModule } from './performer-notes/performer-notes.module';
import { PerformerDocumentsModule } from './performer-documents/performer-documents.module';
import { ClientNotesModule } from './client-notes/client-notes.module';
import { ClientDocumentsModule } from './client-documents/client-documents.module';
import { CryptoModule } from './crypto/crypto.module';
import { DatabaseModule } from './database/database.module';
import { GatewayModule } from './gateway/gateway.module';
import { TelegramModule } from './telegram/telegram.module';
import { ErrorReportModule } from './error-report/error-report.module';
import { LogsModule } from './logs/logs.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', '..', 'uploads'), serveRoot: '/uploads' }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    PerformersModule,
    ApplicationsModule,
    IncomingCallsModule,
    TransactionsModule,
    InvoicesModule,
    ActsModule,
    IncomeAnalyticsModule,
    ChatModule,
    DashboardModule,
    PerformerNotesModule,
    PerformerDocumentsModule,
    ClientNotesModule,
    ClientDocumentsModule,
    CryptoModule,
    GatewayModule,
    TelegramModule,
    ErrorReportModule,
    LogsModule,
  ],
})
export class AppModule {}
