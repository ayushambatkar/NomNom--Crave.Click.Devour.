import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import {
    ExtractJwt,
    Strategy,
} from 'passport-jwt';
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
    'jwt'
) {
    constructor(config: ConfigService, private prismaService: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET'),
        })
    }

    validate(payload: any) {
        const p: PrismaService = this.prismaService as PrismaService;
        return p.user.findUnique({ where: { id: payload.sub } });
    }

}