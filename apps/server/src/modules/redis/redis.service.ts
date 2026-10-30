import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn(`Redis connection retries exceeded (attempt ${times}). Backing off.`);
            return null;
          }
          return Math.min(times * 300, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`⚡ Connected to Redis Service at ${host}:${port}`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️ Redis Service connection issue: ${err.message}. Operations will fallback gracefully.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ Could not initialize Redis Service (${err.message}). Running in DB-fallback mode.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.isConnected = false;
    }
  }

  public isReady(): boolean {
    return this.isConnected && Boolean(this.client) && this.client?.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (e: any) {
      this.logger.warn(`Redis GET error for key ${key}: ${e.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (e: any) {
      this.logger.warn(`Redis SET error for key ${key}: ${e.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      await this.client.del(key);
    } catch (e: any) {
      this.logger.warn(`Redis DEL error for key ${key}: ${e.message}`);
    }
  }

  private getMemberKey(conversationId: string): string {
    return `cache:conv:${conversationId}:members`;
  }

  async getConversationMembers(conversationId: string): Promise<string[] | null> {
    const raw = await this.get(this.getMemberKey(conversationId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async setConversationMembers(
    conversationId: string,
    memberUserIds: string[],
    ttlSeconds = 3600,
  ): Promise<void> {
    if (!memberUserIds || memberUserIds.length === 0) return;
    await this.set(this.getMemberKey(conversationId), JSON.stringify(memberUserIds), ttlSeconds);
  }

  async invalidateConversationMembers(conversationId: string): Promise<void> {
    await this.del(this.getMemberKey(conversationId));
  }

  private static readonly PRESENCE_HASH = 'presence:users';

  async setUserPresence(userId: string, status: string): Promise<void> {
    if (!this.isReady() || !this.client) return;
    try {
      await this.client.hset(RedisService.PRESENCE_HASH, userId, status);
    } catch (e: any) {
      this.logger.warn(`Redis setUserPresence error: ${e.message}`);
    }
  }

  async getUserPresence(userId: string): Promise<string | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      return await this.client.hget(RedisService.PRESENCE_HASH, userId);
    } catch (e: any) {
      this.logger.warn(`Redis getUserPresence error: ${e.message}`);
      return null;
    }
  }

  async getAllUserPresences(): Promise<Record<string, string>> {
    if (!this.isReady() || !this.client) return {};
    try {
      return (await this.client.hgetall(RedisService.PRESENCE_HASH)) || {};
    } catch (e: any) {
      this.logger.warn(`Redis getAllUserPresences error: ${e.message}`);
      return {};
    }
  }
}
