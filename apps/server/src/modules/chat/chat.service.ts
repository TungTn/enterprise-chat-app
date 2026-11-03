import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto, MessageType, IceServerConfig, LinkPreviewMetadata } from '@enterprise-chat/shared-types';
import { MessageDeliveryStatus } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';
import { UrlMetadataService } from './url-metadata.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urlMetadataService: UrlMetadataService,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto) {
    // Check if user is a member of the conversation
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: dto.conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của cuộc hội thoại này');
    }

    // Idempotency check: if clientMessageId already processed for this conversation, return existing
    if (dto.clientMessageId) {
      const existing = await this.prisma.message.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId: dto.conversationId,
            clientMessageId: dto.clientMessageId,
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
            },
          },
          reactions: true,
          attachments: true,
        },
      });

      if (existing) {
        const formatted = this.formatMessage(existing);
        return await this.attachLinkPreview(formatted);
      }
    }

    const content =
      (dto.content || '').trim() ||
      (dto.attachmentIds && dto.attachmentIds.length > 0 ? 'Đã gửi tệp đính kèm' : '');

    // Transaction for atomic sequenceNumber increment & message creation
    const { message, attachments } = await this.prisma.$transaction(async (tx) => {
      const updatedConv = await tx.conversation.update({
        where: { id: dto.conversationId },
        data: {
          lastSequenceNumber: { increment: 1 },
          updatedAt: new Date(),
        },
        select: { lastSequenceNumber: true },
      });

      const nextSeq = updatedConv.lastSequenceNumber;

      const newMsg = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          content,
          type:
            (dto.type as any) ||
            (dto.attachmentIds && dto.attachmentIds.length > 0 ? MessageType.ATTACHMENT : MessageType.TEXT),
          parentId: dto.parentId || null,
          clientMessageId: dto.clientMessageId || null,
          sequenceNumber: nextSeq,
          deliveryStatus: MessageDeliveryStatus.SENT,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              role: true,
            },
          },
          reactions: true,
        },
      });

      let linkedAttachments: any[] = [];
      if (dto.attachmentIds && dto.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: dto.attachmentIds } },
          data: { messageId: newMsg.id },
        });

        linkedAttachments = await tx.attachment.findMany({
          where: { id: { in: dto.attachmentIds } },
        });
      }

      return { message: newMsg, attachments: linkedAttachments };
    });

    const formatted = this.formatMessage({ ...message, attachments });
    return await this.attachLinkPreview(formatted);
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50) {
    // Check membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không có quyền xem tin nhắn của cuộc hội thoại này');
    }

    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
          },
        },
        attachments: true,
        reactions: true,
        _count: { select: { replies: true } },
      },
    });

    const hasNextPage = messages.length > take;
    const items = hasNextPage ? messages.slice(0, take) : messages;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    const formattedList = await Promise.all(
      items.map(async (m) => {
        const fmt = this.formatMessage(m);
        return await this.attachLinkPreview(fmt);
      })
    );

    return {
      items: formattedList.reverse(), // Return chronological order
      nextCursor,
    };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { members: true } } },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const isMember = message.conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền tương tác với tin nhắn này');
    }

    // Toggle reaction
    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    // Return updated reactions map
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
    });

    const reactionMap: Record<string, string[]> = {};
    for (const r of reactions) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
      reactionMap[r.emoji].push(r.userId);
    }

    return {
      messageId,
      conversationId: message.conversationId,
      reactions: reactionMap,
    };
  }

  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent.trim(),
        isEdited: true,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
        attachments: true,
        reactions: true,
      },
    });

    const formatted = this.formatMessage(updated);
    return await this.attachLinkPreview(formatted);
  }

  async deleteMessage(messageId: string, userId: string, userRole?: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { members: true } } },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const isAuthor = message.senderId === userId;
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN';

    if (!isAuthor && !isSuperAdmin) {
      throw new ForbiddenException('Bạn không có quyền thu hồi tin nhắn này');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'Tin nhắn này đã bị thu hồi',
        isDeleted: true,
      },
    });

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      isDeleted: true,
    };
  }

  async markAsRead(conversationId: string, userId: string, messageId: string) {
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadMessageId: messageId },
    });

    return { conversationId, userId, messageId };
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    const lastMsg = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (lastMsg) {
      await this.prisma.conversationMember.updateMany({
        where: { conversationId, userId },
        data: { lastReadMessageId: lastMsg.id },
      });
    }

    return { success: true, conversationId, lastReadMessageId: lastMsg?.id || null };
  }

  async syncDeltaMessages(conversationId: string, userId: string, sinceSeq = 0, limit = 100) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        sequenceNumber: { gt: sinceSeq },
      },
      orderBy: { sequenceNumber: 'asc' },
      take: Math.min(limit, 200),
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
        reactions: true,
        attachments: true,
      },
    });

    return await Promise.all(
      messages.map(async (m) => {
        const fmt = this.formatMessage(m);
        return await this.attachLinkPreview(fmt);
      })
    );
  }

  async updateDeliveryStatus(messageId: string, userId: string, status: any) {
    const targetStatus = status as MessageDeliveryStatus;
    const priority: Record<string, number> = {
      SENT: 1,
      DELIVERED: 2,
      READ: 3,
    };

    if (!targetStatus || !priority[targetStatus]) return null;

    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, deliveryStatus: true, senderId: true },
    });
    if (!msg) return null;

    if (priority[targetStatus] > (priority[msg.deliveryStatus] || 0)) {
      const updated = await this.prisma.message.update({
        where: { id: messageId },
        data: { deliveryStatus: targetStatus },
      });

      if (targetStatus === MessageDeliveryStatus.READ) {
        await this.prisma.conversationMember.updateMany({
          where: { conversationId: msg.conversationId, userId },
          data: { lastReadMessageId: messageId },
        });
      }

      return {
        messageId: updated.id,
        conversationId: updated.conversationId,
        senderId: msg.senderId,
        status: updated.deliveryStatus,
      };
    }

    return null;
  }

  async getReadReceipts(messageId: string, currentUserId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    role: true,
                    department: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!msg) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    const isMember = msg.conversation.members.some((m) => m.userId === currentUserId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của cuộc trò chuyện này');
    }

    const lastReadMsgIds = msg.conversation.members
      .map((m) => m.lastReadMessageId)
      .filter(Boolean) as string[];

    const lastReadMsgs = await this.prisma.message.findMany({
      where: { id: { in: lastReadMsgIds } },
      select: { id: true, createdAt: true, sequenceNumber: true },
    });
    const lastReadMap = new Map(lastReadMsgs.map((m) => [m.id, m]));

    const readMembers: any[] = [];
    const unreadMembers: any[] = [];

    for (const member of msg.conversation.members) {
      if (member.userId === msg.senderId) continue;

      const lastRead = member.lastReadMessageId ? lastReadMap.get(member.lastReadMessageId) : null;
      const isRead =
        (msg.deliveryStatus === 'READ' && msg.conversation.type === 'DIRECT') ||
        Boolean(
          lastRead &&
            ((msg.sequenceNumber != null &&
              lastRead.sequenceNumber != null &&
              lastRead.sequenceNumber >= msg.sequenceNumber) ||
              lastRead.createdAt >= msg.createdAt),
        );

      const memberInfo = {
        id: member.user.id,
        fullName: member.user.fullName,
        avatarUrl:
          member.user.avatarUrl && !member.user.avatarUrl.startsWith('/api/alfresco')
            ? member.user.avatarUrl
            : null,
        role: member.role,
        departmentName: member.user.department?.name || null,
        readAt: isRead ? lastRead?.createdAt || msg.updatedAt : null,
      };

      if (isRead) {
        readMembers.push(memberInfo);
      } else {
        unreadMembers.push(memberInfo);
      }
    }

    return {
      messageId: msg.id,
      totalMembers: Math.max(0, msg.conversation.members.length - 1),
      readCount: readMembers.length,
      unreadCount: unreadMembers.length,
      readMembers,
      unreadMembers,
    };
  }

  getIceServers(): IceServerConfig[] {
    const stunServers: IceServerConfig[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];

    const turnUrl = process.env.TURN_URL;
    const turnUsername = process.env.TURN_USERNAME;
    const turnCredential = process.env.TURN_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
      stunServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return stunServers;
  }

  async generateLiveKitToken(conversationId: string, userId: string, fullName?: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của cuộc hội thoại này');
    }

    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const hostIp = process.env.HOST_IP || '10.2.8.231';
    const wsUrl = process.env.LIVEKIT_URL || `ws://${hostIp}:7880`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: fullName || 'User',
      ttl: '4h',
    });

    at.addGrant({
      room: conversationId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return {
      token,
      url: wsUrl,
      room: conversationId,
    };
  }

  private formatMessage(msg: any) {
    const reactionMap: Record<string, string[]> = {};
    if (msg.reactions) {
      for (const r of msg.reactions) {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
        reactionMap[r.emoji].push(r.userId);
      }
    }

    const attachments = (msg.attachments || []).map((att: any) => ({
      id: att.id,
      fileName: att.originalName || att.fileName,
      fileSizeBytes: att.fileSizeBytes,
      mimeType: att.mimeType,
      downloadUrl: `/api/files/${att.id}/view`,
    }));

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.sender?.fullName || 'Người dùng',
      senderAvatarUrl:
        msg.sender?.avatarUrl && !msg.sender.avatarUrl.startsWith('/api/alfresco')
          ? msg.sender.avatarUrl
          : null,
      content: msg.isDeleted ? 'Tin nhắn này đã bị thu hồi' : msg.content,
      type: msg.type,
      parentId: msg.parentId || null,
      clientMessageId: msg.clientMessageId || null,
      sequenceNumber: msg.sequenceNumber ?? null,
      deliveryStatus: msg.deliveryStatus || 'SENT',
      replyCount: msg._count?.replies || 0,
      isEdited: msg.isEdited,
      isDeleted: msg.isDeleted,
      attachments,
      reactions: reactionMap,
      linkPreview: msg.linkPreview || null,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : (msg.createdAt || new Date().toISOString()),
      updatedAt: msg.updatedAt instanceof Date ? msg.updatedAt.toISOString() : msg.updatedAt,
    };
  }

  public async attachLinkPreview(formattedMsg: any): Promise<any> {
    if (!formattedMsg || !formattedMsg.content || formattedMsg.isDeleted) return formattedMsg;
    const url = this.urlMetadataService.extractFirstUrl(formattedMsg.content);
    if (!url) return formattedMsg;

    const preview = await this.urlMetadataService.getMetadata(url);
    if (preview) {
      formattedMsg.linkPreview = preview;
    }
    return formattedMsg;
  }

  async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    limit: number = 30,
  ) {
    if (!query || !query.trim()) {
      return [];
    }
    const cleanQuery = query.trim();

    const whereCondition: any = {
      isDeleted: false,
      content: {
        contains: cleanQuery,
        mode: 'insensitive',
      },
    };

    if (conversationId) {
      const member = await this.prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });
      if (!member) {
        throw new ForbiddenException('Bạn không phải thành viên của cuộc hội thoại này');
      }
      whereCondition.conversationId = conversationId;
    } else {
      whereCondition.conversation = {
        members: {
          some: { userId },
        },
      };
    }

    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            role: true,
          },
        },
        reactions: true,
        attachments: true,
        conversation: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return messages.map((m) => {
      const formatted = this.formatMessage(m);
      return {
        ...formatted,
        conversationName: m.conversation?.name || null,
        conversationType: m.conversation?.type || null,
      };
    });
  }
}

