import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { cluster } from 'cluster';
import { cpus } from 'os';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} started on ${numCPUs} CPUs`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Restart worker on exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });
  
} else {
  // Worker process
  async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Глобальный префикс для всех API endpoints
    app.setGlobalPrefix('api');

    // Раздача статических файлов (аватарки, чеки, документы)
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });

    // Увеличиваем лимит размера тела запроса до 10MB (для загрузки аватарок)
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

    app.enableCors({
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Worker ${process.pid} running on: http://localhost:${port}`);
    console.log(`API available at: http://localhost:${port}/api`);
  }
  
  bootstrap();
}
