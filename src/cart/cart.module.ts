import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { GuestCartService } from './guest-cart.service';
import { CartRepository } from './cart.repository';
import { GuestCartRepository } from './guest-cart.repository';
import { RedisModule } from 'src/common/redis/redis.module';
import { RedisService } from 'src/common/redis/redis.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [CartController],
  providers: [
    CartService,
    GuestCartService,
    CartRepository,
    GuestCartRepository,
    RedisService,
  ],
  exports: [CartService, GuestCartService],
})
export class CartModule {}
