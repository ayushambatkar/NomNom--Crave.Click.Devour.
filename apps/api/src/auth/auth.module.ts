import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { UsersModule } from 'apps/api/src/users/users.module';
import { UsersService } from 'apps/api/src/users/users.service';
import { CartModule } from 'apps/api/src/cart/cart.module';
import { RedisModule } from '@app/redis/redis.module';
import { RedisService } from '@app/redis/redis.service';
import { LoggerService } from '@app/common';

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
    LoggerService
  ],
})
export class AuthModule {}
