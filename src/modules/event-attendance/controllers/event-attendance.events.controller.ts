import {
    Controller,
    Get,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { PublicRoute } from 'src/common/request/decorators/request.public.decorator';
import { AuthUser } from 'src/common/request/decorators/request.user.decorator';
import { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { $Enums } from '@prisma/client';

import { AttendanceListDto } from '../dtos/request/attendance.list.request';
import {
    AttendeeListResponseDto,
    EventAttendanceResponseDto,
    MyAttendanceStatusResponseDto,
} from '../dtos/response/attendance.response';
import { EventAttendanceService } from '../services/event-attendance.service';

@ApiTags('public.event-attendance')
@Controller({ path: '/events', version: '1' })
export class EventAttendanceEventsController {
    constructor(private readonly attendanceService: EventAttendanceService) {}

    @Post(':eventId/interest')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Mark interest in an event' })
    @DocResponse({
        serialization: EventAttendanceResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.interested',
    })
    public async markInterested(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<EventAttendanceResponseDto> {
        return this.attendanceService.markInterested(user.userId, eventId);
    }

    @Post(':eventId/going')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Confirm going to an event' })
    @DocResponse({
        serialization: EventAttendanceResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.going',
    })
    public async markGoing(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<EventAttendanceResponseDto> {
        return this.attendanceService.markGoing(user.userId, eventId);
    }

    @Post(':eventId/cancel-attendance')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Cancel participation in an event' })
    @DocResponse({
        serialization: EventAttendanceResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.cancelled',
    })
    public async cancelAttendance(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<EventAttendanceResponseDto | null> {
        return this.attendanceService.cancelAttendance(user.userId, eventId);
    }

    @Get(':eventId/attendees')
    @PublicRoute()
    @ApiOperation({
        summary: 'List event attendees (GOING / CHECKED_IN / ATTENDED)',
    })
    @DocResponse({
        serialization: AttendeeListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.attendees',
    })
    public async listAttendees(
        @Param('eventId') eventId: string,
        @Query() query: AttendanceListDto
    ): Promise<AttendeeListResponseDto> {
        return this.attendanceService.listEventAttendees(eventId, query);
    }

    @Get(':eventId/interested')
    @PublicRoute()
    @ApiOperation({ summary: 'List users interested in an event' })
    @DocResponse({
        serialization: AttendeeListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.interestedList',
    })
    public async listInterested(
        @Param('eventId') eventId: string,
        @Query() query: AttendanceListDto
    ): Promise<AttendeeListResponseDto> {
        return this.attendanceService.listEventAttendees(eventId, {
            ...query,
            status: $Enums.EventAttendanceStatus.INTERESTED,
        });
    }

    @Get(':eventId/my-attendance')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'Get current user attendance status for an event',
    })
    @DocResponse({
        serialization: MyAttendanceStatusResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event-attendance.success.myAttendance',
    })
    public async getMyAttendance(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string
    ): Promise<MyAttendanceStatusResponseDto> {
        return this.attendanceService.getMyAttendanceForEvent(
            user.userId,
            eventId
        );
    }
}
