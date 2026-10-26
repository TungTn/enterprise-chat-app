import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, PresenceStatus } from '@enterprise-chat/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trong hệ thống');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        departmentId: dto.departmentId || null,
        role: dto.role || UserRole.EMPLOYEE,
        status: PresenceStatus.ONLINE,
      },
      include: {
        department: true,
      },
    });

    // Auto add new employee to company-wide public channels
    const companyChannels = await this.prisma.conversation.findMany({
      where: { scope: 'COMPANY' },
    });

    for (const channel of companyChannels) {
      await this.prisma.conversationMember.create({
        data: {
          conversationId: channel.id,
          userId: user.id,
          role: 'MEMBER',
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { department: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Update presence to ONLINE
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: PresenceStatus.ONLINE },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Save refresh token session
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: PresenceStatus.ONLINE,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'enterprise_default_refresh_secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { department: true },
      });

      if (!user) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token đã hết hạn hoặc không hợp lệ');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: PresenceStatus.OFFLINE },
    });

    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Đăng xuất thành công' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET') || 'enterprise_default_secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'enterprise_default_refresh_secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
