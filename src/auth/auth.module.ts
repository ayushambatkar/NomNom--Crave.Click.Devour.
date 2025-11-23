import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { CartModule } from 'src/cart/cart.module';
import { RedisModule } from 'src/common/redis/redis.module';
import { RedisService } from 'src/common/redis/redis.service';
import { GuestCartService } from 'src/cart/guest-cart.service';
import { GuestUserService } from 'src/users/guest-user.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    UsersModule,
    CartModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RedisService,
  ],
})
export class AuthModule {}
