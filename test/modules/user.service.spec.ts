import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import { UserUpdateDto } from 'src/modules/user/dtos/request/user.update.request';
import { UserService } from 'src/modules/user/services/user.service';

describe('UserService', () => {
    let service: UserService;

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        event: {
            updateMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: DatabaseService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateUser', () => {
        it('should throw an error if user is not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.updateUser('non-existent-id', { firstName: 'John' })
            ).rejects.toThrow(HttpException);
        });

        it('should update and return the user if user exists', async () => {
            const mockUser = { id: '123', firstName: 'John', lastName: 'Doe' };
            const updateDto: UserUpdateDto = { firstName: 'Jane' };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                ...updateDto,
            });

            const result = await service.updateUser('123', updateDto);

            expect(result).toEqual({ ...mockUser, ...updateDto });
        });
    });

    describe('deleteUser', () => {
        it('should throw an error if user is not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.deleteUser('non-existent-id')).rejects.toThrow(
                HttpException
            );
        });

        it('should soft delete the user and return success message', async () => {
            const mockUser = { id: '123', firstName: 'John', lastName: 'Doe' };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.event.updateMany.mockResolvedValue({ count: 0 });
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                deletedAt: new Date(),
            });

            const result = await service.deleteUser('123');

            expect(result).toEqual({
                success: true,
                message: 'user.success.userDeleted',
            });
        });

        it('should cancel active events before soft deleting', async () => {
            const mockUser = { id: '123', firstName: 'John', lastName: 'Doe' };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.event.updateMany.mockResolvedValue({ count: 2 });
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                deletedAt: new Date(),
            });

            await service.deleteUser('123');

            expect(mockPrismaService.event.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ organizerId: '123' }),
                    data: expect.objectContaining({ status: 'CANCELLED' }),
                })
            );
        });
    });

    describe('updateRole', () => {
        it('should throw an error if user is not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.updateRole('non-existent-id', { role: Role.ADMIN })
            ).rejects.toThrow(HttpException);
        });

        it('should update and return user with new role', async () => {
            const mockUser = { id: '123', role: Role.USER, deletedAt: null };
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                role: Role.ADMIN,
            });

            const result = await service.updateRole('123', {
                role: Role.ADMIN,
            });

            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: '123' },
                data: { role: Role.ADMIN },
            });
            expect(result.role).toBe(Role.ADMIN);
        });
    });

    describe('updateOrganizer', () => {
        it('should throw 404 if user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.updateOrganizer('non-existent-id', true)
            ).rejects.toThrow(HttpException);
        });

        it('should grant organizer privilege', async () => {
            const mockUser = { id: '123', isOrganizer: false, deletedAt: null };
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                isOrganizer: true,
            });

            const result = await service.updateOrganizer('123', true);

            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: '123' },
                data: { isOrganizer: true },
            });
            expect(result.isOrganizer).toBe(true);
        });

        it('should revoke organizer privilege', async () => {
            const mockUser = { id: '123', isOrganizer: true, deletedAt: null };
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.user.update.mockResolvedValue({
                ...mockUser,
                isOrganizer: false,
            });

            const result = await service.updateOrganizer('123', false);

            expect(result.isOrganizer).toBe(false);
        });
    });

    describe('listUsers', () => {
        const mockUser = {
            id: '123',
            firstName: 'João',
            lastName: 'Silva',
            email: 'joao@test.com',
            deletedAt: null,
        };

        it('should return users without filters', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

            const result = await service.listUsers({ limit: 20 });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBeNull();
        });

        it('should filter by role', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

            await service.listUsers({ role: Role.ADMIN, limit: 20 });

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ role: Role.ADMIN }),
                })
            );
        });

        it('should filter by isOrganizer', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

            await service.listUsers({ isOrganizer: true, limit: 20 });

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ isOrganizer: true }),
                })
            );
        });

        it('should filter by search term', async () => {
            mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

            await service.listUsers({ search: 'João', limit: 20 });

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({
                                firstName: expect.objectContaining({
                                    contains: 'João',
                                }),
                            }),
                        ]),
                    }),
                })
            );
        });

        it('should return nextCursor when more results exist than limit', async () => {
            const users = [
                { ...mockUser, id: 'u-1' },
                { ...mockUser, id: 'u-2' },
            ];
            mockPrismaService.user.findMany.mockResolvedValue(users);

            const result = await service.listUsers({ limit: 1 });

            expect(result.items).toHaveLength(1);
            expect(result.nextCursor).toBe('u-1');
        });
    });

    describe('getProfile', () => {
        it('should throw an error if user is not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.getProfile('non-existent-id')).rejects.toThrow(
                HttpException
            );
        });

        it('should return the user profile if user exists', async () => {
            const mockUser = { id: '123', firstName: 'John', lastName: 'Doe' };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.getProfile('123');

            expect(result).toEqual(mockUser);
        });
    });
});
