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
import { SendMessageDto, SOCKET_EVENTS } from '@enterprise-chat/shared-types';
import { ChatGateway } from './chat.gateway';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

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

  @Post('conversations/:id/read')
  async markConversationAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    const res = await this.chatService.markConversationAsRead(conversationId, user.id);
    const payload = {
      conversationId,
      userId: user.id,
      messageId: res.lastReadMessageId,
    };
    this.chatGateway.server?.to(`user:${user.id}`).emit(SOCKET_EVENTS.READ_RECEIPT, payload);
    this.chatGateway.server?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.READ_RECEIPT, payload);
    return res;
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(user.id, dto);
    await this.chatGateway.broadcastNewMessage(message);
    return message;
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

  @Get('messages/:id/read-receipts')
  async getReadReceipts(
    @Param('id') messageId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.chatService.getReadReceipts(messageId, user.id);
  }

  @Get('conversations/:id/sync')
  async syncDelta(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Query('sinceSeq') sinceSeq?: string,
    @Query('limit') limit?: string,
  ) {
    const seq = sinceSeq ? parseInt(sinceSeq, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.chatService.syncDeltaMessages(conversationId, user.id, seq, limitNum);
  }

  @Get('webrtc/ice-servers')
  async getIceServers() {
    return this.chatService.getIceServers();
  }

  @Post('call/livekit-token')
  async getLiveKitToken(
    @CurrentUser() user: { id: string; fullName: string },
    @Body('conversationId') conversationId: string,
  ) {
    return this.chatService.generateLiveKitToken(conversationId, user.id, user.fullName);
  }
}
