import { Injectable } from '@nestjs/common';
import { ConfigService } from '@app/common/config/config.service';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';
import { GuestUserService } from 'apps/api/src/users/guest-user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt',
) {
  constructor(
    config: ConfigService,
    private prismaService: PrismaService,
    private guestUserService: GuestUserService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtSecret,
    });
  }

  /**
   * Override of the strategy's validate method.
   *
   * Validates the decoded JWT payload and resolves to a user-like object or null.
   * If payload.isGuest is true, attempts to look up a guest record via guestUserService;
   * if found, returns a minimal guest representation ({ id, isGuest: true, phoneNumber: null }).
   * Otherwise, resolves to the persisted user record fetched from prismaService.user.findUnique.
   *
   * @override
   * @param payload - Decoded JWT payload; expected to include `sub` (user id) and optional `isGuest` flag.
   * @returns A Promise that resolves to the user record, a guest representation, or null if no user/guest is found.
   */
  async validate(payload: any) {
    if (payload.isGuest) {
      const g =
        await this.guestUserService.getGuest(
          payload.sub,
        );
      if (!g) return null;
      return {
        id: payload.sub,
        isGuest: true,
        phoneNumber: null,
      };
    }
    const p: PrismaService = this.prismaService;
    return p.user.findUnique({
      where: { id: payload.sub },
    });
  }
}
