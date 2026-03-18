import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { $Enums } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import { EventFavoriteService } from 'src/modules/event-favorite/services/event-favorite.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid';
const EVENT_ID = 'event-uuid';
const FAVORITE_ID = 'favorite-uuid';
const FRONTEND_URL = 'http://localhost:3000';

const mockPublishedEvent = {
    id: EVENT_ID,
    inviteCode: 'abc123',
    status: $Enums.EventStatus.PUBLISHED,
    deletedAt: null,
};

const mockDraftEvent = {
    ...mockPublishedEvent,
    status: $Enums.EventStatus.DRAFT,
};

const makeFavoriteRow = (overrides: Record<string, unknown> = {}) => ({
    id: FAVORITE_ID,
    userId: USER_ID,
    eventId: EVENT_ID,
    createdAt: new Date(),
    event: {
        id: EVENT_ID,
        title: 'Balada',
        inviteCode: 'abc123',
        coverImage: null,
        startAt: new Date(),
        endAt: new Date(),
        status: $Enums.EventStatus.PUBLISHED,
        type: $Enums.EventType.MAIN,
        organizer: {
            id: 'org-id',
            firstName: 'Org',
            lastName: 'Name',
            avatar: null,
        },
    },
    ...overrides,
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
    event: {
        findUnique: jest.fn(),
    },
    userEventFavorite: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    },
    eventAttendance: {
        groupBy: jest.fn(),
    },
};

const mockConfig = {
    get: jest.fn().mockReturnValue(FRONTEND_URL),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('EventFavoriteService', () => {
    let service: EventFavoriteService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventFavoriteService,
                { provide: DatabaseService, useValue: mockDb },
                { provide: ConfigService, useValue: mockConfig },
            ],
        }).compile();

        service = module.get<EventFavoriteService>(EventFavoriteService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ── favoriteEvent ─────────────────────────────────────────────────────────

    describe('favoriteEvent', () => {
        it('should throw 404 if event does not exist', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.favoriteEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 404 if event is not PUBLISHED', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockDraftEvent);

            await expect(
                service.favoriteEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 409 if event is already favorited', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockPublishedEvent);
            mockDb.userEventFavorite.findUnique.mockResolvedValue({
                id: FAVORITE_ID,
            });

            await expect(
                service.favoriteEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.CONFLICT })
            );

            expect(mockDb.userEventFavorite.create).not.toHaveBeenCalled();
        });

        it('should create favorite and return isFavorited:true on success', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockPublishedEvent);
            mockDb.userEventFavorite.findUnique.mockResolvedValue(null);
            mockDb.userEventFavorite.create.mockResolvedValue({
                id: FAVORITE_ID,
            });

            const result = await service.favoriteEvent(USER_ID, EVENT_ID);

            expect(mockDb.userEventFavorite.create).toHaveBeenCalledWith({
                data: { userId: USER_ID, eventId: EVENT_ID },
            });
            expect(result.isFavorited).toBe(true);
        });
    });

    // ── unfavoriteEvent ───────────────────────────────────────────────────────

    describe('unfavoriteEvent', () => {
        it('should throw 404 if favorite record does not exist', async () => {
            mockDb.userEventFavorite.findUnique.mockResolvedValue(null);

            await expect(
                service.unfavoriteEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );

            expect(mockDb.userEventFavorite.delete).not.toHaveBeenCalled();
        });

        it('should delete favorite and return isFavorited:false on success', async () => {
            mockDb.userEventFavorite.findUnique.mockResolvedValue({
                id: FAVORITE_ID,
                userId: USER_ID,
                eventId: EVENT_ID,
            });
            mockDb.userEventFavorite.delete.mockResolvedValue({
                id: FAVORITE_ID,
            });

            const result = await service.unfavoriteEvent(USER_ID, EVENT_ID);

            expect(mockDb.userEventFavorite.delete).toHaveBeenCalledWith({
                where: {
                    userId_eventId: { userId: USER_ID, eventId: EVENT_ID },
                },
            });
            expect(result.isFavorited).toBe(false);
        });
    });

    // ── getFavoriteEvents ─────────────────────────────────────────────────────

    describe('getFavoriteEvents', () => {
        it('should return empty list when user has no favorites', async () => {
            mockDb.userEventFavorite.findMany.mockResolvedValue([]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);

            const result = await service.getFavoriteEvents(USER_ID, {
                limit: 20,
            });

            expect(result.items).toHaveLength(0);
            expect(result.nextCursor).toBeNull();
        });

        it('should return items with isFavorited:true and inviteUrl', async () => {
            mockDb.userEventFavorite.findMany.mockResolvedValue([
                makeFavoriteRow(),
            ]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);

            const result = await service.getFavoriteEvents(USER_ID, {
                limit: 20,
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0]).toMatchObject({
                isFavorited: true,
                inviteUrl: `${FRONTEND_URL}/events/abc123`,
                favoritesCount: 0,
            });
        });

        it('should compute attendeesCount from eligible statuses', async () => {
            mockDb.userEventFavorite.findMany.mockResolvedValue([
                makeFavoriteRow(),
            ]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([
                {
                    eventId: EVENT_ID,
                    status: $Enums.EventAttendanceStatus.GOING,
                    _count: { _all: 3 },
                },
                {
                    eventId: EVENT_ID,
                    status: $Enums.EventAttendanceStatus.CHECKED_IN,
                    _count: { _all: 2 },
                },
                {
                    eventId: EVENT_ID,
                    status: $Enums.EventAttendanceStatus.CANCELLED,
                    _count: { _all: 5 },
                },
            ]);

            const result = await service.getFavoriteEvents(USER_ID, {
                limit: 20,
            });

            // GOING (3) + CHECKED_IN (2) = 5; CANCELLED is not eligible
            expect(result.items[0].attendeesCount).toBe(5);
        });

        it('should set nextCursor when more results exist than limit', async () => {
            const rows = [
                makeFavoriteRow({ id: 'fav-1', eventId: 'ev-1' }),
                makeFavoriteRow({ id: 'fav-2', eventId: 'ev-2' }),
            ];
            mockDb.userEventFavorite.findMany.mockResolvedValue(rows);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);

            const result = await service.getFavoriteEvents(USER_ID, {
                limit: 1,
            });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('fav-1');
        });

        it('should pass cursor to findMany when provided', async () => {
            mockDb.userEventFavorite.findMany.mockResolvedValue([]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);

            await service.getFavoriteEvents(USER_ID, {
                limit: 20,
                cursor: 'some-cursor-id',
            });

            expect(mockDb.userEventFavorite.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    cursor: { id: 'some-cursor-id' },
                    skip: 1,
                })
            );
        });
    });
});
