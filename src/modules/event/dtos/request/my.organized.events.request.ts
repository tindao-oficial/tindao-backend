import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class MyOrganizedEventsDto {
    @ApiProperty({ enum: $Enums.EventStatus, required: false })
    @IsEnum($Enums.EventStatus)
    @IsOptional()
    status?: $Enums.EventStatus;

    @ApiProperty({ enum: $Enums.EventType, required: false })
    @IsEnum($Enums.EventType)
    @IsOptional()
    type?: $Enums.EventType;

    @ApiProperty({ example: 20, required: false, default: 20 })
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    @IsOptional()
    limit?: number;

    @ApiProperty({ example: 'cursor-uuid', required: false })
    @IsString()
    @IsOptional()
    cursor?: string;
}
