import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from '@app/common';

@Global()
@Module({
  providers: [RedisService, CacheService, LoggerService],
  exports: [RedisService, CacheService],
  imports: [ConfigModule],
})
export class RedisModule {}
