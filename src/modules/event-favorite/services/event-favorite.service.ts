import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { $Enums } from '@prisma/client'; // needed for EventStatus check

import { DatabaseService } from 'src/common/database/services/database.service';
import { ELIGIBLE_ATTENDANCE_STATUSES } from 'src/modules/event-attendance/interfaces/event-attendance.service.interface';

import { FavoriteListQueryDto } from '../dtos/request/event-favorite.list.request';
import {
    FavoriteEventListResponseDto,
    FavoriteStatusResponseDto,
} from '../dtos/response/event-favorite.response';

@Injectable()
export class EventFavoriteService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService
    ) {}

    private buildInviteUrl(inviteCode: string): string {
        const frontendUrl = this.configService.get<string>(
            'app.frontendUrl',
            'http://localhost:3000'
        );
        return `${frontendUrl}/events/${inviteCode}`;
    }

    async favoriteEvent(
        userId: string,
        eventId: string
    ): Promise<FavoriteStatusResponseDto> {
        const event = await this.databaseService.event.findUnique({
            where: { id: eventId, deletedAt: null },
        });

        if (!event) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        if (event.status !== $Enums.EventStatus.PUBLISHED) {
            throw new HttpException(
                'event.error.notFound',
                HttpStatus.NOT_FOUND
            );
        }

        const existing =
            await this.databaseService.userEventFavorite.findUnique({
                where: { userId_eventId: { userId, eventId } },
            });

        if (existing) {
            throw new HttpException(
                'event.error.alreadyFavorited',
                HttpStatus.CONFLICT
            );
        }

        await this.databaseService.userEventFavorite.create({
            data: { userId, eventId },
        });

        return { isFavorited: true };
    }

    async unfavoriteEvent(
        userId: string,
        eventId: string
    ): Promise<FavoriteStatusResponseDto> {
        const existing =
            await this.databaseService.userEventFavorite.findUnique({
                where: { userId_eventId: { userId, eventId } },
            });

        if (!existing) {
            throw new HttpException(
                'event.error.notFavorited',
                HttpStatus.NOT_FOUND
            );
        }

        await this.databaseService.userEventFavorite.delete({
            where: { userId_eventId: { userId, eventId } },
        });

        return { isFavorited: false };
    }

    async getFavoriteEvents(
        userId: string,
        query: FavoriteListQueryDto
    ): Promise<FavoriteEventListResponseDto> {
        const limit = query.limit ?? 20;

        const favorites = await this.databaseService.userEventFavorite.findMany(
            {
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit + 1,
                ...(query.cursor && {
                    cursor: { id: query.cursor },
                    skip: 1,
                }),
                include: {
                    event: {
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
            }
        );

        let nextCursor: string | null = null;
        if (favorites.length > limit) {
            favorites.pop();
            nextCursor = favorites[favorites.length - 1].id;
        }

        const eventIds = favorites.map(f => f.eventId);

        // Fetch attendance counts in one grouped query to avoid N+1
        const countRows = await this.databaseService.eventAttendance.groupBy({
            by: ['eventId', 'status'],
            where: { eventId: { in: eventIds } },
            _count: { _all: true },
        });

        const countMap = new Map<string, number>();
        for (const row of countRows) {
            if (ELIGIBLE_ATTENDANCE_STATUSES.includes(row.status)) {
                countMap.set(
                    row.eventId,
                    (countMap.get(row.eventId) ?? 0) + row._count._all
                );
            }
        }

        const items = favorites.map(f => ({
            ...f.event,
            inviteUrl: this.buildInviteUrl(f.event.inviteCode),
            favoritesCount: 0, // not meaningful when listing your own favorites
            attendeesCount: countMap.get(f.eventId) ?? 0,
            distance: null,
            isFavorited: true,
        }));

        return { items: items as any, nextCursor };
    }
}
