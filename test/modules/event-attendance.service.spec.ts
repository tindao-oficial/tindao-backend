import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { $Enums } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import { EventAttendanceService } from 'src/modules/event-attendance/services/event-attendance.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid';
const EVENT_ID = 'event-uuid';
const ATTENDANCE_ID = 'attendance-uuid';

const mockActiveEvent = {
    id: EVENT_ID,
    status: $Enums.EventStatus.PUBLISHED,
    deletedAt: null,
};

const mockCancelledEvent = {
    ...mockActiveEvent,
    status: $Enums.EventStatus.CANCELLED,
};

const makeAttendance = (status: $Enums.EventAttendanceStatus) => ({
    id: ATTENDANCE_ID,
    eventId: EVENT_ID,
    userId: USER_ID,
    status,
    source: $Enums.EventAttendanceSource.MANUAL,
    createdAt: new Date(),
    updatedAt: new Date(),
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
    event: {
        findUnique: jest.fn(),
    },
    eventAttendance: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('EventAttendanceService', () => {
    let service: EventAttendanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventAttendanceService,
                { provide: DatabaseService, useValue: mockDb },
            ],
        }).compile();

        service = module.get<EventAttendanceService>(EventAttendanceService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ── markInterested ────────────────────────────────────────────────────────

    describe('markInterested', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.markInterested(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 422 if event is cancelled', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockCancelledEvent);

            await expect(
                service.markInterested(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should create INTERESTED record when no existing record', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);
            mockDb.eventAttendance.create.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.INTERESTED)
            );

            const result = await service.markInterested(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: $Enums.EventAttendanceStatus.INTERESTED,
                    }),
                })
            );
            expect(result.status).toBe($Enums.EventAttendanceStatus.INTERESTED);
        });

        it('should NOT downgrade from GOING to INTERESTED', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );

            const result = await service.markInterested(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).not.toHaveBeenCalled();
            expect(mockDb.eventAttendance.create).not.toHaveBeenCalled();
            expect(result.status).toBe($Enums.EventAttendanceStatus.GOING);
        });

        it('should upgrade from CANCELLED to INTERESTED', async () => {
            const cancelled = makeAttendance(
                $Enums.EventAttendanceStatus.CANCELLED
            );
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(cancelled);
            mockDb.eventAttendance.update.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.INTERESTED)
            );

            const result = await service.markInterested(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).toHaveBeenCalled();
            expect(result.status).toBe($Enums.EventAttendanceStatus.INTERESTED);
        });
    });

    // ── markGoing ─────────────────────────────────────────────────────────────

    describe('markGoing', () => {
        it('should throw 422 if event is cancelled', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockCancelledEvent);

            await expect(service.markGoing(USER_ID, EVENT_ID)).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should create GOING record when no existing record', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);
            mockDb.eventAttendance.create.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );

            const result = await service.markGoing(USER_ID, EVENT_ID);

            expect(result.status).toBe($Enums.EventAttendanceStatus.GOING);
        });

        it('should upgrade from INTERESTED to GOING', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.INTERESTED)
            );
            mockDb.eventAttendance.update.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );

            const result = await service.markGoing(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).toHaveBeenCalled();
            expect(result.status).toBe($Enums.EventAttendanceStatus.GOING);
        });

        it('should NOT downgrade from CHECKED_IN to GOING', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.CHECKED_IN)
            );

            const result = await service.markGoing(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).not.toHaveBeenCalled();
            expect(result.status).toBe($Enums.EventAttendanceStatus.CHECKED_IN);
        });

        it('should NOT downgrade from ATTENDED to GOING', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockActiveEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.ATTENDED)
            );

            const result = await service.markGoing(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).not.toHaveBeenCalled();
            expect(result.status).toBe($Enums.EventAttendanceStatus.ATTENDED);
        });
    });

    // ── cancelAttendance ──────────────────────────────────────────────────────

    describe('cancelAttendance', () => {
        it('should return null when no attendance record exists', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.cancelAttendance(USER_ID, EVENT_ID);

            expect(result).toBeNull();
            expect(mockDb.eventAttendance.update).not.toHaveBeenCalled();
        });

        it('should set CANCELLED from GOING', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );
            mockDb.eventAttendance.update.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.CANCELLED)
            );

            const result = await service.cancelAttendance(USER_ID, EVENT_ID);

            expect(mockDb.eventAttendance.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { status: $Enums.EventAttendanceStatus.CANCELLED },
                })
            );
            expect(result!.status).toBe($Enums.EventAttendanceStatus.CANCELLED);
        });

        it('should set CANCELLED even from ATTENDED (always overrides)', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.ATTENDED)
            );
            mockDb.eventAttendance.update.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.CANCELLED)
            );

            const result = await service.cancelAttendance(USER_ID, EVENT_ID);

            expect(result!.status).toBe($Enums.EventAttendanceStatus.CANCELLED);
        });
    });

    // ── listEventAttendees ────────────────────────────────────────────────────

    describe('listEventAttendees', () => {
        const mockAttendeeRecord = {
            id: ATTENDANCE_ID,
            eventId: EVENT_ID,
            userId: USER_ID,
            status: $Enums.EventAttendanceStatus.GOING,
            source: $Enums.EventAttendanceSource.MANUAL,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
                id: USER_ID,
                userName: 'joao',
                firstName: 'João',
                lastName: 'Silva',
                profilePhoto: null,
                avatar: null,
            },
        };

        it('should return attendees with default active statuses', async () => {
            mockDb.eventAttendance.findMany.mockResolvedValue([
                mockAttendeeRecord,
            ]);

            const result = await service.listEventAttendees(EVENT_ID, {
                limit: 20,
            });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBeNull();
            expect(mockDb.eventAttendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: {
                            in: expect.arrayContaining([
                                $Enums.EventAttendanceStatus.GOING,
                                $Enums.EventAttendanceStatus.CHECKED_IN,
                                $Enums.EventAttendanceStatus.ATTENDED,
                            ]),
                        },
                    }),
                })
            );
        });

        it('should filter by specific status when provided', async () => {
            mockDb.eventAttendance.findMany.mockResolvedValue([
                mockAttendeeRecord,
            ]);

            await service.listEventAttendees(EVENT_ID, {
                status: $Enums.EventAttendanceStatus.INTERESTED,
                limit: 20,
            });

            expect(mockDb.eventAttendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: {
                            in: [$Enums.EventAttendanceStatus.INTERESTED],
                        },
                    }),
                })
            );
        });

        it('should set nextCursor when more results exist than limit', async () => {
            const records = [
                { ...mockAttendeeRecord, id: 'att-1' },
                { ...mockAttendeeRecord, id: 'att-2' },
            ];
            mockDb.eventAttendance.findMany.mockResolvedValue(records);

            const result = await service.listEventAttendees(EVENT_ID, {
                limit: 1,
            });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('att-1');
        });
    });

    // ── getMyAttendanceForEvent ────────────────────────────────────────────────

    describe('getMyAttendanceForEvent', () => {
        it('should return exists:false when no record found', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getMyAttendanceForEvent(
                USER_ID,
                EVENT_ID
            );

            expect(result.exists).toBe(false);
            expect(result.status).toBeNull();
            expect(result.source).toBeNull();
        });

        it('should return exists:true with status and source when record found', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );

            const result = await service.getMyAttendanceForEvent(
                USER_ID,
                EVENT_ID
            );

            expect(result.exists).toBe(true);
            expect(result.status).toBe($Enums.EventAttendanceStatus.GOING);
            expect(result.source).toBe($Enums.EventAttendanceSource.MANUAL);
        });
    });

    // ── isEligibleAttendee ────────────────────────────────────────────────────

    describe('isEligibleAttendee', () => {
        it('should return false when no record exists', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.isEligibleAttendee(USER_ID, EVENT_ID);

            expect(result).toBe(false);
        });

        it('should return false for INTERESTED status', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.INTERESTED)
            );

            expect(await service.isEligibleAttendee(USER_ID, EVENT_ID)).toBe(
                false
            );
        });

        it('should return false for CANCELLED status', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.CANCELLED)
            );

            expect(await service.isEligibleAttendee(USER_ID, EVENT_ID)).toBe(
                false
            );
        });

        it('should return true for GOING status', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.GOING)
            );

            expect(await service.isEligibleAttendee(USER_ID, EVENT_ID)).toBe(
                true
            );
        });

        it('should return true for CHECKED_IN status', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.CHECKED_IN)
            );

            expect(await service.isEligibleAttendee(USER_ID, EVENT_ID)).toBe(
                true
            );
        });

        it('should return true for ATTENDED status', async () => {
            mockDb.eventAttendance.findUnique.mockResolvedValue(
                makeAttendance($Enums.EventAttendanceStatus.ATTENDED)
            );

            expect(await service.isEligibleAttendee(USER_ID, EVENT_ID)).toBe(
                true
            );
        });
    });

    // ── listMyEvents ──────────────────────────────────────────────────────────

    describe('listMyEvents', () => {
        const mockRecord = {
            id: ATTENDANCE_ID,
            eventId: EVENT_ID,
            userId: USER_ID,
            status: $Enums.EventAttendanceStatus.GOING,
            source: $Enums.EventAttendanceSource.MANUAL,
            createdAt: new Date(),
            updatedAt: new Date(),
            event: {
                id: EVENT_ID,
                title: 'Balada',
                type: $Enums.EventType.MAIN,
                startAt: new Date(),
                endAt: new Date(),
                organizer: {
                    id: 'org-id',
                    userName: 'org',
                    firstName: null,
                    lastName: null,
                    profilePhoto: null,
                    avatar: null,
                },
            },
        };

        it('should return user events list', async () => {
            mockDb.eventAttendance.findMany.mockResolvedValue([mockRecord]);

            const result = await service.listMyEvents(USER_ID, { limit: 20 });

            expect(result.items).toHaveLength(1);
            expect(result.items[0]).toHaveProperty('attendance');
            expect(result.items[0]).toHaveProperty('event');
        });

        it('should apply upcoming filter', async () => {
            mockDb.eventAttendance.findMany.mockResolvedValue([]);

            await service.listMyEvents(USER_ID, { upcoming: true, limit: 20 });

            expect(mockDb.eventAttendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        event: expect.objectContaining({
                            startAt: expect.objectContaining({
                                gte: expect.any(Date),
                            }),
                        }),
                    }),
                })
            );
        });

        it('should apply past filter', async () => {
            mockDb.eventAttendance.findMany.mockResolvedValue([]);

            await service.listMyEvents(USER_ID, { past: true, limit: 20 });

            expect(mockDb.eventAttendance.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        event: expect.objectContaining({
                            endAt: expect.objectContaining({
                                lt: expect.any(Date),
                            }),
                        }),
                    }),
                })
            );
        });

        it('should return nextCursor when more results exist than limit', async () => {
            const records = [
                { ...mockRecord, id: 'att-1' },
                { ...mockRecord, id: 'att-2' },
            ];
            mockDb.eventAttendance.findMany.mockResolvedValue(records);

            const result = await service.listMyEvents(USER_ID, { limit: 1 });

            expect(result.nextCursor).toBe('att-1');
        });
    });
});
