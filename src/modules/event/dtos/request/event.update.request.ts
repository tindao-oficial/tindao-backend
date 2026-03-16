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

export class EventUpdateDto {
    @ApiProperty({ example: 'Balada do Mês', required: false })
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @IsOptional()
    title?: string;

    @ApiProperty({
        example: 'A maior festa universitária do semestre.',
        required: false,
    })
    @IsString()
    @MinLength(10)
    @MaxLength(2000)
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: $Enums.EventCategory, required: false })
    @IsEnum($Enums.EventCategory)
    @IsOptional()
    category?: $Enums.EventCategory;

    @ApiProperty({ example: 'event-covers/uuid.jpg', required: false })
    @IsString()
    @IsOptional()
    coverImage?: string;

    @ApiProperty({ example: 'São Paulo', required: false })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ example: 'Clube X', required: false })
    @IsString()
    @IsOptional()
    venueName?: string;

    @ApiProperty({ example: 'Rua das Flores, 123', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: -23.5505, required: false })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiProperty({ example: -46.6333, required: false })
    @IsNumber()
    @IsOptional()
    longitude?: number;

    @ApiProperty({
        example: faker.date.future().toISOString(),
        required: false,
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startAt?: Date;

    @ApiProperty({
        example: faker.date.future().toISOString(),
        required: false,
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endAt?: Date;

    @ApiProperty({ enum: $Enums.SubEventPermissionMode, required: false })
    @IsEnum($Enums.SubEventPermissionMode)
    @IsOptional()
    prePartyPermissionMode?: $Enums.SubEventPermissionMode;

    @ApiProperty({ enum: $Enums.SubEventPermissionMode, required: false })
    @IsEnum($Enums.SubEventPermissionMode)
    @IsOptional()
    afterPartyPermissionMode?: $Enums.SubEventPermissionMode;

    @ApiProperty({ example: false, required: false })
    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;
}
