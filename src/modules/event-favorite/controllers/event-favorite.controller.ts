import {
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { AuthUser } from 'src/common/request/decorators/request.user.decorator';
import { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { FavoriteListQueryDto } from '../dtos/request/event-favorite.list.request';
import {
    FavoriteEventListResponseDto,
    FavoriteStatusResponseDto,
} from '../dtos/response/event-favorite.response';
import { EventFavoriteService } from '../services/event-favorite.service';

@ApiTags('public.event')
@Controller({ path: '/events', version: '1' })
export class EventFavoriteController {
    constructor(private readonly favoriteService: EventFavoriteService) {}

    @Get('favorites')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'List events favorited by the current user' })
    @DocResponse({
        serialization: FavoriteEventListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.favorites',
    })
    public async getFavoriteEvents(
        @AuthUser() user: IAuthUser,
        @Query() query: FavoriteListQueryDto
    ): Promise<FavoriteEventListResponseDto> {
        return this.favoriteService.getFavoriteEvents(user.userId, query);
    }

    @Post(':eventId/favorite')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Favorite an event' })
    @DocResponse({
        serialization: FavoriteStatusResponseDto,
        httpStatus: HttpStatus.CREATED,
        messageKey: 'event.success.favorited',
    })
    public async favoriteEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<FavoriteStatusResponseDto> {
        return this.favoriteService.favoriteEvent(user.userId, eventId);
    }

    @Delete(':eventId/favorite')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Unfavorite an event' })
    @DocResponse({
        serialization: FavoriteStatusResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.unfavorited',
    })
    public async unfavoriteEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<FavoriteStatusResponseDto> {
        return this.favoriteService.unfavoriteEvent(user.userId, eventId);
    }
}
