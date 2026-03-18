import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class FavoriteListQueryDto {
    @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    cursor?: string;
}
