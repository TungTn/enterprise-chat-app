import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PresenceStatus, UserRole } from '@enterprise-chat/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, departmentId?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        statusMessage: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((u) => ({
      ...u,
      departmentName: u.department?.name || null,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      statusMessage: user.statusMessage,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, data: { status?: PresenceStatus; statusMessage?: string; avatarUrl?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { department: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      status: updated.status,
      statusMessage: updated.statusMessage,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name || null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async getDepartments() {
    return this.prisma.department.findMany({
      include: {
        _count: { select: { members: true, channels: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
