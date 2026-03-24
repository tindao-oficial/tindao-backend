import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CacheService } from 'src/common/cache/services/cache.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh'
) {
    constructor(
        private configService: ConfigService,
        private cacheService: CacheService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('auth.refreshToken.secret'),
        });
    }

    async validate(payload: Record<string, string | number>) {
        const logoutAt = await this.cacheService.get<number>(
            `auth:logout:${payload.userId}`
        );
        if (logoutAt !== null && (payload.iat as number) <= logoutAt) {
            throw new UnauthorizedException(
                'auth.error.refreshTokenUnauthorized'
            );
        }
        return payload;
    }
}
