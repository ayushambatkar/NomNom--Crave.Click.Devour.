import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { GuestUserService } from './guest-user.service';
import { GuestUserRepository } from './guest-user.repository';
import { RedisModule } from 'src/common/redis/redis.module';
import { RedisService } from 'src/common/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [UsersController],
  providers: [
    UserRepository,
    GuestUserRepository,
    GuestUserService,
    PrismaService,
    RedisService,
    UsersService,
    LoggerService,
  ],
  exports: [UsersService, GuestUserService],
})
export class UsersModule {}
