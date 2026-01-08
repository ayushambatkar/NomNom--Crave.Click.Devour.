import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService],
  imports: [ConfigModule],
})
export class RedisModule {}
