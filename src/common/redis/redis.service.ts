import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import IORedis, {
  Redis as IORedisClient,
  RedisOptions,
} from 'ioredis';

@Injectable()
export class RedisService
  implements OnModuleDestroy
{
  private readonly logger = new Logger(
    RedisService.name,
  );
  private client: IORedisClient;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.client = this.createClient();

    this.client.on('connect', () =>
      this.logger.log('Redis connecting...'),
    );
    this.client.on('ready', () =>
      this.logger.log('Redis connection ready'),
    );
    this.client.on('error', (err) =>
      this.logger.error(
        `Redis error: ${err?.message || err}`,
      ),
    );
    this.client.on('end', () =>
      this.logger.warn('Redis connection closed'),
    );
  }

  private createClient(): IORedisClient {
    const url =
      this.config.redisUrl;
    if (url) {
      this.logger.log(
        `Initializing Redis with URL: ${url}`,
      );
      return new IORedis(
        url,
        this.getDefaultOptions(),
        
      );
    }

    const host = this.config.redisHost;
    const port = this.config.redisPort;
    const password = this.config.redisPassword;

    const db =
      this.config.redisDb;

    const options: RedisOptions = {
      host,
      port,
      password,
      db,
      ...this.getDefaultOptions(),
    };

    this.logger.log(
      `Initializing Redis at ${options.host}:${options.port}`,
    );
    return new IORedis(options);
  }

  private getDefaultOptions(): Partial<RedisOptions> {
    return {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    };
  }

  getClient(): IORedisClient {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    const payload = this.serialize(value);
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(
        key,
        payload,
        'EX',
        ttlSeconds,
      );
    }
    return this.client.set(key, payload);
  }

  async get<T = unknown>(
    key: string,
  ): Promise<T | null> {
    const val = await this.client.get(key);
    if (val === null) return null;
    return this.deserialize<T>(val);
  }

  async del(
    key: string | string[],
  ): Promise<number> {
    if (Array.isArray(key))
      return this.client.del(...key);
    return this.client.del(key);
  }

  async expire(
    key: string,
    ttlSeconds: number,
  ): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  private serialize(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (e) {
      this.logger.warn(
        `Failed to JSON.stringify value for key; storing as String: ${(e as Error).message}`,
      );
      return String(value);
    }
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      // fallback to raw string as any
      return value as unknown as T;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
    } catch (e) {
      this.logger.warn(
        `Error during Redis quit(): ${(e as Error).message}. Forcing disconnect...`,
      );
      // ensure socket is closed
      try {
        this.client.disconnect();
      } catch (err) {
        // ignore disconnect errors during shutdown
      }
    }
  }
}
