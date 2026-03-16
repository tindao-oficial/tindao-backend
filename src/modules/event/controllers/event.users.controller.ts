import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { AuthUser } from 'src/common/request/decorators/request.user.decorator';
import { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { MyOrganizedEventsDto } from '../dtos/request/my.organized.events.request';
import { OrganizedEventListResponseDto } from '../dtos/response/event.response';
import { EventService } from '../services/event.service';

@ApiTags('public.event')
@Controller({ path: '/users', version: '1' })
export class EventUsersController {
    constructor(private readonly eventService: EventService) {}

    @Get('me/organized-events')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: "Get current user's organized events with attendee counts",
    })
    @DocResponse({
        serialization: OrganizedEventListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.organizedList',
    })
    public async getMyOrganizedEvents(
        @AuthUser() user: IAuthUser,
        @Query() query: MyOrganizedEventsDto
    ): Promise<OrganizedEventListResponseDto> {
        return this.eventService.getMyOrganizedEvents(user.userId, query);
    }
}
