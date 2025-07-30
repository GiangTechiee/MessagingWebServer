import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      this.logger.debug(`Set key ${key} with TTL ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`Failed to set key ${key}: ${error.message}`);
      throw new Error(`Redis set error: ${error.message}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}: ${error.message}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
      this.logger.debug(`Deleted key ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}: ${error.message}`);
      throw new Error(`Redis delete error: ${error.message}`);
    }
  }

  async addToList(key: string, value: unknown): Promise<void> {
    try {
      await this.redisClient.lpush(key, JSON.stringify(value));
      this.logger.debug(`Added to list ${key}`);
    } catch (error) {
      this.logger.error(`Failed to add to list ${key}: ${error.message}`);
      throw new Error(`Redis list error: ${error.message}`);
    }
  }

  async getList<T>(key: string, start: number = 0, end: number = -1): Promise<T[]> {
    try {
      const data = await this.redisClient.lrange(key, start, end);
      return data.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error(`Failed to get list ${key}: ${error.message}`);
      return [];
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    this.logger.log('Disconnected from Redis');
  }

  get client(): Redis {
    return this.redisClient;
  }
}