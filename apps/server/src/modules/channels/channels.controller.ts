import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  async createChannel(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.createChannel(user.id, dto);
  }

  @Get('my-conversations')
  async getUserConversations(@CurrentUser() user: { id: string }) {
    return this.channelsService.getUserConversations(user.id);
  }

  @Get(':id')
  async getChannelById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.channelsService.getChannelById(id, user.id);
  }

  @Post('direct/:targetUserId')
  async getOrCreateDirect(
    @CurrentUser() user: { id: string },
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.channelsService.getOrCreateDirectConversation(user.id, targetUserId);
  }
}
