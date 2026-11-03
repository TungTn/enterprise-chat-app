import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { UrlMetadataService } from './url-metadata.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, UrlMetadataService],
  exports: [ChatService, ChatGateway, UrlMetadataService],
})
export class ChatModule {}
