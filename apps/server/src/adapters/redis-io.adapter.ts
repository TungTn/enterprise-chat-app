import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(
    redisHost = process.env.REDIS_HOST || 'localhost',
    redisPort = parseInt(process.env.REDIS_PORT || '6379', 10),
    redisPassword = process.env.REDIS_PASSWORD || undefined,
  ): Promise<void> {
    try {
      const pubClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });

      const subClient = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.on('ready', () => resolve());
          pubClient.on('error', (err) => reject(err));
        }),
        new Promise<void>((resolve, reject) => {
          subClient.on('ready', () => resolve());
          subClient.on('error', (err) => reject(err));
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`⚡ Connected to Redis Pub/Sub at ${redisHost}:${redisPort} for Socket.io Scaling`);
    } catch (err: any) {
      this.logger.warn(`⚠️ Could not connect to Redis Pub/Sub (${err.message}). Falling back to in-memory Socket.io adapter.`);
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
