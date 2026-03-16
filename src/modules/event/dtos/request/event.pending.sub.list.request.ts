import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubEventPendingListQueryDto {
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
