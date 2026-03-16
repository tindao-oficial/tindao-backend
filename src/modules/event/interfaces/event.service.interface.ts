import { MyOrganizedEventsDto } from '../dtos/request/my.organized.events.request';
import { EventCreateDto } from '../dtos/request/event.create.request';
import { EventListDto } from '../dtos/request/event.list.request';
import { SubEventPendingListQueryDto } from '../dtos/request/event.pending.sub.list.request';
import { SubEventCreateDto } from '../dtos/request/event.sub.create.request';
import { EventUpdateDto } from '../dtos/request/event.update.request';
import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';

import {
    EventCancelResponseDto,
    EventCreateResponseDto,
    EventDetailResponseDto,
    EventInviteResponseDto,
    EventListResponseDto,
    EventUpdateResponseDto,
    EventUserContextResponseDto,
    OrganizedEventListResponseDto,
    SubEventApprovalResponseDto,
    SubEventCreateResponseDto,
    SubEventPendingListResponseDto,
} from '../dtos/response/event.response';

export interface IEventService {
    createMainEvent(
        organizerId: string,
        data: EventCreateDto
    ): Promise<EventCreateResponseDto>;

    createSubEvent(
        userId: string,
        parentEventId: string,
        data: SubEventCreateDto
    ): Promise<SubEventCreateResponseDto>;

    listEvents(query: EventListDto): Promise<EventListResponseDto>;

    getEventById(id: string): Promise<EventDetailResponseDto>;

    getEventByInviteCode(inviteCode: string): Promise<EventDetailResponseDto>;

    getInviteInfo(
        userId: string,
        eventId: string
    ): Promise<EventInviteResponseDto>;

    updateEvent(
        userId: string,
        eventId: string,
        data: EventUpdateDto
    ): Promise<EventUpdateResponseDto>;

    cancelEvent(
        userId: string,
        eventId: string
    ): Promise<EventCancelResponseDto>;

    publishEvent(
        userId: string,
        eventId: string
    ): Promise<EventUpdateResponseDto>;

    listPendingSubEvents(
        organizerId: string,
        parentEventId: string,
        query: SubEventPendingListQueryDto
    ): Promise<SubEventPendingListResponseDto>;

    approveSubEvent(
        organizerId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<SubEventApprovalResponseDto>;

    rejectSubEvent(
        organizerId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<SubEventApprovalResponseDto>;

    getMyOrganizedEvents(
        organizerId: string,
        query: MyOrganizedEventsDto
    ): Promise<OrganizedEventListResponseDto>;

    getUserContext(
        userId: string,
        eventId: string
    ): Promise<EventUserContextResponseDto>;

    deleteEvent(
        userId: string,
        eventId: string
    ): Promise<ApiGenericResponseDto>;

    deleteSubEvent(
        userId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<ApiGenericResponseDto>;
}
