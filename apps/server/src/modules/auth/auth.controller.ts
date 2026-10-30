import {
  Controller,
  Post,
  Body,
  Get,
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

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post('bpm-sso')
  async bpmSso(@Body() dto: BpmSsoDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
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
  async logout(@CurrentUser() user: { id: string }) {
    return this.authService.logout(user.id);
  }

  @Get('sync-session')
  async getSyncSession(@Req() req: Request) {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '');
    return this.authService.getSyncedSession(ipAddress);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sync-session')
  async setSyncSession(@Body() dto: BpmSsoDto, @Req() req: Request) {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '');
    return this.authService.setSyncedSession(ipAddress, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
