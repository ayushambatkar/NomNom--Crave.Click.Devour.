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
import { UserEntity } from 'src/users/user.entity';

/**
 * AuthService - Authentication and token management.
 *
 * @description Handles:
 * - Phone number + OTP authentication flow
 * - Guest user login
 * - Guest to registered user upgrade
 * - JWT token generation and refresh
 *
 * Note: Uses hardcoded OTP '123456' for testing.
 */
@Injectable({})
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private userService: UsersService,
    private cartService: CartService,
  ) {}
  private HARD_CODED_OTP = '123456';

  /**
   * Request OTP for phone authentication.
   *
   * @description
   * - In production: would send SMS via provider
   * - For testing: returns hardcoded OTP '123456'
   *
   * @param phoneNumber - Phone number with country code (e.g., '+91...')
   * @param isResend - Whether this is a resend request
   * @returns Object with phoneNumber, otp, and resend flag
   */
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

  /**
   * Verify OTP and authenticate user.
   *
   * @description Flow:
   * 1. Validate OTP matches hardcoded value
   * 2. If user is guest:
   *    - Upgrade to registered user via UsersService
   *    - Ensure cart exists for new user
   * 3. Generate JWT tokens (access + refresh)
   *
   * Guest Upgrade:
   * - Creates DB user with guest's UUID
   * - Migrates guest data from Redis to PostgreSQL
   * - Deletes Redis guest record
   *
   * @param phoneNumber - Phone number to register
   * @param otp - OTP code to verify
   * @param user - Current user entity (guest or registered)
   * @returns Token response with userId, access_token, refresh_token
   * @throws NotFoundException if OTP invalid
   */
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
      await this.cartService.ensureCartForUser(newUserId);
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

  /**
   * Create guest user and return tokens.
   *
   * @description Flow:
   * 1. Create guest user in Redis (UUID, 7-day TTL)
   * 2. Ensure cart record exists for guest
   * 3. Generate JWT tokens with isGuest: true
   *
   * Guest users can:
   * - Browse restaurants and menus
   * - Set delivery address (stored in Redis)
   *
   * Guest users cannot:
   * - Add items to cart
   * - Checkout orders
   * - Update profile
   *
   * @returns Token response with userId, access_token, refresh_token (isGuest: true)
   */
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

  /**
   * Refresh access token using refresh token.
   *
   * @description
   * - Verifies refresh token signature
   * - Extracts user info from payload
   * - Generates new token pair
   *
   * @param refreshToken - Valid refresh token JWT
   * @returns New token response with userId, access_token, refresh_token
   * @throws ForbiddenException if token invalid or expired
   */
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

  /**
   * Generate JWT access and refresh tokens.
   *
   * @description
   * Token contents:
   * - Access: { sub: userId, phoneNumber, isGuest }
   * - Refresh: { sub: userId, phoneNumber, isGuest, type: 'refresh' }
   *
   * Expiration (from config):
   * - Access: JWT_EXPIRES_IN (default: 7d)
   * - Refresh: JWT_REFRESH_EXPIRES_IN (default: 30d)
   *
   * @private
   * @param userId - User UUID
   * @param phoneNumber - User's phone (optional for guests)
   * @param isGuest - Whether user is a guest
   * @returns Token response object
   */
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
