import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { CartService } from 'src/cart/cart.service';
import { User } from '@prisma/client';
import { UserExtensions } from 'src/users/user.extension';
import { GuestCartService } from 'src/cart/guest-cart.service';
import { UserEntity } from 'src/users/user.entity';

@Injectable({})
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private userService: UsersService,
    private cartService: CartService,
    private guestCartService: GuestCartService,
  ) {}
  private HARD_CODED_OTP = '123456';

  async requestOtp(
    phoneNumber: string,
    isResend = false,
  ) {
    // In a real app, store OTP and expiration; here we just echo
    return {
      phoneNumber,
      otp: this.HARD_CODED_OTP,
      resend: isResend,
    };
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    user: UserEntity,
  ) {
    // otp verification
    if (otp !== this.HARD_CODED_OTP) {
      throw new NotFoundException('Invalid OTP');
    }

    if (user.isGuest) {
      // upgrade and migrate cart; id remains same (we create DB user with guest id)
      const newUserId =
        await this.userService.upgradeGuestToRegistered(
          user.id,
          phoneNumber,
        );
      await this.guestCartService.migrateGuestCartToDb(
        {
          guestUserId: user.id,
          newUserId: newUserId,
        },
      );
      return this.signTokens(
        newUserId,
        phoneNumber,
        false,
      );
    }

    // already registered
    return this.signTokens(
      user.id,
      phoneNumber,
      false,
    );
  }

  async guestLogin() {
    const user =
      await this.userService.createGuest();
    // Cart will be created lazily on first access, but we can ensure a key exists
    await this.cartService.ensureCartForUser(
      user.id,
    );
    return this.signTokens(
      user.id,
      undefined,
      true,
    );
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(
        refreshToken,
        {
          secret: this.config.get('JWT_SECRET'),
        },
      );
      return this.signTokens(
        payload.sub,
        payload.phoneNumber,
      );
    } catch (e) {
      throw new ForbiddenException(
        'Invalid refresh token',
      );
    }
  }

  // cart initialization delegated to CartService

  private async signTokens(
    userId: string,
    phoneNumber?: string,
    isGuest: boolean = false,
  ) {
    const accessPayload = {
      sub: userId,
      phoneNumber,
      isGuest,
    };
    const refreshPayload = {
      sub: userId,
      phoneNumber,
      isGuest,
      type: 'refresh',
    };
    const access_token = await this.jwt.signAsync(
      accessPayload,
      {
        expiresIn:
          this.config.get('JWT_EXPIRES_IN') ??
          '7d',
        secret: this.config.get('JWT_SECRET'),
        algorithm: 'HS256',
      },
    );
    const refresh_token =
      await this.jwt.signAsync(refreshPayload, {
        expiresIn:
          this.config.get(
            'JWT_REFRESH_EXPIRES_IN',
          ) ?? '30d',
        secret:
          this.config.get('JWT_REFRESH_SECRET') ??
          this.config.get('JWT_SECRET'),
        algorithm: 'HS256',
      });
    return {
      userId,
      access_token,
      refresh_token,
    };
  }
}
