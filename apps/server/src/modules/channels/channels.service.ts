import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelMemberRole, ChannelScope, ConversationType } from '@enterprise-chat/shared-types';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(userId: string, dto: CreateChannelDto) {
    const channel = await this.prisma.conversation.create({
      data: {
        type: ConversationType.CHANNEL,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        scope: dto.scope,
        departmentId: dto.departmentId || null,
        createdById: userId,
        members: {
          create: {
            userId,
            role: ChannelMemberRole.OWNER,
          },
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    // If company-wide, add all active employees
    if (dto.scope === ChannelScope.COMPANY) {
      const allUsers = await this.prisma.user.findMany({
        where: { id: { not: userId } },
        select: { id: true },
      });
      await this.prisma.conversationMember.createMany({
        data: allUsers.map((u) => ({
          conversationId: channel.id,
          userId: u.id,
          role: ChannelMemberRole.MEMBER,
        })),
        skipDuplicates: true,
      });
    } else if (dto.memberIds && dto.memberIds.length > 0) {
      await this.prisma.conversationMember.createMany({
        data: dto.memberIds
          .filter((id) => id !== userId)
          .map((id) => ({
            conversationId: channel.id,
            userId: id,
            role: ChannelMemberRole.MEMBER,
          })),
        skipDuplicates: true,
      });
    }

    return this.getChannelById(channel.id, userId);
  }

  async getUserConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    avatarUrl: true,
                    role: true,
                    status: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, fullName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const conv = m.conversation;
      const lastMsg = conv.messages[0] || null;
      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        scope: conv.scope,
        description: conv.description,
        departmentId: conv.departmentId,
        myRole: m.role,
        lastReadMessageId: m.lastReadMessageId,
        unreadCount: 0, // calculate if needed
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.isDeleted ? 'Tin nhắn đã bị thu hồi' : lastMsg.content,
              senderName: lastMsg.sender.fullName,
              senderAvatarUrl: lastMsg.sender.avatarUrl,
              createdAt: lastMsg.createdAt.toISOString(),
            }
          : null,
        members: conv.members.map((mem) => mem.user),
      };
    });
  }

  async getChannelById(channelId: string, userId: string) {
    const channel = await this.prisma.conversation.findUnique({
      where: { id: channelId },
      include: {
        department: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Không tìm thấy kênh chat');
    }

    const isMember = channel.members.some((m) => m.userId === userId);
    if (!isMember && channel.scope === ChannelScope.PRIVATE) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào kênh riêng tư này');
    }

    return channel;
  }

  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ConflictException('Không thể tự tạo hội thoại riêng với chính mình');
    }

    // Check if direct conversation already exists between these 2 users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new direct conversation
    const newConv = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        members: {
          create: [
            { userId, role: ChannelMemberRole.MEMBER },
            { userId: targetUserId, role: ChannelMemberRole.MEMBER },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return newConv;
  }
}
