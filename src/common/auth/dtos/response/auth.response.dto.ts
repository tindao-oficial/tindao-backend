import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNumber,
    IsString,
    ValidateNested,
} from 'class-validator';

import { UserResponseDto } from 'src/modules/user/dtos/response/user.response';

export class TokenDto {
    @ApiProperty({
        example: faker.string.alphanumeric({ length: 64 }),
        required: true,
    })
    @Expose()
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @ApiProperty({
        example: faker.string.alphanumeric({ length: 64 }),
        required: true,
    })
    @Expose()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;

    @ApiProperty({
        example: 1742234567890,
        description:
            'Access token expiration as epoch timestamp in milliseconds',
    })
    @Expose()
    @IsNumber()
    expiresAt: number;
}

export class AuthResponseDto extends TokenDto {
    @ApiProperty({
        type: () => UserResponseDto,
        required: true,
    })
    @Expose()
    @Type(() => UserResponseDto)
    @ValidateNested()
    user: UserResponseDto;
}

export class AuthRefreshResponseDto extends TokenDto {}
