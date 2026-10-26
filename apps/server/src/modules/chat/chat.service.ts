import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto, MessageType } from '@enterprise-chat/shared-types';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        content: dto.content.trim(),
        type: (dto.type as any) || MessageType.TEXT,
        parentId: dto.parentId || null,
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
        attachments: true,
        reactions: true,
      },
    });

    // Link attachments if provided
    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      await this.prisma.attachment.updateMany({
        where: { id: { in: dto.attachmentIds } },
        data: { messageId: message.id },
      });
    }

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return this.formatMessage(message);
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

    return {
      items: items.map(this.formatMessage).reverse(), // Return chronological order
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

    return this.formatMessage(updated);
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

  private formatMessage(msg: any) {
    const reactionMap: Record<string, string[]> = {};
    if (msg.reactions) {
      for (const r of msg.reactions) {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
        reactionMap[r.emoji].push(r.userId);
      }
    }

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.sender?.fullName || 'Người dùng',
      senderAvatarUrl: msg.sender?.avatarUrl || null,
      content: msg.isDeleted ? 'Tin nhắn này đã bị thu hồi' : msg.content,
      type: msg.type,
      parentId: msg.parentId || null,
      replyCount: msg._count?.replies || 0,
      isEdited: msg.isEdited,
      isDeleted: msg.isDeleted,
      attachments: msg.attachments || [],
      reactions: reactionMap,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt?.toISOString(),
    };
  }
}
