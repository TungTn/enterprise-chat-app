import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  async summarize(
    @Body('conversationId') conversationId: string,
    @Body('apiKey') apiKey?: string,
    @Headers('x-gemini-api-key') headerApiKey?: string,
  ) {
    const key = apiKey || headerApiKey;
    return this.aiService.summarizeConversation(conversationId, key);
  }
}
