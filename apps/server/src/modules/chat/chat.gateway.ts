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
import { SOCKET_EVENTS, SendMessageDto, PresenceStatus } from '@enterprise-chat/shared-types';

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
        // User came online
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: PresenceStatus.ONLINE },
        });
        this.server.emit(SOCKET_EVENTS.PRESENCE_CHANGE, {
          userId: user.id,
          status: PresenceStatus.ONLINE,
        });
      }
      this.activeUsers.get(user.id)?.add(client.id);

      // Join user-specific notification room
      client.join(`user:${user.id}`);
    } catch {
      client.disconnect();
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
        // User went offline
        await this.prisma.user.update({
          where: { id: userId },
          data: { status: PresenceStatus.OFFLINE },
        });
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

    // Broadcast message to everyone in the conversation room
    this.server
      .to(`conversation:${dto.conversationId}`)
      .emit(SOCKET_EVENTS.NEW_MESSAGE, message);

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

    client
      .to(`conversation:${data.conversationId}`)
      .emit(SOCKET_EVENTS.READ_RECEIPT, receipt);

    return receipt;
  }
}
