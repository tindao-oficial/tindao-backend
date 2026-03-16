import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class MyEventsDto {
    @ApiProperty({ enum: $Enums.EventAttendanceStatus, required: false })
    @IsEnum($Enums.EventAttendanceStatus)
    @IsOptional()
    status?: $Enums.EventAttendanceStatus;

    @ApiProperty({ enum: $Enums.EventType, required: false })
    @IsEnum($Enums.EventType)
    @IsOptional()
    type?: $Enums.EventType;

    @ApiProperty({
        example: true,
        required: false,
        description: 'Filter only upcoming events (startAt >= now)',
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    upcoming?: boolean;

    @ApiProperty({
        example: false,
        required: false,
        description: 'Filter only past events (endAt < now)',
    })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    past?: boolean;

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
