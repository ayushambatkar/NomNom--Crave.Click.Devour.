import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { UsersModule } from 'apps/api/src/users/users.module';
import { CartRepository } from './cart.repository';
import { RedisModule } from '@app/redis/redis.module';
import { RedisService } from '@app/redis/redis.service';
import { LoggerService } from '@app/common';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    RedisService,
    LoggerService,
  ],
  exports: [CartService],
})
export class CartModule {}
