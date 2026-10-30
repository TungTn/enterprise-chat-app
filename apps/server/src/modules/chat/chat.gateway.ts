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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SOCKET_EVENTS, SendMessageDto, PresenceStatus, MessageAckDto } from '@enterprise-chat/shared-types';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track active socket connections per user: userId -> Set of socketIds
  private activeUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'enterprise_default_secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, fullName: true, role: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.user = user;

      // Track socket connection
      if (!this.activeUsers.has(user.id)) {
        this.activeUsers.set(user.id, new Set());
        // Record in Redis Presence cache immediately (O(1))
        this.redisService.setUserPresence(user.id, PresenceStatus.ONLINE).catch(() => {});
        // Non-blocking update to PostgreSQL
        this.prisma.user
          .update({
            where: { id: user.id },
            data: { status: PresenceStatus.ONLINE },
          })
          .catch((err) => console.warn('Could not update user status to ONLINE in DB:', err));

        this.server.emit(SOCKET_EVENTS.PRESENCE_CHANGE, {
          userId: user.id,
          status: PresenceStatus.ONLINE,
        });
      }
      this.activeUsers.get(user.id)?.add(client.id);

      // Join user-specific notification room
      client.join(`user:${user.id}`);

      // Join IP-specific room for local machine coordination
      const clientIp = this.getClientIp(client);
      if (clientIp && clientIp !== 'unknown') {
        client.join(`client_ip:${clientIp}`);
      }

      // Auto-join all conversation rooms the user is in
      const memberships = await this.prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversationId: true },
      });
      for (const m of memberships) {
        client.join(`conversation:${m.conversationId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  private getClientIp(client: any): string {
    const forwarded = client.handshake?.headers?.['x-forwarded-for'];
    if (forwarded) {
      const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return raw.trim().replace(/^.*:/, '');
    }
    const addr = client.handshake?.address || '';
    return addr.replace(/^.*:/, '').trim() || 'unknown';
  }

  async broadcastNewMessage(message: any) {
    if (this.server && message && message.conversationId) {
      try {
        // 1. Try Redis cache first (0ms DB delay)
        let memberIds = await this.redisService.getConversationMembers(message.conversationId);

        if (!memberIds || memberIds.length === 0) {
          // Cache miss: Query PostgreSQL once and cache in Redis for 1 hour
          const members = await this.prisma.conversationMember.findMany({
            where: { conversationId: message.conversationId },
            select: { userId: true },
          });
          memberIds = members.map((m) => m.userId);
          await this.redisService.setConversationMembers(message.conversationId, memberIds);
        }

        // In Socket.IO, passing an array of rooms to .to(rooms) targets the union of rooms
        // and automatically deduplicates connected sockets so each client receives the event EXACTLY ONCE!
        const targetRooms = [
          `conversation:${message.conversationId}`,
          ...memberIds.map((uid) => `user:${uid}`),
        ];

        this.server.to(targetRooms).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
      } catch (err) {
        console.warn('Error broadcasting to member user rooms:', err);
        this.server
          .to(`conversation:${message.conversationId}`)
          .emit(SOCKET_EVENTS.NEW_MESSAGE, message);
      }
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.user?.id;
    if (!userId) return;

    const userSockets = this.activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.activeUsers.delete(userId);
        // Record in Redis Presence cache immediately
        this.redisService.setUserPresence(userId, PresenceStatus.OFFLINE).catch(() => {});
        // Non-blocking update to PostgreSQL
        this.prisma.user
          .update({
            where: { id: userId },
            data: { status: PresenceStatus.OFFLINE },
          })
          .catch((err) => console.warn('Could not update user status to OFFLINE in DB:', err));

        this.server.emit(SOCKET_EVENTS.PRESENCE_CHANGE, {
          userId,
          status: PresenceStatus.OFFLINE,
        });
      }
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.JOIN_CONVERSATION)
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client.join(`conversation:${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage(SOCKET_EVENTS.LEAVE_CONVERSATION)
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    if (!client.user) return;

    const message = await this.chatService.sendMessage(client.user.id, dto);

    // Broadcast message to everyone in the conversation
    await this.broadcastNewMessage(message);

    return message;
  }

  @SubscribeMessage(SOCKET_EVENTS.EDIT_MESSAGE)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    if (!client.user) return;

    const updated = await this.chatService.editMessage(
      data.messageId,
      client.user.id,
      data.content,
    );

    this.server
      .to(`conversation:${updated.conversationId}`)
      .emit(SOCKET_EVENTS.MESSAGE_EDITED, updated);

    return updated;
  }

  @SubscribeMessage(SOCKET_EVENTS.DELETE_MESSAGE)
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    if (!client.user) return;

    const result = await this.chatService.deleteMessage(
      data.messageId,
      client.user.id,
      client.user.role,
    );

    this.server
      .to(`conversation:${result.conversationId}`)
      .emit(SOCKET_EVENTS.MESSAGE_DELETED, result);

    return result;
  }

  @SubscribeMessage(SOCKET_EVENTS.REACT_MESSAGE)
  async handleReactMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.user) return;

    const result = await this.chatService.addReaction(
      data.messageId,
      client.user.id,
      data.emoji,
    );

    this.server
      .to(`conversation:${result.conversationId}`)
      .emit(SOCKET_EVENTS.MESSAGE_REACTION_UPDATED, result);

    return result;
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
      conversationId: data.conversationId,
      userId: client.user.id,
      fullName: client.user.fullName,
      isTyping: true,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;
    client.to(`conversation:${data.conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
      conversationId: data.conversationId,
      userId: client.user.id,
      fullName: client.user.fullName,
      isTyping: false,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.SET_PRESENCE)
  async handleSetPresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: PresenceStatus },
  ) {
    if (!client.user || !data?.status) return;
    // Update Redis cache immediately (O(1))
    this.redisService.setUserPresence(client.user.id, data.status).catch(() => {});
    // Non-blocking update to PostgreSQL
    this.prisma.user
      .update({
        where: { id: client.user.id },
        data: { status: data.status },
      })
      .catch((err) => console.warn('Could not update user presence in DB:', err));

    this.server.emit(SOCKET_EVENTS.PRESENCE_CHANGE, {
      userId: client.user.id,
      status: data.status,
    });
    return { success: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!client.user) return;

    const receipt = await this.chatService.markAsRead(
      data.conversationId,
      client.user.id,
      data.messageId,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit(SOCKET_EVENTS.READ_RECEIPT, receipt);

    this.server
      .to(`user:${client.user.id}`)
      .emit(SOCKET_EVENTS.READ_RECEIPT, receipt);

    return receipt;
  }

  @SubscribeMessage(SOCKET_EVENTS.MESSAGE_ACK)
  async handleMessageAck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: MessageAckDto,
  ) {
    if (!client.user) return;

    const result = await this.chatService.updateDeliveryStatus(
      data.messageId,
      client.user.id,
      data.status,
    );

    if (result) {
      this.server
        .to(`conversation:${result.conversationId}`)
        .emit(SOCKET_EVENTS.DELIVERY_STATUS_UPDATED, {
          messageId: result.messageId,
          conversationId: result.conversationId,
          deliveryStatus: result.status,
          senderId: result.senderId,
          ackUserId: client.user.id,
        });
    }

    return result;
  }

  @SubscribeMessage('SYNC_SESSION')
  handleSyncSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    const clientIp = this.getClientIp(client);
    if (this.server && data && clientIp && clientIp !== 'unknown') {
      // ONLY broadcast to sockets belonging to the EXACT same workstation/IP!
      client.to(`client_ip:${clientIp}`).emit('SYNC_SESSION_CHANGED', data);
    }
    return { success: true };
  }
}
