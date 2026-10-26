import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ChatModule } from './modules/chat/chat.module';
import { FilesModule } from './modules/files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChannelsModule,
    ChatModule,
    FilesModule,
  ],
})
export class AppModule {}
