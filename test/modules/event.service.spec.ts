import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { $Enums } from '@prisma/client';

import { ConfigService } from '@nestjs/config';

import { DatabaseService } from 'src/common/database/services/database.service';
import { EventAttendanceService } from 'src/modules/event-attendance/services/event-attendance.service';
import { EventService } from 'src/modules/event/services/event.service';

// Mock QRCode so tests don't generate real PNGs
jest.mock('qrcode', () => ({
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORGANIZER_ID = 'organizer-uuid';
const USER_ID = 'user-uuid';
const EVENT_ID = 'event-uuid';
const SUB_EVENT_ID = 'sub-event-uuid';
const INVITE_CODE = 'abc123def456';

const mockOrganizer = {
    id: ORGANIZER_ID,
    isOrganizer: true,
    deletedAt: null,
};

const mockNonOrganizer = {
    id: USER_ID,
    isOrganizer: false,
    deletedAt: null,
};

const mockMainEvent = {
    id: EVENT_ID,
    title: 'Balada do Mês',
    description: 'A maior festa',
    type: $Enums.EventType.MAIN,
    category: $Enums.EventCategory.NIGHTLIFE,
    status: $Enums.EventStatus.PUBLISHED,
    city: 'São Paulo',
    venueName: 'Clube X',
    address: 'Rua das Flores, 123',
    startAt: new Date('2026-06-15T22:00:00Z'),
    endAt: new Date('2026-06-16T06:00:00Z'),
    organizerId: ORGANIZER_ID,
    parentEventId: null,
    rootEventId: null,
    prePartyPermissionMode: $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
    afterPartyPermissionMode: $Enums.SubEventPermissionMode.ATTENDEES_ALLOWED,
    isPrivate: false,
    inviteCode: INVITE_CODE,
    approvalStatus: null,
    coverImage: null,
    latitude: null,
    longitude: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};

const mockSubEvent = {
    ...mockMainEvent,
    id: SUB_EVENT_ID,
    type: $Enums.EventType.AFTER_PARTY,
    parentEventId: EVENT_ID,
    rootEventId: EVENT_ID,
    organizerId: USER_ID,
    approvalStatus: $Enums.SubEventApprovalStatus.PENDING,
    inviteCode: 'sub-invite-code',
};

const mockCreateEventDto = {
    title: 'Balada do Mês',
    description: 'A maior festa',
    category: $Enums.EventCategory.NIGHTLIFE,
    city: 'São Paulo',
    venueName: 'Clube X',
    address: 'Rua das Flores, 123',
    startAt: new Date('2026-06-15T22:00:00Z'),
    endAt: new Date('2026-06-16T06:00:00Z'),
};

const mockCreateSubEventDto = {
    type: $Enums.EventType.AFTER_PARTY,
    title: 'After da Balada',
    description: 'O after oficial',
    category: $Enums.EventCategory.NIGHTLIFE,
    city: 'São Paulo',
    venueName: 'Rooftop Bar',
    address: 'Av. Paulista, 1000',
    startAt: new Date('2026-06-16T06:30:00Z'),
    endAt: new Date('2026-06-16T12:00:00Z'),
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
    user: {
        findUnique: jest.fn(),
    },
    event: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    eventAttendance: {
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
    },
    userEventFavorite: {
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
    },
};

const mockConfig = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockAttendanceService = {
    isEligibleAttendee: jest.fn(),
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('EventService', () => {
    let service: EventService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventService,
                { provide: DatabaseService, useValue: mockDb },
                { provide: ConfigService, useValue: mockConfig },
                {
                    provide: EventAttendanceService,
                    useValue: mockAttendanceService,
                },
            ],
        }).compile();

        service = module.get<EventService>(EventService);
        jest.clearAllMocks();
        mockConfig.get.mockReturnValue('http://localhost:3000');
        mockDb.eventAttendance.groupBy.mockResolvedValue([]);
        mockDb.userEventFavorite.groupBy.mockResolvedValue([]);
        mockDb.userEventFavorite.count.mockResolvedValue(0);
        mockDb.userEventFavorite.findUnique.mockResolvedValue(null);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ── createMainEvent ───────────────────────────────────────────────────────

    describe('createMainEvent', () => {
        it('should throw 404 if organizer user not found', async () => {
            mockDb.user.findUnique.mockResolvedValue(null);

            await expect(
                service.createMainEvent(ORGANIZER_ID, mockCreateEventDto)
            ).rejects.toThrow(HttpException);
        });

        it('should silently ignore isOfficial if user is not an organizer', async () => {
            mockDb.user.findUnique.mockResolvedValue(mockNonOrganizer);
            mockDb.event.create.mockResolvedValue({
                ...mockMainEvent,
                organizerId: USER_ID,
                isOfficial: false,
            });

            const result = await service.createMainEvent(USER_ID, {
                ...mockCreateEventDto,
                isOfficial: true,
            });

            expect(result.isOfficial).toBe(false);
        });

        it('should throw 400 if endAt is not after startAt', async () => {
            mockDb.user.findUnique.mockResolvedValue(mockOrganizer);

            await expect(
                service.createMainEvent(ORGANIZER_ID, {
                    ...mockCreateEventDto,
                    startAt: new Date('2026-06-16T06:00:00Z'),
                    endAt: new Date('2026-06-15T22:00:00Z'),
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should create and return the event with inviteUrl', async () => {
            mockDb.user.findUnique.mockResolvedValue(mockOrganizer);
            mockDb.event.create.mockResolvedValue(mockMainEvent);

            const result = await service.createMainEvent(
                ORGANIZER_ID,
                mockCreateEventDto
            );

            expect(mockDb.event.create).toHaveBeenCalled();
            expect(result).toHaveProperty('inviteUrl');
            expect(result.inviteUrl).toContain(mockMainEvent.inviteCode);
        });
    });

    // ── createSubEvent ────────────────────────────────────────────────────────

    describe('createSubEvent', () => {
        it('should throw 400 if type is MAIN', async () => {
            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, {
                    ...mockCreateSubEventDto,
                    type: $Enums.EventType.MAIN,
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should throw 404 if parent event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 400 if parent event is not MAIN', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                type: $Enums.EventType.PRE_PARTY,
            });

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should throw 422 if parent event is cancelled', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.CANCELLED,
            });

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should throw 403 if afterParty mode is DISABLED', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                afterPartyPermissionMode:
                    $Enums.SubEventPermissionMode.DISABLED,
            });

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 403 if mode is ORGANIZER_ONLY and user is not organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                afterPartyPermissionMode:
                    $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
            });

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 403 if mode is ATTENDEES_ALLOWED but user is not eligible', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent); // ATTENDEES_ALLOWED for afterParty
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(false);

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 400 if endAt is not after startAt', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, {
                    ...mockCreateSubEventDto,
                    startAt: new Date('2026-06-16T12:00:00Z'),
                    endAt: new Date('2026-06-16T06:00:00Z'),
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should throw 400 if after-party starts before main event ends', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, {
                    ...mockCreateSubEventDto,
                    type: $Enums.EventType.AFTER_PARTY,
                    // starts BEFORE main event ends (06:00)
                    startAt: new Date('2026-06-16T05:00:00Z'),
                    endAt: new Date('2026-06-16T09:00:00Z'),
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should throw 400 if pre-party ends after main event starts', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                prePartyPermissionMode:
                    $Enums.SubEventPermissionMode.ATTENDEES_ALLOWED,
            });
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, {
                    ...mockCreateSubEventDto,
                    type: $Enums.EventType.PRE_PARTY,
                    // ends AFTER main event starts (22:00)
                    startAt: new Date('2026-06-15T18:00:00Z'),
                    endAt: new Date('2026-06-15T23:00:00Z'),
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should throw 409 if user already has a pending/approved sub-event of the same type', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);
            mockDb.event.findFirst.mockResolvedValue(mockSubEvent); // existing duplicate

            await expect(
                service.createSubEvent(USER_ID, EVENT_ID, mockCreateSubEventDto)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.CONFLICT })
            );
        });

        it('should set approvalStatus PENDING when attendee creates sub-event', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);
            mockDb.event.findFirst.mockResolvedValue(null); // no duplicate
            mockDb.event.create.mockResolvedValue({
                ...mockSubEvent,
                approvalStatus: $Enums.SubEventApprovalStatus.PENDING,
            });

            await service.createSubEvent(
                USER_ID,
                EVENT_ID,
                mockCreateSubEventDto
            );

            expect(mockDb.event.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        approvalStatus: $Enums.SubEventApprovalStatus.PENDING,
                        status: $Enums.EventStatus.DRAFT,
                    }),
                })
            );
        });

        it('should set approvalStatus APPROVED and status PUBLISHED when organizer creates sub-event', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.event.findFirst.mockResolvedValue(null); // no duplicate
            mockDb.event.create.mockResolvedValue({
                ...mockSubEvent,
                organizerId: ORGANIZER_ID,
                approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
            });

            await service.createSubEvent(
                ORGANIZER_ID,
                EVENT_ID,
                mockCreateSubEventDto
            );

            expect(mockDb.event.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                        status: $Enums.EventStatus.PUBLISHED,
                    }),
                })
            );
            expect(
                mockAttendanceService.isEligibleAttendee
            ).not.toHaveBeenCalled();
        });

        it('should return sub-event with inviteUrl', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockAttendanceService.isEligibleAttendee.mockResolvedValue(true);
            mockDb.event.findFirst.mockResolvedValue(null); // no duplicate
            mockDb.event.create.mockResolvedValue(mockSubEvent);

            const result = await service.createSubEvent(
                USER_ID,
                EVENT_ID,
                mockCreateSubEventDto
            );

            expect(result).toHaveProperty('inviteUrl');
        });
    });

    // ── listEvents ────────────────────────────────────────────────────────────

    describe('listEvents', () => {
        it('should return events list with inviteUrl on each item', async () => {
            mockDb.event.findMany.mockResolvedValue([mockMainEvent]);

            const result = await service.listEvents({ limit: 20 });

            expect(result.items).toHaveLength(1);
            expect(result.items[0]).toHaveProperty('inviteUrl');
            expect(result.nextCursor).toBeNull();
        });

        it('should set nextCursor when there are more results than limit', async () => {
            const events = [
                { ...mockMainEvent, id: 'id-1' },
                { ...mockMainEvent, id: 'id-2' },
            ];
            mockDb.event.findMany.mockResolvedValue(events);

            const result = await service.listEvents({ limit: 1 });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('id-1');
        });

        it('should filter by approvalStatus APPROVED for PRE_PARTY type', async () => {
            mockDb.event.findMany.mockResolvedValue([]);

            await service.listEvents({ type: $Enums.EventType.PRE_PARTY });

            expect(mockDb.event.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                    }),
                })
            );
        });

        it('should filter by status PUBLISHED for MAIN type', async () => {
            mockDb.event.findMany.mockResolvedValue([]);

            await service.listEvents({ type: $Enums.EventType.MAIN });

            expect(mockDb.event.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: $Enums.EventStatus.PUBLISHED,
                    }),
                })
            );
        });

        it('should NOT filter by approvalStatus for MAIN type', async () => {
            mockDb.event.findMany.mockResolvedValue([]);

            await service.listEvents({ type: $Enums.EventType.MAIN });

            const call = mockDb.event.findMany.mock.calls[0][0];
            expect(call.where).not.toHaveProperty('approvalStatus');
        });
    });

    // ── getEventById ──────────────────────────────────────────────────────────

    describe('getEventById', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);
            mockDb.eventAttendance.count.mockResolvedValue(0);

            await expect(service.getEventById('nonexistent')).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should return event detail with counts and grouped sub-events', async () => {
            const preParty = {
                ...mockSubEvent,
                type: $Enums.EventType.PRE_PARTY,
            };
            const afterParty = {
                ...mockSubEvent,
                type: $Enums.EventType.AFTER_PARTY,
            };

            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                organizer: {
                    id: ORGANIZER_ID,
                    firstName: 'João',
                    lastName: 'Silva',
                    avatar: null,
                },
                childEvents: [preParty, afterParty],
            });
            mockDb.userEventFavorite.count.mockResolvedValue(10); // favoritesCount
            mockDb.eventAttendance.count.mockResolvedValue(5); // attendeesCount

            const result = await service.getEventById(EVENT_ID);

            expect(result.preParties).toHaveLength(1);
            expect(result.afterParties).toHaveLength(1);
            expect(result.favoritesCount).toBe(10);
            expect(result.attendeesCount).toBe(5);
            expect(result).toHaveProperty('inviteUrl');
        });
    });

    // ── updateEvent ───────────────────────────────────────────────────────────

    describe('updateEvent', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.updateEvent(ORGANIZER_ID, EVENT_ID, {
                    title: 'New Title',
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 403 if user is not the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            await expect(
                service.updateEvent(USER_ID, EVENT_ID, { title: 'New Title' })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 400 if dates are invalid', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            await expect(
                service.updateEvent(ORGANIZER_ID, EVENT_ID, {
                    startAt: new Date('2026-06-16T10:00:00Z'),
                    endAt: new Date('2026-06-16T08:00:00Z'),
                })
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
            );
        });

        it('should update and return the event with inviteUrl', async () => {
            const updated = { ...mockMainEvent, title: 'Updated Title' };
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.event.update.mockResolvedValue(updated);

            const result = await service.updateEvent(ORGANIZER_ID, EVENT_ID, {
                title: 'Updated Title',
            });

            expect(result.title).toBe('Updated Title');
            expect(result).toHaveProperty('inviteUrl');
        });
    });

    // ── cancelEvent ───────────────────────────────────────────────────────────

    describe('cancelEvent', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.cancelEvent(ORGANIZER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 403 if user is not the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            await expect(
                service.cancelEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should cascade cancel all child sub-events when cancelling a MAIN event', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.event.updateMany.mockResolvedValue({ count: 2 });
            mockDb.event.update.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.CANCELLED,
            });

            await service.cancelEvent(ORGANIZER_ID, EVENT_ID);

            expect(mockDb.event.updateMany).toHaveBeenCalledWith({
                where: { parentEventId: EVENT_ID, deletedAt: null },
                data: { status: $Enums.EventStatus.CANCELLED },
            });
        });

        it('should NOT cascade when cancelling a sub-event', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockSubEvent,
                organizerId: ORGANIZER_ID,
            });
            mockDb.event.update.mockResolvedValue({
                ...mockSubEvent,
                status: $Enums.EventStatus.CANCELLED,
            });

            await service.cancelEvent(ORGANIZER_ID, SUB_EVENT_ID);

            expect(mockDb.event.updateMany).not.toHaveBeenCalled();
        });
    });

    // ── listPendingSubEvents ──────────────────────────────────────────────────

    describe('listPendingSubEvents', () => {
        it('should throw 404 if parent event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.listPendingSubEvents(ORGANIZER_ID, EVENT_ID, {})
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 403 if user is not the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            await expect(
                service.listPendingSubEvents(USER_ID, EVENT_ID, {})
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should return list of pending sub-events', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.event.findMany.mockResolvedValue([mockSubEvent]);

            const result = await service.listPendingSubEvents(
                ORGANIZER_ID,
                EVENT_ID,
                {}
            );

            expect(result.items).toHaveLength(1);
            expect(mockDb.event.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        approvalStatus: $Enums.SubEventApprovalStatus.PENDING,
                    }),
                })
            );
        });

        it('should support cursor pagination', async () => {
            const events = [
                { ...mockSubEvent, id: 'sub-1' },
                { ...mockSubEvent, id: 'sub-2' },
            ];
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.event.findMany.mockResolvedValue(events);

            const result = await service.listPendingSubEvents(
                ORGANIZER_ID,
                EVENT_ID,
                { limit: 1 }
            );

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('sub-1');
        });
    });

    // ── approveSubEvent ───────────────────────────────────────────────────────

    describe('approveSubEvent', () => {
        it('should throw 404 if parent event not found', async () => {
            mockDb.event.findUnique.mockResolvedValueOnce(null);

            await expect(
                service.approveSubEvent(ORGANIZER_ID, EVENT_ID, SUB_EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 403 if user is not the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValueOnce(mockMainEvent);

            await expect(
                service.approveSubEvent(USER_ID, EVENT_ID, SUB_EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 404 if sub-event not found or wrong parent', async () => {
            mockDb.event.findUnique
                .mockResolvedValueOnce(mockMainEvent)
                .mockResolvedValueOnce(null);

            await expect(
                service.approveSubEvent(ORGANIZER_ID, EVENT_ID, SUB_EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 422 if sub-event is not PENDING', async () => {
            mockDb.event.findUnique
                .mockResolvedValueOnce(mockMainEvent)
                .mockResolvedValueOnce({
                    ...mockSubEvent,
                    approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                });

            await expect(
                service.approveSubEvent(ORGANIZER_ID, EVENT_ID, SUB_EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should approve a pending sub-event', async () => {
            mockDb.event.findUnique
                .mockResolvedValueOnce(mockMainEvent)
                .mockResolvedValueOnce(mockSubEvent);
            mockDb.event.update.mockResolvedValue({
                ...mockSubEvent,
                approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
            });

            const result = await service.approveSubEvent(
                ORGANIZER_ID,
                EVENT_ID,
                SUB_EVENT_ID
            );

            expect(mockDb.event.update).toHaveBeenCalledWith({
                where: { id: SUB_EVENT_ID },
                data: {
                    approvalStatus: $Enums.SubEventApprovalStatus.APPROVED,
                    status: $Enums.EventStatus.PUBLISHED,
                },
            });
            expect(result.approvalStatus).toBe(
                $Enums.SubEventApprovalStatus.APPROVED
            );
        });
    });

    // ── rejectSubEvent ────────────────────────────────────────────────────────

    describe('rejectSubEvent', () => {
        it('should throw 422 if sub-event is not PENDING', async () => {
            mockDb.event.findUnique
                .mockResolvedValueOnce(mockMainEvent)
                .mockResolvedValueOnce({
                    ...mockSubEvent,
                    approvalStatus: $Enums.SubEventApprovalStatus.REJECTED,
                });

            await expect(
                service.rejectSubEvent(ORGANIZER_ID, EVENT_ID, SUB_EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should reject a pending sub-event', async () => {
            mockDb.event.findUnique
                .mockResolvedValueOnce(mockMainEvent)
                .mockResolvedValueOnce(mockSubEvent);
            mockDb.event.update.mockResolvedValue({
                ...mockSubEvent,
                approvalStatus: $Enums.SubEventApprovalStatus.REJECTED,
            });

            const result = await service.rejectSubEvent(
                ORGANIZER_ID,
                EVENT_ID,
                SUB_EVENT_ID
            );

            expect(mockDb.event.update).toHaveBeenCalledWith({
                where: { id: SUB_EVENT_ID },
                data: {
                    approvalStatus: $Enums.SubEventApprovalStatus.REJECTED,
                },
            });
            expect(result.approvalStatus).toBe(
                $Enums.SubEventApprovalStatus.REJECTED
            );
        });
    });

    // ── getInviteInfo ─────────────────────────────────────────────────────────

    describe('getInviteInfo', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.getInviteInfo(ORGANIZER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should return inviteCode, inviteUrl and qrCodeDataUrl', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            const result = await service.getInviteInfo(ORGANIZER_ID, EVENT_ID);

            expect(result.inviteCode).toBe(INVITE_CODE);
            expect(result.inviteUrl).toContain(INVITE_CODE);
            expect(result.qrCodeDataUrl).toBe(
                'data:image/png;base64,mockqrcode'
            );
        });
    });

    // ── getUserContext ────────────────────────────────────────────────────────

    describe('getUserContext', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.getUserContext(USER_ID, 'nonexistent')
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should return isOrganizer=true and all manage permissions for the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent); // organizerId = ORGANIZER_ID
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getUserContext(ORGANIZER_ID, EVENT_ID);

            expect(result.isOrganizer).toBe(true);
            expect(result.canManageEvent).toBe(true);
            expect(result.canApproveSubEvents).toBe(true);
        });

        it('should return canCreatePreParty=false when mode is DISABLED', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                prePartyPermissionMode: $Enums.SubEventPermissionMode.DISABLED,
            });
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getUserContext(ORGANIZER_ID, EVENT_ID);

            expect(result.canCreatePreParty).toBe(false);
        });

        it('should return canCreate=false for non-organizer on ORGANIZER_ONLY mode', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                prePartyPermissionMode:
                    $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
                afterPartyPermissionMode:
                    $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
            });
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getUserContext(USER_ID, EVENT_ID);

            expect(result.canCreatePreParty).toBe(false);
            expect(result.canCreateAfterParty).toBe(false);
            expect(result.isOrganizer).toBe(false);
        });

        it('should return canCreate=false for ATTENDEES_ALLOWED when user is only CANCELLED', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent); // afterParty = ATTENDEES_ALLOWED
            mockDb.eventAttendance.findUnique.mockResolvedValue({
                status: $Enums.EventAttendanceStatus.CANCELLED,
            });

            const result = await service.getUserContext(USER_ID, EVENT_ID);

            expect(result.canCreateAfterParty).toBe(false);
            expect(result.attendanceStatus).toBe(
                $Enums.EventAttendanceStatus.CANCELLED
            );
        });

        it('should return canCreate=true for ATTENDEES_ALLOWED when user is GOING', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue({
                status: $Enums.EventAttendanceStatus.GOING,
            });

            const result = await service.getUserContext(USER_ID, EVENT_ID);

            expect(result.canCreateAfterParty).toBe(true);
            expect(result.attendanceStatus).toBe(
                $Enums.EventAttendanceStatus.GOING
            );
        });

        it('should return attendanceStatus=null when user has no attendance record', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getUserContext(USER_ID, EVENT_ID);

            expect(result.attendanceStatus).toBeNull();
        });

        it('should return all false flags when event is cancelled', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.CANCELLED,
                organizerId: ORGANIZER_ID,
            });
            mockDb.eventAttendance.findUnique.mockResolvedValue(null);

            const result = await service.getUserContext(ORGANIZER_ID, EVENT_ID);

            expect(result.canCreatePreParty).toBe(false);
            expect(result.canCreateAfterParty).toBe(false);
            expect(result.canManageEvent).toBe(false);
            expect(result.canApproveSubEvents).toBe(false);
        });
    });

    // ── publishEvent ──────────────────────────────────────────────────────────

    describe('publishEvent', () => {
        it('should throw 404 if event not found', async () => {
            mockDb.event.findUnique.mockResolvedValue(null);

            await expect(
                service.publishEvent(ORGANIZER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.NOT_FOUND })
            );
        });

        it('should throw 403 if user is not the organizer', async () => {
            mockDb.event.findUnique.mockResolvedValue(mockMainEvent);

            await expect(
                service.publishEvent(USER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({ status: HttpStatus.FORBIDDEN })
            );
        });

        it('should throw 422 if event is not in DRAFT status', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.PUBLISHED,
            });

            await expect(
                service.publishEvent(ORGANIZER_ID, EVENT_ID)
            ).rejects.toThrow(
                expect.objectContaining({
                    status: HttpStatus.UNPROCESSABLE_ENTITY,
                })
            );
        });

        it('should publish a draft event', async () => {
            mockDb.event.findUnique.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.DRAFT,
            });
            mockDb.event.update.mockResolvedValue({
                ...mockMainEvent,
                status: $Enums.EventStatus.PUBLISHED,
            });

            const result = await service.publishEvent(ORGANIZER_ID, EVENT_ID);

            expect(mockDb.event.update).toHaveBeenCalledWith({
                where: { id: EVENT_ID },
                data: { status: $Enums.EventStatus.PUBLISHED },
            });
            expect(result.status).toBe($Enums.EventStatus.PUBLISHED);
            expect(result).toHaveProperty('inviteUrl');
        });
    });

    // ── getMyOrganizedEvents ──────────────────────────────────────────────────

    describe('getMyOrganizedEvents', () => {
        it('should return organized events with attendee and favorites counts', async () => {
            mockDb.event.findMany.mockResolvedValue([mockMainEvent]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([
                {
                    eventId: EVENT_ID,
                    status: $Enums.EventAttendanceStatus.GOING,
                    _count: { _all: 5 },
                },
                {
                    eventId: EVENT_ID,
                    status: $Enums.EventAttendanceStatus.ATTENDED,
                    _count: { _all: 3 },
                },
            ]);
            mockDb.userEventFavorite.groupBy.mockResolvedValue([
                {
                    eventId: EVENT_ID,
                    _count: { _all: 12 },
                },
            ]);

            const result = await service.getMyOrganizedEvents(ORGANIZER_ID, {
                limit: 20,
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0].favoritesCount).toBe(12);
            expect(result.items[0].attendeesCount).toBe(8); // GOING(5) + ATTENDED(3)
        });

        it('should return zero counts when no attendance records exist', async () => {
            mockDb.event.findMany.mockResolvedValue([mockMainEvent]);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);
            mockDb.userEventFavorite.groupBy.mockResolvedValue([]);

            const result = await service.getMyOrganizedEvents(ORGANIZER_ID, {
                limit: 20,
            });

            expect(result.items[0].favoritesCount).toBe(0);
            expect(result.items[0].attendeesCount).toBe(0);
        });

        it('should set nextCursor when more results exist than limit', async () => {
            const events = [
                { ...mockMainEvent, id: 'id-1' },
                { ...mockMainEvent, id: 'id-2' },
            ];
            mockDb.event.findMany.mockResolvedValue(events);
            mockDb.eventAttendance.groupBy.mockResolvedValue([]);

            const result = await service.getMyOrganizedEvents(ORGANIZER_ID, {
                limit: 1,
            });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('id-1');
        });
    });
});
