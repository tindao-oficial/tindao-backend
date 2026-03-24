import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CacheService } from 'src/common/cache/services/cache.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
    Strategy,
    'jwt-access'
) {
    constructor(
        private configService: ConfigService,
        private cacheService: CacheService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('auth.accessToken.secret'),
        });
    }

    async validate(payload: Record<string, string | number>) {
        const logoutAt = await this.cacheService.get<number>(
            `auth:logout:${payload.userId}`
        );
        if (logoutAt !== null && (payload.iat as number) <= logoutAt) {
            throw new UnauthorizedException(
                'auth.error.accessTokenUnauthorized'
            );
        }
        return payload;
    }
}
