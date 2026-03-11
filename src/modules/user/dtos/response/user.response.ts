import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { $Enums, User } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsEmail,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class UserResponseDto implements Partial<User> {
    @ApiProperty({
        example: faker.string.uuid(),
    })
    @Expose()
    @IsUUID()
    id: string;

    @ApiProperty({
        example: faker.internet.email(),
    })
    @Expose()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: faker.person.firstName(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    firstName: string | null;

    @ApiProperty({
        example: faker.person.lastName(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    lastName: string | null;

    @ApiProperty({
        example: faker.image.avatar(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    avatar: string | null;

    @ApiProperty({
        example: faker.internet.username(),
    })
    @Expose()
    @IsString()
    userName: string;

    @ApiProperty({
        example: faker.phone.number(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    phone: string | null;

    @ApiProperty({
        enum: $Enums.Role,
        example: faker.helpers.arrayElement(Object.values($Enums.Role)),
    })
    @Expose()
    @IsEnum($Enums.Role)
    role: $Enums.Role;

    @ApiProperty({
        example: faker.datatype.boolean(),
    })
    @Expose()
    @IsBoolean()
    isVerified: boolean;

    @ApiProperty({
        example: 'Apaixonado por música e tecnologia',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    bio: string | null;

    @ApiProperty({
        example: '1995-06-15T00:00:00.000Z',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsDate()
    @IsOptional()
    birthDate: Date | null;

    @ApiProperty({
        example: 'M',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    gender: string | null;

    @ApiProperty({
        example: 'profile-photos/uuid.jpg',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    profilePhoto: string | null;

    @ApiProperty({
        example: ['MUSIC', 'TECH'],
        type: [String],
    })
    @Expose()
    @IsArray()
    @IsString({ each: true })
    interests: string[];

    @ApiProperty({
        example: -23.5505,
        required: false,
        nullable: true,
    })
    @Expose()
    @IsNumber()
    @IsOptional()
    latitude: number | null;

    @ApiProperty({
        example: -46.6333,
        required: false,
        nullable: true,
    })
    @Expose()
    @IsNumber()
    @IsOptional()
    longitude: number | null;

    @ApiProperty({
        example: false,
    })
    @Expose()
    @IsBoolean()
    isOrganizer: boolean;

    @ApiProperty({
        example: faker.date.past().toISOString(),
    })
    @Expose()
    @IsDate()
    createdAt: Date;

    @ApiProperty({
        example: faker.date.recent().toISOString(),
    })
    @Expose()
    @IsDate()
    updatedAt: Date;

    @ApiProperty({
        example: faker.date.future().toISOString(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsDate()
    @IsOptional()
    deletedAt: Date | null;

    @ApiHideProperty()
    @Exclude()
    password: string;
}

export class UserGetProfileResponseDto extends UserResponseDto {}

export class UserUpdateProfileResponseDto extends UserResponseDto {}
