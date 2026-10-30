import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelMemberRole, ChannelScope, ConversationType } from '@enterprise-chat/shared-types';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

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

    await this.redisService.invalidateConversationMembers(channel.id);
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
                    phoneNumber: true,
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

    // Pre-fetch lastRead messages to compare sequence/timestamp
    const lastReadIds = memberships
      .map((m) => m.lastReadMessageId)
      .filter(Boolean) as string[];

    const lastReadMsgs = lastReadIds.length > 0
      ? await this.prisma.message.findMany({
          where: { id: { in: lastReadIds } },
          select: { id: true, createdAt: true, sequenceNumber: true },
        })
      : [];
    const lastReadMap = new Map(lastReadMsgs.map((msg) => [msg.id, msg]));

    const counts = await Promise.all(
      memberships.map(async (m) => {
        const lastRead = m.lastReadMessageId ? lastReadMap.get(m.lastReadMessageId) : null;
        if (!lastRead) {
          return this.prisma.message.count({
            where: {
              conversationId: m.conversationId,
              senderId: { not: userId },
            },
          });
        }
        return this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            ...(lastRead.sequenceNumber != null
              ? { sequenceNumber: { gt: lastRead.sequenceNumber } }
              : { createdAt: { gt: lastRead.createdAt } }),
          },
        });
      })
    );

    return memberships.map((m, idx) => {
      const conv = m.conversation;
      const lastMsg = conv.messages[0] || null;
      const otherMember = conv.members.find((mem) => mem.userId !== userId);
      const displayName =
        conv.type === ConversationType.DIRECT
          ? conv.name || otherMember?.user?.fullName || 'Trò chuyện 1-1'
          : conv.name;

      return {
        id: conv.id,
        type: conv.type,
        name: displayName,
        scope: conv.scope,
        description: conv.description,
        departmentId: conv.departmentId,
        myRole: m.role,
        lastReadMessageId: m.lastReadMessageId,
        unreadCount: counts[idx] || 0,
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
                phoneNumber: true,
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

    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        phoneNumber: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${targetUserId}`);
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
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    let conv = existing;

    if (!conv) {
      // Create new direct conversation
      conv = await this.prisma.conversation.create({
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
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });
      await this.redisService.setConversationMembers(conv.id, [userId, targetUserId]);
    }

    const otherMember = conv.members.find((m) => m.userId !== userId);
    return {
      id: conv.id,
      type: conv.type,
      name: conv.name || otherMember?.user?.fullName || targetUser.fullName || 'Trò chuyện 1-1',
      scope: conv.scope,
      description: conv.description,
      departmentId: conv.departmentId,
      unreadCount: 0,
      lastMessage: null,
      members: conv.members.map((mem) => mem.user),
    };
  }
}
