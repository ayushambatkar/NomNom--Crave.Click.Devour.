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
import { LoggerService } from 'src/common/logger/logger.service';

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
