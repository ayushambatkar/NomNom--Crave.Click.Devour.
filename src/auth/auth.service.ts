import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "src/users/users.service";
import { CartService } from "src/cart/cart.service";

@Injectable({})
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService, 
        private userService: UsersService,
        private cartService: CartService,
    ) { }
    private HARD_CODED_OTP = '123456';

    async requestOtp(phoneNumber: string, isResend = false) {
        // In a real app, store OTP and expiration; here we just echo
        return { phoneNumber, otp: this.HARD_CODED_OTP, resend: isResend };
    }

    async verifyOtp(phoneNumber: string, otp: string) {
        if (otp !== this.HARD_CODED_OTP) {
            throw new ForbiddenException('Invalid OTP');
        }

        // find or create user by phone via UsersService
        let user = await this.userService.findByPhone(phoneNumber);
        if (!user) {
            user = await this.userService.createPhoneUser(phoneNumber);
        } else if (user.isGuest) {
            // upgrade guest to registered phone user
            user = await this.userService.upgradeGuestToRegistered(user.id);
        }

    // ensure a cart exists for the user via CartService
    await this.cartService.ensureCartForUser(user.id);

        return this.signTokens(user.id, phoneNumber ?? undefined);
    }

    async guestLogin() {
        const user = await this.userService.createGuest();
        await this.cartService.ensureCartForUser(user.id);
        return this.signTokens(user.id);
    }

    async refresh(refreshToken: string) {
        try {
            const payload = await this.jwt.verifyAsync(refreshToken, {
                secret: this.config.get('JWT_SECRET'),
            });
            return this.signTokens(payload.sub, payload.phoneNumber);
        } catch (e) {
            throw new ForbiddenException('Invalid refresh token');
        }
    }

    // cart initialization delegated to CartService

    private async signTokens(userId: string, phoneNumber?: string | undefined) {
        const accessPayload = { sub: userId, phoneNumber };
        const refreshPayload = { sub: userId, phoneNumber, type: 'refresh' };
        const access_token = await this.jwt.signAsync(accessPayload, {
            expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '7d',
            secret: this.config.get('JWT_SECRET'),
            algorithm: 'HS256',
        });
        const refresh_token = await this.jwt.signAsync(refreshPayload, {
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
            secret: this.config.get('JWT_REFRESH_SECRET') ?? this.config.get('JWT_SECRET'),
            algorithm: 'HS256',
        });
        return { userId, access_token, refresh_token };
    }
}