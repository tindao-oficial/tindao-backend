import { HttpStatus, Injectable, HttpException } from '@nestjs/common';

import { $Enums } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';

import { UserListDto } from '../dtos/request/user.list.request';
import { UserUpdateRoleDto } from '../dtos/request/user.role.request';
import { UserUpdateDto } from '../dtos/request/user.update.request';
import {
    UserGetProfileResponseDto,
    UserListResponseDto,
    UserUpdateProfileResponseDto,
} from '../dtos/response/user.response';
import { IUserService } from '../interfaces/user.service.interface';

@Injectable()
export class UserService implements IUserService {
    constructor(private readonly databaseService: DatabaseService) {}

    async updateUser(
        userId: string,
        data: UserUpdateDto
    ): Promise<UserUpdateProfileResponseDto> {
        try {
            const user = await this.databaseService.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new HttpException(
                    'user.error.userNotFound',
                    HttpStatus.NOT_FOUND
                );
            }
            const updatedUser = await this.databaseService.user.update({
                where: { id: userId },
                data,
            });
            return updatedUser;
        } catch (error) {
            throw error;
        }
    }

    async deleteUser(userId: string): Promise<ApiGenericResponseDto> {
        try {
            const user = await this.databaseService.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new HttpException(
                    'user.error.userNotFound',
                    HttpStatus.NOT_FOUND
                );
            }
            // Cancel all active events belonging to the deleted user
            await this.databaseService.event.updateMany({
                where: {
                    organizerId: userId,
                    status: {
                        in: [
                            $Enums.EventStatus.DRAFT,
                            $Enums.EventStatus.PUBLISHED,
                        ],
                    },
                    deletedAt: null,
                },
                data: { status: $Enums.EventStatus.CANCELLED },
            });

            await this.databaseService.user.update({
                where: { id: userId },
                data: { deletedAt: new Date() },
            });

            return {
                success: true,
                message: 'user.success.userDeleted',
            };
        } catch (error) {
            throw error;
        }
    }

    async updateRole(
        userId: string,
        data: UserUpdateRoleDto
    ): Promise<UserUpdateProfileResponseDto> {
        const user = await this.databaseService.user.findUnique({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.databaseService.user.update({
            where: { id: userId },
            data: { role: data.role },
        });
    }

    async updateOrganizer(
        userId: string,
        isOrganizer: boolean
    ): Promise<UserUpdateProfileResponseDto> {
        const user = await this.databaseService.user.findUnique({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.databaseService.user.update({
            where: { id: userId },
            data: { isOrganizer },
        });
    }

    async listUsers(query: UserListDto): Promise<UserListResponseDto> {
        const limit = query.limit ?? 20;

        const where: Record<string, any> = { deletedAt: null };
        if (query.role !== undefined) where.role = query.role;
        if (query.isOrganizer !== undefined)
            where.isOrganizer = query.isOrganizer;
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const users = await this.databaseService.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
        });

        let nextCursor: string | null = null;
        if (users.length > limit) {
            users.pop();
            nextCursor = users[users.length - 1].id;
        }

        return { items: users as any, nextCursor };
    }

    async getProfile(id: string): Promise<UserGetProfileResponseDto> {
        const user = await this.databaseService.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return user;
    }
}
