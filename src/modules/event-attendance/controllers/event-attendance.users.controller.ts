import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { AuthUser } from 'src/common/request/decorators/request.user.decorator';
import { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { MyEventsDto } from '../dtos/request/my.events.request';
import { MyEventsListResponseDto } from '../dtos/response/attendance.response';
import { EventAttendanceService } from '../services/event-attendance.service';

@ApiTags('public.event-attendance')
@Controller({ path: '/users', version: '1' })
export class EventAttendanceUsersController {
    constructor(private readonly attendanceService: EventAttendanceService) {}

    @Get('me/events')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: "Get current user's event history" })
    @DocResponse({
        serialization: MyEventsListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.myEvents',
    })
    public async getMyEvents(
        @AuthUser() user: IAuthUser,
        @Query() query: MyEventsDto
    ): Promise<MyEventsListResponseDto> {
        return this.attendanceService.listMyEvents(user.userId, query);
    }
}
