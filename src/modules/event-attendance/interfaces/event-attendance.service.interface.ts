import { $Enums } from '@prisma/client';

import { AttendanceListDto } from '../dtos/request/attendance.list.request';
import { MyEventsDto } from '../dtos/request/my.events.request';
import {
    AttendeeListResponseDto,
    EventAttendanceResponseDto,
    MyAttendanceStatusResponseDto,
    MyEventsListResponseDto,
} from '../dtos/response/attendance.response';

export interface IEventAttendanceService {
    markInterested(
        userId: string,
        eventId: string
    ): Promise<EventAttendanceResponseDto>;

    markGoing(
        userId: string,
        eventId: string
    ): Promise<EventAttendanceResponseDto>;

    cancelAttendance(
        userId: string,
        eventId: string
    ): Promise<EventAttendanceResponseDto | null>;

    listEventAttendees(
        eventId: string,
        query: AttendanceListDto
    ): Promise<AttendeeListResponseDto>;

    listMyEvents(
        userId: string,
        query: MyEventsDto
    ): Promise<MyEventsListResponseDto>;

    getMyAttendanceForEvent(
        userId: string,
        eventId: string
    ): Promise<MyAttendanceStatusResponseDto>;

    /**
     * Checks if a user is eligible to create sub-events under ATTENDEES_ALLOWED mode.
     * Eligible statuses: GOING, CHECKED_IN, ATTENDED.
     * Use this in EventService when ATTENDEES_ALLOWED permission mode is active.
     */
    isEligibleAttendee(userId: string, eventId: string): Promise<boolean>;
}

/**
 * Statuses that grant attendance-based privileges (e.g. sub-event creation).
 * INTERESTED alone is NOT sufficient — user must have confirmed participation.
 */
export const ELIGIBLE_ATTENDANCE_STATUSES: $Enums.EventAttendanceStatus[] = [
    $Enums.EventAttendanceStatus.GOING,
    $Enums.EventAttendanceStatus.CHECKED_IN,
    $Enums.EventAttendanceStatus.ATTENDED,
];
