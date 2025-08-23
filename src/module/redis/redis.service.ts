import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    const nodeEnv = this.configService.get('NODE_ENV');
    const isDevelopment = nodeEnv === 'development';

    let redisConfig;

    if (isDevelopment) {
      // Development: sử dụng Redis local
      redisConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        retryStrategy: (times) => Math.min(times * 50, 2000),
      };
      this.logger.log('Using local Redis for development');
    } else {
      // Production/Staging: sử dụng Redis URL (Redis Cloud)
      const redisUrl = this.configService.get('REDIS_URL');
      if (!redisUrl) {
        throw new Error('REDIS_URL is required for production environment');
      }
      redisConfig = redisUrl;
      this.logger.log('Using Redis Cloud for production');
    }

    this.redisClient = new Redis(redisConfig);

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    this.redisClient.on('connect', () => {
      const env = isDevelopment ? 'local Redis' : 'Redis Cloud';
      this.logger.log(`Connected to ${env}`);
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...');
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

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check key existence ${key}: ${error.message}`);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redisClient.expire(key, ttlSeconds);
      this.logger.debug(`Set expiration for key ${key}: ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`Failed to set expiration for key ${key}: ${error.message}`);
      throw new Error(`Redis expire error: ${error.message}`);
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