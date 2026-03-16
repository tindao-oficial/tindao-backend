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

export class AttendanceListDto {
    @ApiProperty({ enum: $Enums.EventAttendanceStatus, required: false })
    @IsEnum($Enums.EventAttendanceStatus)
    @IsOptional()
    status?: $Enums.EventAttendanceStatus;

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
