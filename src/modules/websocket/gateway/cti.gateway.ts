import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

interface ClientSubscriptions {
  channels: Set<string>;
  userId: string;
  extensionId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class CtiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CtiGateway.name);
  private readonly clients = new Map<string, ClientSubscriptions>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.clients.set(client.id, {
        channels: new Set<string>(),
        userId,
      });

      client.emit('CONNECTED', {
        type: 'CONNECTED',
        timestamp: new Date().toISOString(),
        data: {
          userId,
          sessionId: client.id,
        },
      });

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.clients.get(client.id);

    if (clientInfo) {
      this.logger.log(
        `Client disconnected: ${client.id} (User: ${clientInfo.userId})`,
      );
      this.clients.delete(client.id);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return {
      type: 'PONG',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channels: string[] },
  ) {
    const clientInfo = this.clients.get(client.id);

    if (!clientInfo) {
      return { success: false, error: 'Client not found' };
    }

    data.channels.forEach((channel) => {
      clientInfo.channels.add(channel);
      client.join(channel);
    });

    this.logger.log(
      `Client ${client.id} subscribed to: ${data.channels.join(', ')}`,
    );

    return {
      success: true,
      subscriptions: Array.from(clientInfo.channels),
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channels: string[] },
  ) {
    const clientInfo = this.clients.get(client.id);

    if (!clientInfo) {
      return { success: false, error: 'Client not found' };
    }

    data.channels.forEach((channel) => {
      clientInfo.channels.delete(channel);
      client.leave(channel);
    });

    this.logger.log(
      `Client ${client.id} unsubscribed from: ${data.channels.join(', ')}`,
    );

    return {
      success: true,
      subscriptions: Array.from(clientInfo.channels),
    };
  }

  // Event emission methods
  emitCallEvent(event: string, data: any) {
    this.server.emit(event, {
      type: event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  emitToChannel(channel: string, event: string, data: any) {
    this.server.to(channel).emit(event, {
      type: event,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    // Find all client sockets for this user
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.userId === userId) {
        this.server.to(socketId).emit(event, {
          type: event,
          timestamp: new Date().toISOString(),
          data,
        });
      }
    }
  }

  // Call events
  emitCallCreated(callData: any) {
    this.emitCallEvent('CALL_CREATED', callData);
  }

  emitCallRinging(callData: any) {
    this.emitCallEvent('CALL_RINGING', callData);
  }

  emitCallAnswered(callData: any) {
    this.emitCallEvent('CALL_ANSWERED', callData);
  }

  emitCallEnded(callData: any) {
    this.emitCallEvent('CALL_ENDED', callData);
  }

  // Extension events
  emitExtensionRegistered(extensionData: any) {
    this.emitCallEvent('EXTENSION_REGISTERED', extensionData);
  }

  emitExtensionUnregistered(extensionData: any) {
    this.emitCallEvent('EXTENSION_UNREGISTERED', extensionData);
  }

  // Presence events
  emitPresenceUpdated(presenceData: any) {
    this.emitCallEvent('PRESENCE_UPDATED', presenceData);
  }

  // Queue events
  emitQueueCallEntered(queueData: any) {
    this.emitToChannel(`queues:${queueData.queueId}`, 'QUEUE_CALL_ENTERED', queueData);
  }

  emitQueueStatsUpdated(queueData: any) {
    this.emitToChannel(`queues:${queueData.queueId}`, 'QUEUE_STATS_UPDATED', queueData);
  }

  // Agent events
  emitAgentStateChanged(agentData: any) {
    this.emitToChannel('agents', 'AGENT_STATE_CHANGED', agentData);
    this.emitToUser(agentData.userId, 'AGENT_STATE_CHANGED', agentData);
  }

  // System events
  emitSystemAlert(alertData: any) {
    this.emitToChannel('system', 'SYSTEM_ALERT', alertData);
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1] ||
      client.handshake.query?.token;

    return token as string | null;
  }
}
