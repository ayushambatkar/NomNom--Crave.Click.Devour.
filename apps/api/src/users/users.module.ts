import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { UserRepository } from './user.repository';
import { GuestUserService } from './guest-user.service';
import { GuestUserRepository } from './guest-user.repository';
import { RedisModule } from '@app/redis/redis.module';
import { RedisService } from '@app/redis/redis.service';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';
import { LoggerService } from '@app/common';

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
