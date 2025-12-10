import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { CartRepository } from './cart.repository';
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
    CartRepository,
    RedisService,
  ],
  exports: [CartService],
})
export class CartModule {}
