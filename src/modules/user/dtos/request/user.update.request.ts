import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsDate,
    IsEmail,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UserUpdateDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: false,
    })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email?: string;

    @ApiProperty({
        example: faker.person.firstName(),
        required: false,
    })
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => value?.trim())
    firstName?: string;

    @ApiProperty({
        example: faker.person.lastName(),
        required: false,
    })
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => value?.trim())
    lastName?: string;

    @ApiProperty({
        example: 'user-avatars/1234567890abcdef.jpg',
        required: false,
    })
    @IsString()
    @IsOptional()
    avatar?: string;

    @ApiProperty({
        example: 'Apaixonado por música e tecnologia',
        required: false,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    bio?: string;

    @ApiProperty({
        example: '1995-06-15T00:00:00.000Z',
        required: false,
    })
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    birthDate?: Date;

    @ApiProperty({
        example: 'M',
        required: false,
    })
    @IsString()
    @IsOptional()
    gender?: string;

    @ApiProperty({
        example: 'profile-photos/uuid.jpg',
        required: false,
    })
    @IsString()
    @IsOptional()
    profilePhoto?: string;

    @ApiProperty({
        example: ['MUSIC', 'TECH'],
        required: false,
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    interests?: string[];

    @ApiProperty({
        example: -23.5505,
        required: false,
    })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiProperty({
        example: -46.6333,
        required: false,
    })
    @IsNumber()
    @IsOptional()
    longitude?: number;
}
