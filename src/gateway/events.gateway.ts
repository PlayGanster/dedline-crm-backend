import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // Хранилище соответствия userId -> socketId
  private userSockets: Map<number, string> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Удаляем из хранилища
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  // Подключение пользователя с указанием userId
  @SubscribeMessage('authenticate')
  handleAuthenticate(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }): void {
    const userId = data.userId;
    if (userId) {
      this.userSockets.set(userId, client.id);
      client.data.userId = userId;
      this.logger.log(`User ${userId} authenticated with socket ${client.id}`);
    }
  }

  // Отправка события конкретному пользователю
  sendToUser(userId: number, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      this.logger.log(`Sent event '${event}' to user ${userId}`);
    } else {
      this.logger.warn(`User ${userId} not connected`);
    }
  }

  // Отправка события всем кроме указанного пользователя
  broadcastExcept(event: string, data: any, excludeUserId?: number): void {
    if (excludeUserId) {
      const excludeSocketId = this.userSockets.get(excludeUserId);
      if (excludeSocketId) {
        this.server.except(excludeSocketId).emit(event, data);
      } else {
        this.server.emit(event, data);
      }
    } else {
      this.server.emit(event, data);
    }
  }

  // Отправка события всем подключенным клиентам
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted event '${event}'`);
  }

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: any): void {
    this.server.emit('message', { clientId: client.id, data });
  }
}
