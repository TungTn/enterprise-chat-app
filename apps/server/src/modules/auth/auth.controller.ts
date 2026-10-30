import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { BpmSsoDto } from './dto/bpm-sso.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      if (raw) return raw.trim().replace(/^.*:/, '');
    }
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip.trim().replace(/^.*:/, '');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = this.getClientIp(req);
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post('bpm-sso')
  async bpmSso(@Body() dto: BpmSsoDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = this.getClientIp(req);
    return this.authService.bpmSsoLogin(dto, userAgent, ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    return this.authService.logout(user.id, ipAddress);
  }

  @Get('sync-session')
  async getSyncSession(@Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    return this.authService.getSyncedSession(ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sync-session')
  async setSyncSession(@Body() dto: BpmSsoDto, @Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    return this.authService.setSyncedSession(ipAddress, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('sync-session')
  async clearSyncSession(@Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    this.authService.clearSyncedSession(ipAddress);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
