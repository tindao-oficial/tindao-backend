import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { $Enums, EventAttendance } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';

import { AttendanceListDto } from '../dtos/request/attendance.list.request';
import { MyEventsDto } from '../dtos/request/my.events.request';
import {
    AttendeeListResponseDto,
    EventAttendanceResponseDto,
    MyAttendanceStatusResponseDto,
    MyEventsListResponseDto,
} from '../dtos/response/attendance.response';
import {
    ELIGIBLE_ATTENDANCE_STATUSES,
    IEventAttendanceService,
} from '../interfaces/event-attendance.service.interface';

/**
 * Status strength order (highest to lowest):
 * ATTENDED > CHECKED_IN > GOING > CANCELLED
 *
 * Transition rules:
 * - markGoing:        creates/upgrades to GOING from CANCELLED; does NOT downgrade CHECKED_IN/ATTENDED
 * - cancelAttendance: always sets CANCELLED regardless of current status
 */
const STATUS_STRENGTH: Record<$Enums.EventAttendanceStatus, number> = {
    [$Enums.EventAttendanceStatus.CANCELLED]: 0,
    [$Enums.EventAttendanceStatus.GOING]: 1,
    [$Enums.EventAttendanceStatus.CHECKED_IN]: 2,
    [$Enums.EventAttendanceStatus.ATTENDED]: 3,
};

const ATTENDEE_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    profilePhoto: true,
    avatar: true,
};

@Injectable()
export class EventAttendanceService implements IEventAttendanceService {
    constructor(private readonly databaseService: DatabaseService) {}

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private async requireActiveEvent(eventId: string) {
        const event = await this.databaseService.event.findUnique({
            where: { id: eventId, deletedAt: null },
        });

        if (!event) {
            throw new HttpException(
                'event-attendance.error.eventNotFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (event.status === $Enums.EventStatus.CANCELLED) {
            throw new HttpException(
                'event-attendance.error.eventCancelled',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        return event;
    }

    private async upsertAttendance(
        userId: string,
        eventId: string,
        targetStatus: $Enums.EventAttendanceStatus
    ): Promise<EventAttendance> {
        const existing = await this.databaseService.eventAttendance.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });

        if (existing) {
            const currentStrength = STATUS_STRENGTH[existing.status];
            const targetStrength = STATUS_STRENGTH[targetStatus];

            // Do not downgrade a stronger status with a weaker action
            if (
                currentStrength >= targetStrength &&
                targetStatus !== $Enums.EventAttendanceStatus.CANCELLED
            ) {
                return existing;
            }

            return this.databaseService.eventAttendance.update({
                where: { eventId_userId: { eventId, userId } },
                data: { status: targetStatus },
            });
        }

        return this.databaseService.eventAttendance.create({
            data: { userId, eventId, status: targetStatus },
        });
    }

    // ─── Public service methods ────────────────────────────────────────────────

    async markGoing(
        userId: string,
        eventId: string
    ): Promise<EventAttendanceResponseDto> {
        await this.requireActiveEvent(eventId);
        return this.upsertAttendance(
            userId,
            eventId,
            $Enums.EventAttendanceStatus.GOING
        );
    }

    async cancelAttendance(
        userId: string,
        eventId: string
    ): Promise<EventAttendanceResponseDto | null> {
        const existing = await this.databaseService.eventAttendance.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });

        // No record exists — semantic no-op, return null (controller returns success)
        if (!existing) {
            return null;
        }

        return this.databaseService.eventAttendance.update({
            where: { eventId_userId: { eventId, userId } },
            data: { status: $Enums.EventAttendanceStatus.CANCELLED },
        });
    }

    async listEventAttendees(
        eventId: string,
        query: AttendanceListDto
    ): Promise<AttendeeListResponseDto> {
        const limit = query.limit ?? 20;

        // Default to active participation statuses; allow override via query param
        const status = query.status
            ? [query.status]
            : [
                  $Enums.EventAttendanceStatus.GOING,
                  $Enums.EventAttendanceStatus.CHECKED_IN,
                  $Enums.EventAttendanceStatus.ATTENDED,
              ];

        const records = await this.databaseService.eventAttendance.findMany({
            where: { eventId, status: { in: status } },
            orderBy: { createdAt: 'asc' },
            take: limit + 1,
            ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
            include: { user: { select: ATTENDEE_SELECT } },
        });

        let nextCursor: string | null = null;
        if (records.length > limit) {
            records.pop();
            nextCursor = records[records.length - 1].id;
        }

        return { items: records as any, nextCursor };
    }

    async listMyEvents(
        userId: string,
        query: MyEventsDto
    ): Promise<MyEventsListResponseDto> {
        const limit = query.limit ?? 20;
        const now = new Date();

        const eventWhere: Record<string, any> = { deletedAt: null };
        if (query.type) eventWhere.type = query.type;
        if (query.upcoming) eventWhere.startAt = { gte: now };
        if (query.past) eventWhere.endAt = { lt: now };

        const where: Record<string, any> = {
            userId,
            event: eventWhere,
        };
        if (query.status) where.status = query.status;

        const records = await this.databaseService.eventAttendance.findMany({
            where,
            orderBy: { event: { startAt: 'asc' } },
            take: limit + 1,
            ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
            include: {
                event: {
                    include: {
                        organizer: { select: ATTENDEE_SELECT },
                    },
                },
            },
        });

        let nextCursor: string | null = null;
        if (records.length > limit) {
            records.pop();
            nextCursor = records[records.length - 1].id;
        }

        const items = records.map(r => ({
            attendance: {
                id: r.id,
                eventId: r.eventId,
                userId: r.userId,
                status: r.status,
                source: r.source,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            },
            event: r.event,
        }));

        return { items: items as any, nextCursor };
    }

    async getMyAttendanceForEvent(
        userId: string,
        eventId: string
    ): Promise<MyAttendanceStatusResponseDto> {
        const record = await this.databaseService.eventAttendance.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });

        if (!record) {
            return { exists: false, status: null, source: null };
        }

        return { exists: true, status: record.status, source: record.source };
    }

    /**
     * Returns true if the user has an eligible attendance status for the given event.
     * Eligible statuses: GOING, CHECKED_IN, ATTENDED.
     * Used by EventService when SubEventPermissionMode = ATTENDEES_ALLOWED.
     */
    async isEligibleAttendee(
        userId: string,
        eventId: string
    ): Promise<boolean> {
        const record = await this.databaseService.eventAttendance.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });

        if (!record) return false;
        return ELIGIBLE_ATTENDANCE_STATUSES.includes(record.status);
    }
}
