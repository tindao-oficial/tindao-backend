import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class EventCreateDto {
    @ApiProperty({ example: 'Balada do Mês' })
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    title: string;

    @ApiProperty({ example: 'A maior festa universitária do semestre.' })
    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    description: string;

    @ApiProperty({
        enum: $Enums.EventCategory,
        example: $Enums.EventCategory.NIGHTLIFE,
    })
    @IsEnum($Enums.EventCategory)
    category: $Enums.EventCategory;

    @ApiProperty({ example: 'event-covers/uuid.jpg', required: false })
    @IsString()
    @IsOptional()
    coverImage?: string;

    @ApiProperty({ example: 'São Paulo' })
    @IsString()
    city: string;

    @ApiProperty({ example: 'Clube X' })
    @IsString()
    venueName: string;

    @ApiProperty({ example: 'Rua das Flores, 123' })
    @IsString()
    address: string;

    @ApiProperty({ example: -23.5505, required: false })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiProperty({ example: -46.6333, required: false })
    @IsNumber()
    @IsOptional()
    longitude?: number;

    @ApiProperty({ example: faker.date.future().toISOString() })
    @IsDate()
    @Type(() => Date)
    startAt: Date;

    @ApiProperty({ example: faker.date.future().toISOString() })
    @IsDate()
    @Type(() => Date)
    endAt: Date;

    @ApiProperty({
        enum: $Enums.SubEventPermissionMode,
        example: $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
        required: false,
    })
    @IsEnum($Enums.SubEventPermissionMode)
    @IsOptional()
    prePartyPermissionMode?: $Enums.SubEventPermissionMode;

    @ApiProperty({
        enum: $Enums.SubEventPermissionMode,
        example: $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
        required: false,
    })
    @IsEnum($Enums.SubEventPermissionMode)
    @IsOptional()
    afterPartyPermissionMode?: $Enums.SubEventPermissionMode;

    @ApiProperty({
        example: false,
        required: false,
        description:
            'Se true, o evento não aparece na listagem pública — acessível apenas via link/QR de convite',
    })
    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;

    @ApiProperty({
        example: false,
        required: false,
        description:
            'Se true, marca o evento como oficial. Apenas organizadores podem criar eventos oficiais.',
    })
    @IsBoolean()
    @IsOptional()
    isOfficial?: boolean;
}
