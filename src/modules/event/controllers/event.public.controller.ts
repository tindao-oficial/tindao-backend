import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocGenericResponse } from 'src/common/doc/decorators/doc.generic.decorator';
import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { PublicRoute } from 'src/common/request/decorators/request.public.decorator';
import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';
import { AuthUser } from 'src/common/request/decorators/request.user.decorator';
import { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { EventCreateDto } from '../dtos/request/event.create.request';
import { EventListDto } from '../dtos/request/event.list.request';
import { SubEventPendingListQueryDto } from '../dtos/request/event.pending.sub.list.request';
import { SubEventCreateDto } from '../dtos/request/event.sub.create.request';
import { EventUpdateDto } from '../dtos/request/event.update.request';
import {
    EventCancelResponseDto,
    EventCreateResponseDto,
    EventDetailResponseDto,
    EventInviteResponseDto,
    EventListResponseDto,
    EventUpdateResponseDto,
    EventUserContextResponseDto,
    SubEventApprovalResponseDto,
    SubEventCreateResponseDto,
    SubEventPendingListResponseDto,
} from '../dtos/response/event.response';
import { EventService } from '../services/event.service';

@ApiTags('public.event')
@Controller({ path: '/events', version: '1' })
export class EventPublicController {
    constructor(private readonly eventService: EventService) {}

    @Post()
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Create a main event (organizers only)' })
    @DocResponse({
        serialization: EventCreateResponseDto,
        httpStatus: HttpStatus.CREATED,
        messageKey: 'event.success.created',
    })
    public async createMainEvent(
        @AuthUser() user: IAuthUser,
        @Body() payload: EventCreateDto
    ): Promise<EventCreateResponseDto> {
        return this.eventService.createMainEvent(user.userId, payload);
    }

    @Post(':eventId/sub-events')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Create a sub-event (pre-party or after-party)' })
    @DocResponse({
        serialization: SubEventCreateResponseDto,
        httpStatus: HttpStatus.CREATED,
        messageKey: 'event.success.subEventCreated',
    })
    public async createSubEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string,
        @Body() payload: SubEventCreateDto
    ): Promise<SubEventCreateResponseDto> {
        return this.eventService.createSubEvent(user.userId, eventId, payload);
    }

    @Get()
    @PublicRoute()
    @ApiOperation({ summary: 'List events (public)' })
    @DocResponse({
        serialization: EventListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.list',
    })
    public async listEvents(
        @Query() query: EventListDto
    ): Promise<EventListResponseDto> {
        return this.eventService.listEvents(query);
    }

    @Get('invite/:inviteCode')
    @PublicRoute()
    @ApiOperation({
        summary:
            'Get event by invite code (public — for QR scan / shared link)',
    })
    @DocResponse({
        serialization: EventDetailResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.detail',
    })
    public async getEventByInviteCode(
        @Param('inviteCode') inviteCode: string
    ): Promise<EventDetailResponseDto> {
        return this.eventService.getEventByInviteCode(inviteCode);
    }

    @Get(':id')
    @PublicRoute()
    @ApiOperation({
        summary: 'Get event details with sub-events and counts (public)',
    })
    @DocResponse({
        serialization: EventDetailResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.detail',
    })
    public async getEvent(
        @Param('id') id: string
    ): Promise<EventDetailResponseDto> {
        return this.eventService.getEventById(id);
    }

    @Put(':id')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Update an event (organizer only)' })
    @DocResponse({
        serialization: EventUpdateResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.updated',
    })
    public async updateEvent(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string,
        @Body() payload: EventUpdateDto
    ): Promise<EventUpdateResponseDto> {
        return this.eventService.updateEvent(user.userId, id, payload);
    }

    @Get(':id/invite')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'Get invite link + QR code for an event (auth required)',
    })
    @DocResponse({
        serialization: EventInviteResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.invite',
    })
    public async getInviteInfo(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<EventInviteResponseDto> {
        return this.eventService.getInviteInfo(user.userId, id);
    }

    @Patch(':id/publish')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Publish a draft event (organizer only)' })
    @DocResponse({
        serialization: EventUpdateResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.published',
    })
    public async publishEvent(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<EventUpdateResponseDto> {
        return this.eventService.publishEvent(user.userId, id);
    }

    @Patch(':id/cancel')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'Cancel an event (organizer only) — cascades to sub-events',
    })
    @DocResponse({
        serialization: EventCancelResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.cancelled',
    })
    public async cancelEvent(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<EventCancelResponseDto> {
        return this.eventService.cancelEvent(user.userId, id);
    }

    @Get(':id/my-context')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'Get computed permissions for the current user on this event',
        description:
            'Returns boolean flags (canCreatePreParty, canManageEvent, etc.) ' +
            'so the frontend can show/hide action buttons without duplicating eligibility logic.',
    })
    @DocResponse({
        serialization: EventUserContextResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.userContext',
    })
    public async getUserContext(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<EventUserContextResponseDto> {
        return this.eventService.getUserContext(user.userId, id);
    }

    // ─── Sub-event approval endpoints (organizer only) ────────────────────────

    @Get(':eventId/sub-events/pending')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'List pending sub-event requests (organizer only)',
    })
    @DocResponse({
        serialization: SubEventPendingListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.pendingSubEvents',
    })
    public async listPendingSubEvents(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string,
        @Query() query: SubEventPendingListQueryDto
    ): Promise<SubEventPendingListResponseDto> {
        return this.eventService.listPendingSubEvents(
            user.userId,
            eventId,
            query
        );
    }

    @Patch(':eventId/sub-events/:subEventId/approve')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Approve a pending sub-event (organizer only)' })
    @DocResponse({
        serialization: SubEventApprovalResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.approved',
    })
    public async approveSubEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string,
        @Param('subEventId') subEventId: string
    ): Promise<SubEventApprovalResponseDto> {
        return this.eventService.approveSubEvent(
            user.userId,
            eventId,
            subEventId
        );
    }

    @Patch(':eventId/sub-events/:subEventId/reject')
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Reject a pending sub-event (organizer only)' })
    @DocResponse({
        serialization: SubEventApprovalResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.rejected',
    })
    public async rejectSubEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string,
        @Param('subEventId') subEventId: string
    ): Promise<SubEventApprovalResponseDto> {
        return this.eventService.rejectSubEvent(
            user.userId,
            eventId,
            subEventId
        );
    }

    // ─── Delete endpoints ─────────────────────────────────────────────────────

    @Delete(':id')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary:
            'Delete an event — owner or admin only, cascades to sub-events',
    })
    @DocGenericResponse({
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.deleted',
    })
    public async deleteEvent(
        @AuthUser() user: IAuthUser,
        @Param('id') id: string
    ): Promise<ApiGenericResponseDto> {
        return this.eventService.deleteEvent(user.userId, id);
    }

    @Delete(':eventId/sub-events/:subEventId')
    @ApiBearerAuth('accessToken')
    @ApiOperation({
        summary: 'Delete a sub-event — creator, parent organizer, or admin',
    })
    @DocGenericResponse({
        httpStatus: HttpStatus.OK,
        messageKey: 'event.success.deleted',
    })
    public async deleteSubEvent(
        @AuthUser() user: IAuthUser,
        @Param('eventId') eventId: string,
        @Param('subEventId') subEventId: string
    ): Promise<ApiGenericResponseDto> {
        return this.eventService.deleteSubEvent(
            user.userId,
            eventId,
            subEventId
        );
    }
}
