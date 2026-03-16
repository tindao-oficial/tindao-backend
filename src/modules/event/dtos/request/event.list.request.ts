import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

export class EventListDto {
    @ApiProperty({ example: 'São Paulo', required: false })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ enum: $Enums.EventCategory, required: false })
    @IsEnum($Enums.EventCategory)
    @IsOptional()
    category?: $Enums.EventCategory;

    @ApiProperty({ enum: $Enums.EventType, required: false })
    @IsEnum($Enums.EventType)
    @IsOptional()
    type?: $Enums.EventType;

    @ApiProperty({ example: '2025-01-01T00:00:00.000Z', required: false })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startDate?: Date;

    @ApiProperty({ example: '2025-12-31T23:59:59.000Z', required: false })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endDate?: Date;

    @ApiProperty({ example: 'uuid', required: false })
    @IsUUID()
    @IsOptional()
    organizerId?: string;

    @ApiProperty({
        example: -23.5505,
        required: false,
        description: 'User latitude for proximity search',
    })
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    latitude?: number;

    @ApiProperty({
        example: -46.6333,
        required: false,
        description: 'User longitude for proximity search',
    })
    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    longitude?: number;

    @ApiProperty({
        example: 50,
        required: false,
        description: 'Search radius in km (default: 50)',
    })
    @IsNumber()
    @Min(1)
    @Max(500)
    @Type(() => Number)
    @IsOptional()
    radius?: number;

    @ApiProperty({
        example: 'distance',
        required: false,
        description: 'Sort by "distance" when lat/lng provided',
    })
    @IsString()
    @IsOptional()
    sortBy?: string;

    @ApiProperty({ example: 20, required: false, default: 20 })
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    @IsOptional()
    limit?: number = 20;

    @ApiProperty({ example: 'cursor-uuid', required: false })
    @IsString()
    @IsOptional()
    cursor?: string;
}
