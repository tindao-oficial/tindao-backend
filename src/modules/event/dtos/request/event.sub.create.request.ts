import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class SubEventCreateDto {
    @ApiProperty({
        enum: [$Enums.EventType.PRE_PARTY, $Enums.EventType.AFTER_PARTY],
        example: $Enums.EventType.PRE_PARTY,
        description: 'Must be PRE_PARTY or AFTER_PARTY',
    })
    @IsEnum($Enums.EventType)
    type: $Enums.EventType.PRE_PARTY | $Enums.EventType.AFTER_PARTY;

    @ApiProperty({ example: 'Esquenta da Balada' })
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    title: string;

    @ApiProperty({ example: 'O esquenta oficial antes da festa principal.' })
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

    @ApiProperty({ example: 'Bar do Centro' })
    @IsString()
    venueName: string;

    @ApiProperty({ example: 'Rua das Flores, 456' })
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
}
