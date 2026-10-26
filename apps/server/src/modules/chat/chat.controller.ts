import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendMessageDto } from '@enterprise-chat/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.chatService.getMessages(conversationId, user.id, cursor, limitNum);
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id') messageId: string,
    @CurrentUser() user: { id: string },
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(messageId, user.id, content);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') messageId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.chatService.deleteMessage(messageId, user.id, user.role);
  }

  @Post('messages/:id/reactions')
  async addReaction(
    @Param('id') messageId: string,
    @CurrentUser() user: { id: string },
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(messageId, user.id, emoji);
  }
}
