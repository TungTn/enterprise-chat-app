import { Logger } from '@nestjs/common';
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
import { SOCKET_EVENTS, SendMessageDto, PresenceStatus, MessageAckDto, MessageType } from '@enterprise-chat/shared-types';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
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

  private readonly logger = new Logger(ChatGateway.name);

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

  // --- WebRTC Signalling Handlers ---

  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      receiverId: string;
      callType?: 'audio' | 'video';
      callerName?: string;
      callerAvatar?: string;
    },
  ) {
    if (!client.user || !data.receiverId) return;
    const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`📞 Call initiated from ${client.user.id} to ${data.receiverId} in conv ${data.conversationId}`);

    this.server.to(`user:${data.receiverId}`).emit('call:incoming', {
      callId,
      conversationId: data.conversationId,
      callerId: client.user.id,
      callerName: data.callerName || client.user.fullName || 'Đồng nghiệp',
      callerAvatar: data.callerAvatar || client.user.avatarUrl,
      callType: data.callType || 'audio',
    });

    return { callId, status: 'calling' };
  }

  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      callId: string;
      callerId: string;
      conversationId: string;
    },
  ) {
    if (!client.user || !data.callerId) return;
    this.logger.log(`✅ Call accepted by ${client.user.id} for caller ${data.callerId}`);

    this.server.to(`user:${data.callerId}`).emit('call:accepted', {
      callId: data.callId,
      receiverId: client.user.id,
      conversationId: data.conversationId,
    });

    return { success: true };
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      targetUserId: string;
      callId: string;
      signal: any;
    },
  ) {
    if (!client.user || !data.targetUserId) return;

    this.server.to(`user:${data.targetUserId}`).emit('call:signal', {
      senderId: client.user.id,
      callId: data.callId,
      signal: data.signal,
    });

    return { success: true };
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      callerId: string;
      callId: string;
      conversationId?: string;
      reason?: string;
    },
  ) {
    if (!client.user || !data.callerId) return;
    this.logger.log(`❌ Call rejected by ${client.user.id} for caller ${data.callerId}`);

    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      callId: data.callId,
      receiverId: client.user.id,
      conversationId: data.conversationId,
      reason: data.reason || 'declined',
    });

    // Save Call Log Message to the conversation so both parties see it in chat history
    if (data.conversationId) {
      const callLogContent = `[CALL_LOG]:${JSON.stringify({
        type: 'audio',
        status: 'declined',
        duration: 0,
      })}`;
      try {
        const message = await this.chatService.sendMessage(client.user.id, {
          conversationId: data.conversationId,
          content: callLogContent,
          type: MessageType.SYSTEM,
        });
        await this.broadcastNewMessage(message);
      } catch (err: any) {
        this.logger.warn(`Failed to record call reject log: ${err?.message || err}`);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      targetUserId: string;
      callId: string;
      conversationId?: string;
      durationSeconds?: number;
      callStatus?: 'missed' | 'completed';
      callType?: 'audio' | 'video';
    },
  ) {
    if (!client.user || !data.targetUserId) return;
    this.logger.log(`⏹️ Call ended by ${client.user.id} for target ${data.targetUserId}`);

    const status = data.callStatus || ((data.durationSeconds || 0) > 0 ? 'completed' : 'missed');

    this.server.to(`user:${data.targetUserId}`).emit('call:ended', {
      callId: data.callId,
      senderId: client.user.id,
      conversationId: data.conversationId,
      callStatus: status,
      durationSeconds: data.durationSeconds || 0,
    });

    // Save Call Log Message to conversation
    if (data.conversationId) {
      const callLogContent = `[CALL_LOG]:${JSON.stringify({
        type: data.callType || 'audio',
        status,
        duration: data.durationSeconds || 0,
      })}`;
      try {
        const message = await this.chatService.sendMessage(client.user.id, {
          conversationId: data.conversationId,
          content: callLogContent,
          type: MessageType.SYSTEM,
        });
        await this.broadcastNewMessage(message);
      } catch (err: any) {
        this.logger.warn(`Failed to record call end log: ${err?.message || err}`);
      }
    }

    return { success: true };
  }
}
