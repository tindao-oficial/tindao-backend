import { InjectQueue } from '@nestjs/bull';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { Queue } from 'bull';
import { OAuth2Client } from 'google-auth-library';

import { APP_BULL_QUEUES } from 'src/app/enums/app.enum';
import { AWS_SES_EMAIL_TEMPLATES } from 'src/common/aws/enums/aws.ses.enum';
import { DatabaseService } from 'src/common/database/services/database.service';
import {
    ISendEmailBasePayload,
    IWelcomeEmailDataPaylaod,
} from 'src/common/helper/interfaces/email.interface';

import { HelperEncryptionService } from '../../helper/services/helper.encryption.service';
import { IAuthUser } from '../../request/interfaces/request.interface';
import { GoogleAuthDto } from '../dtos/request/auth.google.dto';
import { UserLoginDto } from '../dtos/request/auth.login.dto';
import { UserCreateDto } from '../dtos/request/auth.signup.dto';
import {
    AuthRefreshResponseDto,
    AuthResponseDto,
} from '../dtos/response/auth.response.dto';
import { IAuthService } from '../interfaces/auth.service.interface';

@Injectable()
export class AuthService implements IAuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly configService: ConfigService,
        @InjectQueue(APP_BULL_QUEUES.EMAIL)
        private emailQueue: Queue
    ) {
        this.googleClient = new OAuth2Client();
    }

    public async login(data: UserLoginDto): Promise<AuthResponseDto> {
        try {
            const { email, password } = data;

            const user = await this.databaseService.user.findUnique({
                where: { email },
            });

            if (!user) {
                throw new HttpException(
                    'user.error.userNotFound',
                    HttpStatus.NOT_FOUND
                );
            }

            if (!user.password) {
                throw new HttpException(
                    'auth.error.useGoogleLogin',
                    HttpStatus.BAD_REQUEST
                );
            }

            const passwordMatched = await this.helperEncryptionService.match(
                user.password,
                password
            );

            if (!passwordMatched) {
                throw new HttpException(
                    'auth.error.invalidPassword',
                    HttpStatus.BAD_REQUEST
                );
            }

            const tokens = await this.helperEncryptionService.createJwtTokens({
                role: user.role,
                userId: user.id,
            });

            return {
                ...tokens,
                user,
            };
        } catch (error) {
            throw error;
        }
    }

    public async signup(data: UserCreateDto): Promise<AuthResponseDto> {
        try {
            const { email, firstName, lastName, password, isOrganizer } = data;

            const existingUser = await this.databaseService.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new HttpException(
                    'user.error.userExists',
                    HttpStatus.CONFLICT
                );
            }

            const hashed =
                await this.helperEncryptionService.createHash(password);

            const createdUser = await this.databaseService.user.create({
                data: {
                    email,
                    password: hashed,
                    firstName: firstName?.trim(),
                    lastName: lastName?.trim(),
                    role: Role.USER,
                    isOrganizer: isOrganizer ?? false,
                },
            });

            const tokens = await this.helperEncryptionService.createJwtTokens({
                role: createdUser.role,
                userId: createdUser.id,
            });

            this.emailQueue.add(
                AWS_SES_EMAIL_TEMPLATES.WELCOME_EMAIL,
                {
                    data: {
                        firstName: createdUser.firstName ?? createdUser.email,
                    },
                    toEmails: [email],
                } as ISendEmailBasePayload<IWelcomeEmailDataPaylaod>,
                { delay: 15000 }
            );

            return {
                ...tokens,
                user: createdUser,
            };
        } catch (error) {
            throw error;
        }
    }

    public async googleLogin(data: GoogleAuthDto): Promise<AuthResponseDto> {
        const googleClientId = this.configService.get<string>(
            'auth.googleClientId'
        );

        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: data.idToken,
                audience: googleClientId,
            });
            payload = ticket.getPayload();
        } catch (error) {
            this.logger.warn(
                `Google token verification failed: ${error.message}`
            );
            throw new HttpException(
                'auth.error.invalidGoogleToken',
                HttpStatus.UNAUTHORIZED
            );
        }

        if (!payload?.email) {
            throw new HttpException(
                'auth.error.invalidGoogleToken',
                HttpStatus.UNAUTHORIZED
            );
        }

        const {
            email,
            sub: googleId,
            given_name,
            family_name,
            picture,
        } = payload;

        // Upsert: find by googleId first, then by email, or create new
        let user = await this.databaseService.user.findFirst({
            where: {
                OR: [{ googleId }, { email }],
                deletedAt: null,
            },
        });

        if (user) {
            // Link googleId if not yet linked, and update name/photo from Google
            user = await this.databaseService.user.update({
                where: { id: user.id },
                data: {
                    googleId: user.googleId ?? googleId,
                    firstName: user.firstName ?? given_name ?? null,
                    lastName: user.lastName ?? family_name ?? null,
                    profilePhoto: user.profilePhoto ?? picture ?? null,
                },
            });
        } else {
            user = await this.databaseService.user.create({
                data: {
                    email,
                    googleId,
                    firstName: given_name ?? null,
                    lastName: family_name ?? null,
                    profilePhoto: picture ?? null,
                    role: Role.USER,
                    isOrganizer: false,
                },
            });

            this.emailQueue.add(
                AWS_SES_EMAIL_TEMPLATES.WELCOME_EMAIL,
                {
                    data: { firstName: user.firstName ?? email },
                    toEmails: [email],
                } as ISendEmailBasePayload<IWelcomeEmailDataPaylaod>,
                { delay: 15000 }
            );
        }

        const tokens = await this.helperEncryptionService.createJwtTokens({
            role: user.role,
            userId: user.id,
        });

        return { ...tokens, user };
    }

    public async refreshTokens(
        payload: IAuthUser
    ): Promise<AuthRefreshResponseDto> {
        return this.helperEncryptionService.createJwtTokens({
            userId: payload.userId,
            role: payload.role,
        });
    }
}
