import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PresenceStatus } from '@enterprise-chat/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query('search') search?: string, @Query('departmentId') departmentId?: string) {
    return this.usersService.findAll(search, departmentId);
  }

  @Get('departments')
  async getDepartments() {
    return this.usersService.getDepartments();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      status?: PresenceStatus;
      statusMessage?: string;
      avatarUrl?: string;
      phoneNumber?: string | null;
      fullName?: string;
    },
  ) {
    return this.usersService.updateProfile(user.id, body);
  }
}
