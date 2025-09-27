import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    UsersModule,
    CartModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UsersService],
})
export class AuthModule { }
