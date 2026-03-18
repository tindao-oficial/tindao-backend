import { randomBytes } from 'crypto';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { $Enums } from '@prisma/client';
import * as QRCode from 'qrcode';

import { DatabaseService } from 'src/common/database/services/database.service';
import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';
import { EventAttendanceService } from 'src/modules/event-attendance/services/event-attendance.service';
import { ELIGIBLE_ATTENDANCE_STATUSES } from 'src/modules/event-attendance/interfaces/event-attendance.service.interface';

import { MyOrganizedEventsDto } from '../dtos/request/my.organized.events.request';
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
    OrganizedEventListResponseDto,
    SubEventApprovalResponseDto,
    SubEventCreateResponseDto,
    SubEventPendingListResponseDto,
} from '../dtos/response/event.response';
import { IEventService } from '../interfaces/event.service.interface';

@Injectable()
export class EventService implements IEventService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly attendanceService: EventAttendanceService
    ) {}

    // ─── Private helpers ──────────────────────────────────────────────────────

    private generateInviteCode(): string {
        return randomBytes(8).toString('hex'); // 16-char hex, URL-safe
    }

    private buildInviteUrl(inviteCode: string): string {
        const frontendUrl = this.configService.get<string>(
            'app.frontendUrl',
            'http://localhost:3000'
        );
        return `${frontendUrl}/events/${inviteCode}`;
    }

    private attachInviteUrl<T extends { inviteCode: string }>(
        event: T
    ): T & { inviteUrl: string } {
        return { ...event, inviteUrl: this.buildInviteUrl(event.inviteCode) };
    }

    // ─── Event creation ───────────────────────────────────────────────────────

    async createMainEvent(
        organizerId: string,
        data: EventCreateDto
    ): Promise<EventCreateResponseDto> {
        const organizer = await this.databaseService.user.findUnique({
            where: { id: organizerId, deletedAt: null },
        });

        if (!organizer) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (data.endAt <= data.startAt) {
            throw new HttpException(
                'event.error.invalidDates',
                HttpStatus.BAD_REQUEST
            );
        }

        const inviteCode = this.generateInviteCode();

        // isOfficial só é permitido para organizadores verificados; ignora silenciosamente para usuários comuns
        const isOfficial = data.isOfficial === true && organizer.isOrganizer;

        const event = await this.databaseService.event.create({
            data: {
                ...data,
                isOfficial,
                type: $Enums.EventType.MAIN,
                organizerId,
                inviteCode,
                // MAIN events are always considered approved (no approval flow)
                approvalStatus: null,
            },
        });

        return this.attachInviteUrl(event);
    }

    async createSubEvent(
        userId: string,
        parentEventId: string,
        data: SubEventCreateDto
    ): Promise<SubEventCreateResponseDto> {
        if (
            data.type !== $Enums.EventType.PRE_PARTY &&
            data.type !== $Enums.EventType.AFTER_PARTY
        ) {
            throw new HttpException(
                'Sub-event type must be PRE_PARTY or AFTER_PARTY',
                HttpStatus.BAD_REQUEST
            );
        }

        const parentEvent = await this.databaseService.event.findUnique({
            where: { id: parentEventId, deletedAt: null },
        });

        if (!parentEvent) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (parentEvent.type !== $Enums.EventType.MAIN) {
            throw new HttpException(
                'event.error.notMainEvent',
                HttpStatus.BAD_REQUEST
            );
        }

        if (parentEvent.status === $Enums.EventStatus.CANCELLED) {
            throw new HttpException(
                'event-attendance.error.eventCancelled',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        const permissionMode =
            data.type === $Enums.EventType.PRE_PARTY
                ? parentEvent.prePartyPermissionMode
                : parentEvent.afterPartyPermissionMode;

        if (permissionMode === $Enums.SubEventPermissionMode.DISABLED) {
            throw new HttpException(
                'event.error.subEventDisabled',
                HttpStatus.FORBIDDEN
            );
        }

        const isOrganizer = parentEvent.organizerId === userId;

        if (
            permissionMode === $Enums.SubEventPermissionMode.ORGANIZER_ONLY &&
            !isOrganizer
        ) {
            throw new HttpException(
                'event.error.subEventPermissionDenied',
                HttpStatus.FORBIDDEN
            );
        }

        /**
         * ATTENDEES_ALLOWED mode:
         * The organizer can always create sub-events.
         * Other users must have an eligible attendance status (GOING, CHECKED_IN, or ATTENDED).
         * INTERESTED alone is NOT sufficient — the user must have confirmed participation.
         * This prepares for the future Tickets integration: once tickets exist, a purchased
         * ticket will automatically set the user to GOING, granting sub-event creation rights.
         */
        if (
            permissionMode ===
                $Enums.SubEventPermissionMode.ATTENDEES_ALLOWED &&
            !isOrganizer
        ) {
            const eligible = await this.attendanceService.isEligibleAttendee(
                userId,
                parentEventId
            );
            if (!eligible) {
                throw new HttpException(
                    'event.error.notEligibleAttendee',
                    HttpStatus.FORBIDDEN
                );
            }
        }

        if (data.endAt <= data.startAt) {
            throw new HttpException(
                'event.error.invalidDates',
                HttpStatus.BAD_REQUEST
            );
        }

        // PRE_PARTY must end before the main event starts
        if (
            data.type === $Enums.EventType.PRE_PARTY &&
            data.endAt > parentEvent.startAt
        ) {
            throw new HttpException(
                'event.error.prePartyMustEndBeforeMainEvent',
                HttpStatus.BAD_REQUEST
            );
        }

        // AFTER_PARTY must start after the main event ends
        if (
            data.type === $Enums.EventType.AFTER_PARTY &&
            data.startAt < parentEvent.endAt
        ) {
            throw new HttpException(
                'event.error.afterPartyMustStartAfterMainEvent',
                HttpStatus.BAD_REQUEST
            );
        }

        // Prevent duplicate: one PENDING or APPROVED sub-event per user per type per parent
        const existing = await this.databaseService.event.findFirst({
            where: {
                parentEventId,
                organizerId: userId,
                type: data.type,
                approvalStatus: {
                    in: [
                        $Enums.SubEventApprovalStatus.PENDING,
                        $Enums.SubEventApprovalStatus.APPROVED,
                    ],
                },
                deletedAt: null,
            },
        });

        if (existing) {
            throw new HttpException(
                'event.error.alreadyCreatedSubEvent',
                HttpStatus.CONFLICT
            );
        }

        /**
         * Approval flow:
         * - Organizer-created sub-events are immediately APPROVED and PUBLISHED.
         * - Attendee-created sub-events start as PENDING (DRAFT) and require organizer
         *   approval before they appear in public listings.
         */
        const approvalStatus = isOrganizer
            ? $Enums.SubEventApprovalStatus.APPROVED
            : $Enums.SubEventApprovalStatus.PENDING;

        const status = isOrganizer
            ? $Enums.EventStatus.PUBLISHED
            : $Enums.EventStatus.DRAFT;

        const inviteCode = this.generateInviteCode();

        const event = await this.databaseService.event.create({
            data: {
                title: data.title,
                description: data.description,
                type: data.type,
                category: data.category,
                coverImage: data.coverImage,
                city: data.city,
                venueName: data.venueName,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                startAt: data.startAt,
                endAt: data.endAt,
                organizerId: userId,
                parentEventId,
                rootEventId: parentEventId,
                inviteCode,
                approvalStatus,
                status,
            },
        });

        return this.attachInviteUrl(event);
    }

    // ─── Event listing ────────────────────────────────────────────────────────

    /**
     * Haversine formula: compute distance between two coordinates in km.
     */
    private haversineKm(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async listEvents(query: EventListDto): Promise<EventListResponseDto> {
        const limit = query.limit ?? 20;
        const type = query.type ?? $Enums.EventType.MAIN;

        const where: Record<string, any> = {
            deletedAt: null,
            isPrivate: false, // Public listing never shows private events
            type,
        };

        if (query.city)
            where.city = { contains: query.city, mode: 'insensitive' };
        if (query.category) where.category = query.category;
        if (query.organizerId) where.organizerId = query.organizerId;
        if (query.startDate || query.endDate) {
            where.startAt = {};
            if (query.startDate) where.startAt.gte = query.startDate;
            if (query.endDate) where.startAt.lte = query.endDate;
        }

        /**
         * MAIN events must be explicitly published before appearing in public listings.
         * Sub-events (PRE_PARTY / AFTER_PARTY) require organizer approval instead —
         * approval also sets their status to PUBLISHED. PENDING and REJECTED sub-events
         * are hidden from public via the approvalStatus filter.
         */
        if (type === $Enums.EventType.MAIN) {
            where.status = $Enums.EventStatus.PUBLISHED;
        } else {
            where.approvalStatus = $Enums.SubEventApprovalStatus.APPROVED;
        }

        // Geo filtering: require events to have lat/lng when filtering by location
        const hasGeo =
            query.latitude !== undefined && query.longitude !== undefined;
        if (hasGeo) {
            where.latitude = { not: null };
            where.longitude = { not: null };
        }

        const events = await this.databaseService.event.findMany({
            where,
            orderBy: { startAt: 'asc' },
            // Fetch more rows when geo-filtering so we can apply radius post-filter
            take: hasGeo ? undefined : limit + 1,
            ...(query.cursor &&
                !hasGeo && {
                    cursor: { id: query.cursor },
                    skip: 1,
                }),
            include: {
                organizer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });

        // Fetch attendance and favorites counts for all retrieved events (avoids N+1)
        const eventIds = events.map(e => e.id);
        const [attendanceRows, favRows] = await Promise.all([
            this.databaseService.eventAttendance.groupBy({
                by: ['eventId', 'status'],
                where: { eventId: { in: eventIds } },
                _count: { _all: true },
            }),
            this.databaseService.userEventFavorite.groupBy({
                by: ['eventId'],
                where: { eventId: { in: eventIds } },
                _count: { _all: true },
            }),
        ]);

        const countMap = new Map<
            string,
            { favorites: number; attendees: number }
        >();
        for (const row of attendanceRows) {
            if (!countMap.has(row.eventId)) {
                countMap.set(row.eventId, { favorites: 0, attendees: 0 });
            }
            if (ELIGIBLE_ATTENDANCE_STATUSES.includes(row.status)) {
                countMap.get(row.eventId)!.attendees += row._count._all;
            }
        }
        for (const row of favRows) {
            if (!countMap.has(row.eventId)) {
                countMap.set(row.eventId, { favorites: 0, attendees: 0 });
            }
            countMap.get(row.eventId)!.favorites = row._count._all;
        }

        // Compute distance + radius filter when geo params are provided
        const radius = query.radius ?? 50;
        let enriched = events.map(e => {
            const counts = countMap.get(e.id) ?? {
                favorites: 0,
                attendees: 0,
            };
            const distance =
                hasGeo && e.latitude != null && e.longitude != null
                    ? this.haversineKm(
                          query.latitude!,
                          query.longitude!,
                          e.latitude,
                          e.longitude
                      )
                    : null;
            return {
                ...this.attachInviteUrl(e),
                favoritesCount: counts.favorites,
                attendeesCount: counts.attendees,
                distance:
                    distance !== null ? Math.round(distance * 10) / 10 : null,
                isFavorited: null,
            };
        });

        // Apply radius filter and optional distance sort
        if (hasGeo) {
            enriched = enriched.filter(
                e => e.distance !== null && e.distance <= radius
            );
            if (query.sortBy === 'distance') {
                enriched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
            }
        }

        // Cursor-based pagination for geo queries (post-filter)
        let paginatedItems = enriched;
        if (hasGeo && query.cursor) {
            const cursorIdx = enriched.findIndex(e => e.id === query.cursor);
            paginatedItems =
                cursorIdx >= 0 ? enriched.slice(cursorIdx + 1) : enriched;
        }

        let nextCursor: string | null = null;
        if (hasGeo) {
            if (paginatedItems.length > limit) {
                paginatedItems = paginatedItems.slice(0, limit);
                nextCursor = paginatedItems[paginatedItems.length - 1].id;
            }
        } else {
            if (enriched.length > limit) {
                enriched.pop();
                paginatedItems = enriched;
                nextCursor = paginatedItems[paginatedItems.length - 1].id;
            } else {
                paginatedItems = enriched;
            }
        }

        return { items: paginatedItems as any, nextCursor };
    }

    // ─── Event detail ─────────────────────────────────────────────────────────

    async getEventById(id: string): Promise<EventDetailResponseDto> {
        const [event, favoritesCount, attendeesCount] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id, deletedAt: null },
                include: {
                    organizer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                        },
                    },
                    // Only include publicly visible child events (APPROVED only)
                    childEvents: {
                        where: {
                            deletedAt: null,
                            approvalStatus:
                                $Enums.SubEventApprovalStatus.APPROVED,
                        },
                        orderBy: { startAt: 'asc' },
                        include: {
                            organizer: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.databaseService.userEventFavorite.count({
                where: { eventId: id },
            }),
            this.databaseService.eventAttendance.count({
                where: {
                    eventId: id,
                    status: { in: ELIGIBLE_ATTENDANCE_STATUSES },
                },
            }),
        ]);

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const withInvite = (e: any) => this.attachInviteUrl(e);

        const preParties = event.childEvents
            .filter(e => e.type === $Enums.EventType.PRE_PARTY)
            .map(withInvite);
        const afterParties = event.childEvents
            .filter(e => e.type === $Enums.EventType.AFTER_PARTY)
            .map(withInvite);

        return {
            ...withInvite(event),
            preParties,
            afterParties,
            favoritesCount,
            attendeesCount,
            isFavorited: null,
        } as EventDetailResponseDto;
    }

    async getEventByInviteCode(
        inviteCode: string
    ): Promise<EventDetailResponseDto> {
        const event = await this.databaseService.event.findUnique({
            where: { inviteCode, deletedAt: null },
            include: {
                organizer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
                childEvents: {
                    where: {
                        deletedAt: null,
                        approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                    },
                    orderBy: { startAt: 'asc' },
                    include: {
                        organizer: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const [favoritesCount, attendeesCount] = await Promise.all([
            this.databaseService.userEventFavorite.count({
                where: { eventId: event.id },
            }),
            this.databaseService.eventAttendance.count({
                where: {
                    eventId: event.id,
                    status: { in: ELIGIBLE_ATTENDANCE_STATUSES },
                },
            }),
        ]);

        const withInvite = (e: any) => this.attachInviteUrl(e);

        const preParties = event.childEvents
            .filter(e => e.type === $Enums.EventType.PRE_PARTY)
            .map(withInvite);
        const afterParties = event.childEvents
            .filter(e => e.type === $Enums.EventType.AFTER_PARTY)
            .map(withInvite);

        return {
            ...withInvite(event),
            preParties,
            afterParties,
            favoritesCount,
            attendeesCount,
            isFavorited: null,
        } as EventDetailResponseDto;
    }

    // ─── Event update / cancel ────────────────────────────────────────────────

    async updateEvent(
        userId: string,
        eventId: string,
        data: EventUpdateDto
    ): Promise<EventUpdateResponseDto> {
        const [event, user] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id: eventId, deletedAt: null },
            }),
            this.databaseService.user.findUnique({
                where: { id: userId, deletedAt: null },
            }),
        ]);

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const isAdmin = user?.role === $Enums.Role.ADMIN;

        if (event.organizerId !== userId && !isAdmin) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        if (data.startAt && data.endAt && data.endAt <= data.startAt) {
            throw new HttpException(
                'event.error.invalidDates',
                HttpStatus.BAD_REQUEST
            );
        }

        // Sub-events cannot have their hierarchy permission modes changed via normal update
        const updateData: Partial<EventUpdateDto> = { ...data };
        if (event.type !== $Enums.EventType.MAIN) {
            delete updateData.prePartyPermissionMode;
            delete updateData.afterPartyPermissionMode;
        }

        const updated = await this.databaseService.event.update({
            where: { id: eventId },
            data: updateData,
        });

        return this.attachInviteUrl(updated);
    }

    async cancelEvent(
        userId: string,
        eventId: string
    ): Promise<EventCancelResponseDto> {
        const [event, user] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id: eventId, deletedAt: null },
            }),
            this.databaseService.user.findUnique({
                where: { id: userId, deletedAt: null },
            }),
        ]);

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const isAdmin = user?.role === $Enums.Role.ADMIN;

        if (event.organizerId !== userId && !isAdmin) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        /**
         * Cascade cancellation: when a MAIN event is cancelled, all its child
         * sub-events (PRE_PARTY and AFTER_PARTY) are also cancelled.
         * Attendance records are intentionally preserved — they reflect historical
         * participation and will be used for future analytics / ticket refunds.
         */
        if (event.type === $Enums.EventType.MAIN) {
            await this.databaseService.event.updateMany({
                where: { parentEventId: eventId, deletedAt: null },
                data: { status: $Enums.EventStatus.CANCELLED },
            });
        }

        const cancelled = await this.databaseService.event.update({
            where: { id: eventId },
            data: { status: $Enums.EventStatus.CANCELLED },
        });

        return this.attachInviteUrl(cancelled);
    }

    async publishEvent(
        userId: string,
        eventId: string
    ): Promise<EventUpdateResponseDto> {
        const [event, user] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id: eventId, deletedAt: null },
            }),
            this.databaseService.user.findUnique({
                where: { id: userId, deletedAt: null },
            }),
        ]);

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const isAdmin = user?.role === $Enums.Role.ADMIN;

        if (event.organizerId !== userId && !isAdmin) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        if (event.status !== $Enums.EventStatus.DRAFT) {
            throw new HttpException(
                'event.error.notDraft',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        const updated = await this.databaseService.event.update({
            where: { id: eventId },
            data: { status: $Enums.EventStatus.PUBLISHED },
        });

        return this.attachInviteUrl(updated);
    }

    // ─── Sub-event approval flow ──────────────────────────────────────────────

    async listPendingSubEvents(
        organizerId: string,
        parentEventId: string,
        query: SubEventPendingListQueryDto
    ): Promise<SubEventPendingListResponseDto> {
        const limit = query.limit ?? 20;

        const parentEvent = await this.databaseService.event.findUnique({
            where: { id: parentEventId, deletedAt: null },
        });

        if (!parentEvent) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (parentEvent.organizerId !== organizerId) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        const subEvents = await this.databaseService.event.findMany({
            where: {
                parentEventId,
                approvalStatus: $Enums.SubEventApprovalStatus.PENDING,
                deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
            take: limit + 1,
            ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
        });

        let nextCursor: string | null = null;
        if (subEvents.length > limit) {
            subEvents.pop();
            nextCursor = subEvents[subEvents.length - 1].id;
        }

        const items = subEvents.map(e => this.attachInviteUrl(e));

        return { items: items as any, nextCursor };
    }

    async approveSubEvent(
        organizerId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<SubEventApprovalResponseDto> {
        const parentEvent = await this.databaseService.event.findUnique({
            where: { id: parentEventId, deletedAt: null },
        });

        if (!parentEvent) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (parentEvent.organizerId !== organizerId) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        const subEvent = await this.databaseService.event.findUnique({
            where: { id: subEventId, deletedAt: null },
        });

        if (!subEvent || subEvent.parentEventId !== parentEventId) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (subEvent.approvalStatus !== $Enums.SubEventApprovalStatus.PENDING) {
            throw new HttpException(
                'event.error.subEventNotPending',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        const updated = await this.databaseService.event.update({
            where: { id: subEventId },
            data: {
                approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                status: $Enums.EventStatus.PUBLISHED,
            },
        });

        return this.attachInviteUrl(updated);
    }

    async rejectSubEvent(
        organizerId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<SubEventApprovalResponseDto> {
        const parentEvent = await this.databaseService.event.findUnique({
            where: { id: parentEventId, deletedAt: null },
        });

        if (!parentEvent) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (parentEvent.organizerId !== organizerId) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        const subEvent = await this.databaseService.event.findUnique({
            where: { id: subEventId, deletedAt: null },
        });

        if (!subEvent || subEvent.parentEventId !== parentEventId) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (subEvent.approvalStatus !== $Enums.SubEventApprovalStatus.PENDING) {
            throw new HttpException(
                'event.error.subEventNotPending',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        const updated = await this.databaseService.event.update({
            where: { id: subEventId },
            data: { approvalStatus: $Enums.SubEventApprovalStatus.REJECTED },
        });

        return this.attachInviteUrl(updated);
    }

    // ─── Invite ───────────────────────────────────────────────────────────────

    async getInviteInfo(
        userId: string,
        eventId: string
    ): Promise<EventInviteResponseDto> {
        const event = await this.databaseService.event.findUnique({
            where: { id: eventId, deletedAt: null },
        });

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const inviteUrl = this.buildInviteUrl(event.inviteCode);
        const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
            width: 300,
            margin: 2,
        });

        return { inviteCode: event.inviteCode, inviteUrl, qrCodeDataUrl };
    }

    // ─── User context ─────────────────────────────────────────────────────────

    /**
     * Returns all computed permissions for a given user on a given event.
     * The frontend uses this to show/hide action buttons (create sub-event,
     * edit, approve, etc.) without duplicating eligibility logic client-side.
     *
     * Called once when the event screen loads (alongside the public event detail).
     * Eligibility rules here are the single source of truth — when the Tickets
     * module is introduced, only this method needs to be updated.
     */
    async getUserContext(
        userId: string,
        eventId: string
    ): Promise<EventUserContextResponseDto> {
        const event = await this.databaseService.event.findUnique({
            where: { id: eventId, deletedAt: null },
        });

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const [attendance, favorite] = await Promise.all([
            this.databaseService.eventAttendance.findUnique({
                where: { eventId_userId: { eventId, userId } },
            }),
            this.databaseService.userEventFavorite.findUnique({
                where: { userId_eventId: { userId, eventId } },
            }),
        ]);

        const attendanceStatus = attendance?.status ?? null;
        const isOrganizer = event.organizerId === userId;
        const isEligible =
            attendanceStatus !== null &&
            ELIGIBLE_ATTENDANCE_STATUSES.includes(attendanceStatus);

        const isCancelled = event.status === $Enums.EventStatus.CANCELLED;

        const canCreate = (mode: $Enums.SubEventPermissionMode): boolean => {
            if (isCancelled) return false;
            if (mode === $Enums.SubEventPermissionMode.DISABLED) return false;
            if (isOrganizer) return true;
            if (mode === $Enums.SubEventPermissionMode.ATTENDEES_ALLOWED)
                return isEligible;
            return false; // ORGANIZER_ONLY and not organizer
        };

        return {
            attendanceStatus,
            isOrganizer,
            canCreatePreParty: canCreate(event.prePartyPermissionMode),
            canCreateAfterParty: canCreate(event.afterPartyPermissionMode),
            canManageEvent: isOrganizer && !isCancelled,
            canApproveSubEvents: isOrganizer && !isCancelled,
            isFavorited: favorite !== null,
        };
    }

    // ─── Delete endpoints ─────────────────────────────────────────────────────

    async deleteEvent(
        userId: string,
        eventId: string
    ): Promise<ApiGenericResponseDto> {
        const [event, user] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id: eventId, deletedAt: null },
            }),
            this.databaseService.user.findUnique({
                where: { id: userId, deletedAt: null },
            }),
        ]);

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const isAdmin = user?.role === $Enums.Role.ADMIN;

        if (event.organizerId !== userId && !isAdmin) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        // Cascade soft delete to all child sub-events
        if (event.type === $Enums.EventType.MAIN) {
            await this.databaseService.event.updateMany({
                where: { parentEventId: eventId, deletedAt: null },
                data: { deletedAt: new Date() },
            });
        }

        await this.databaseService.event.update({
            where: { id: eventId },
            data: { deletedAt: new Date() },
        });

        return { success: true, message: 'event.success.deleted' };
    }

    async deleteSubEvent(
        userId: string,
        parentEventId: string,
        subEventId: string
    ): Promise<ApiGenericResponseDto> {
        const [parentEvent, subEvent, user] = await Promise.all([
            this.databaseService.event.findUnique({
                where: { id: parentEventId, deletedAt: null },
            }),
            this.databaseService.event.findUnique({
                where: { id: subEventId, deletedAt: null },
            }),
            this.databaseService.user.findUnique({
                where: { id: userId, deletedAt: null },
            }),
        ]);

        if (!parentEvent) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (!subEvent || subEvent.parentEventId !== parentEventId) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const isAdmin = user?.role === $Enums.Role.ADMIN;
        const isSubEventCreator = subEvent.organizerId === userId;
        const isParentOrganizer = parentEvent.organizerId === userId;

        if (!isSubEventCreator && !isParentOrganizer && !isAdmin) {
            throw new HttpException(
                'event.error.notEventOrganizer',
                HttpStatus.FORBIDDEN
            );
        }

        await this.databaseService.event.update({
            where: { id: subEventId },
            data: { deletedAt: new Date() },
        });

        return { success: true, message: 'event.success.deleted' };
    }

    // ─── Organizer endpoints ──────────────────────────────────────────────────

    async getMyOrganizedEvents(
        organizerId: string,
        query: MyOrganizedEventsDto
    ): Promise<OrganizedEventListResponseDto> {
        const limit = query.limit ?? 20;

        const where: Record<string, any> = { organizerId, deletedAt: null };
        if (query.status) where.status = query.status;
        if (query.type) where.type = query.type;

        const events = await this.databaseService.event.findMany({
            where,
            orderBy: { startAt: 'asc' },
            take: limit + 1,
            ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
        });

        let nextCursor: string | null = null;
        if (events.length > limit) {
            events.pop();
            nextCursor = events[events.length - 1].id;
        }

        // Fetch all counts in parallel to avoid N+1
        const eventIds = events.map(e => e.id);
        const [attendanceRows, favRows] = await Promise.all([
            this.databaseService.eventAttendance.groupBy({
                by: ['eventId', 'status'],
                where: { eventId: { in: eventIds } },
                _count: { _all: true },
            }),
            this.databaseService.userEventFavorite.groupBy({
                by: ['eventId'],
                where: { eventId: { in: eventIds } },
                _count: { _all: true },
            }),
        ]);

        const countMap = new Map<
            string,
            { favorites: number; attendees: number }
        >();
        for (const row of attendanceRows) {
            if (!countMap.has(row.eventId)) {
                countMap.set(row.eventId, { favorites: 0, attendees: 0 });
            }
            if (ELIGIBLE_ATTENDANCE_STATUSES.includes(row.status)) {
                countMap.get(row.eventId)!.attendees += row._count._all;
            }
        }
        for (const row of favRows) {
            if (!countMap.has(row.eventId)) {
                countMap.set(row.eventId, { favorites: 0, attendees: 0 });
            }
            countMap.get(row.eventId)!.favorites = row._count._all;
        }

        const items = events.map(e => {
            const counts = countMap.get(e.id) ?? {
                favorites: 0,
                attendees: 0,
            };
            return {
                ...this.attachInviteUrl(e),
                favoritesCount: counts.favorites,
                attendeesCount: counts.attendees,
            };
        });

        return { items: items as any, nextCursor };
    }
}
