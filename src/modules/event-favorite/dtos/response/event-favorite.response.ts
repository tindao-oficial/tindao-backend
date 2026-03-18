import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { EventListItemResponseDto } from 'src/modules/event/dtos/response/event.response';

export class FavoriteStatusResponseDto {
    @ApiProperty({ example: true })
    @Expose()
    @IsBoolean()
    isFavorited: boolean;
}

export class FavoriteEventListResponseDto {
    @ApiProperty({ type: [EventListItemResponseDto] })
    @Expose()
    @Type(() => EventListItemResponseDto)
    items: EventListItemResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}
