import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Patch,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { DocGenericResponse } from 'src/common/doc/decorators/doc.generic.decorator';
import { DocResponse } from 'src/common/doc/decorators/doc.response.decorator';
import { AllowedRoles } from 'src/common/request/decorators/request.role.decorator';
import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';

import { UserListDto } from '../dtos/request/user.list.request';
import { UserUpdateOrganizerDto } from '../dtos/request/user.organizer.request';
import { UserUpdateRoleDto } from '../dtos/request/user.role.request';
import {
    UserListResponseDto,
    UserUpdateProfileResponseDto,
} from '../dtos/response/user.response';
import { UserService } from '../services/user.service';

@ApiTags('admin.user')
@Controller({
    path: '/admin/user',
    version: '1',
})
export class UserAdminController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @AllowedRoles([Role.ADMIN])
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'List users with optional filters (admin only)' })
    @DocResponse({
        serialization: UserListResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'user.success.list',
    })
    public async listUsers(
        @Query() query: UserListDto
    ): Promise<UserListResponseDto> {
        return this.userService.listUsers(query);
    }

    @Patch(':id/role')
    @AllowedRoles([Role.ADMIN])
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Update user role (USER / ADMIN / DEVELOPER)' })
    @DocResponse({
        serialization: UserUpdateProfileResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'user.success.updated',
    })
    public async updateUserRole(
        @Param('id') userId: string,
        @Body() payload: UserUpdateRoleDto
    ): Promise<UserUpdateProfileResponseDto> {
        return this.userService.updateRole(userId, payload);
    }

    @Patch(':id/organizer')
    @AllowedRoles([Role.ADMIN])
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Grant or revoke organizer privileges' })
    @DocResponse({
        serialization: UserUpdateProfileResponseDto,
        httpStatus: HttpStatus.OK,
        messageKey: 'user.success.updated',
    })
    public async updateOrganizer(
        @Param('id') userId: string,
        @Body() payload: UserUpdateOrganizerDto
    ): Promise<UserUpdateProfileResponseDto> {
        return this.userService.updateOrganizer(userId, payload.isOrganizer);
    }

    @Delete(':id')
    @AllowedRoles([Role.ADMIN])
    @ApiBearerAuth('accessToken')
    @ApiOperation({ summary: 'Delete user' })
    @DocGenericResponse({
        httpStatus: HttpStatus.OK,
        messageKey: 'user.success.deleted',
    })
    public async deleteUser(
        @Param('id') userId: string
    ): Promise<ApiGenericResponseDto> {
        return this.userService.deleteUser(userId);
    }
}
