import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RefreshDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';
import { SnakeBody } from 'apps/api/src/common/decorators/snake-body.decorator';
import { GetUser } from './decorator/get-user.decorator';
import { JwtGuard } from './guard';
import type { User } from '@prisma/client';
import { UserEntity } from 'apps/api/src/users/user.entity';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  @Post('request-otp')
  requestOtp(
    @SnakeBody(RequestOtpDto) dto: RequestOtpDto,
  ) {
    return this.authService.requestOtp(
      dto.phoneNumber,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  @UseGuards(JwtGuard)
  resendOtp(
    @SnakeBody(RequestOtpDto) dto: RequestOtpDto,
  ) {
    return this.authService.requestOtp(
      dto.phoneNumber,
      true,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @UseGuards(JwtGuard)
  verifyOtp(
    @GetUser() user: any,
    @SnakeBody(VerifyOtpDto) dto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(
      dto.phoneNumber,
      dto.otp,
      UserEntity.fromGuest(user),
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('guest')
  guestLogin() {
    return this.authService.guestLogin();
  }

  /**
   * Refresh the access and refresh tokens
   * using a valid refresh token.
   */
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @SnakeBody(RefreshDto) dto: RefreshDto,
  ) {
    return this.authService.refresh(
      dto.refreshToken,
    );
  }
}
