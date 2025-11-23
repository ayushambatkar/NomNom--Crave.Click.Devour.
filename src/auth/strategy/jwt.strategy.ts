import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { GuestUserService } from 'src/users/guest-user.service';

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
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

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
