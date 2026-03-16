import { ApiGenericResponseDto } from 'src/common/response/dtos/response.generic.dto';

import { UserListDto } from '../dtos/request/user.list.request';
import { UserUpdateRoleDto } from '../dtos/request/user.role.request';
import { UserUpdateDto } from '../dtos/request/user.update.request';
import {
    UserGetProfileResponseDto,
    UserListResponseDto,
    UserUpdateProfileResponseDto,
} from '../dtos/response/user.response';

export interface IUserService {
    updateUser(
        userId: string,
        data: UserUpdateDto
    ): Promise<UserUpdateProfileResponseDto>;
    deleteUser(userId: string): Promise<ApiGenericResponseDto>;
    getProfile(userId: string): Promise<UserGetProfileResponseDto>;
    updateRole(
        userId: string,
        data: UserUpdateRoleDto
    ): Promise<UserUpdateProfileResponseDto>;
    updateOrganizer(
        userId: string,
        isOrganizer: boolean
    ): Promise<UserUpdateProfileResponseDto>;
    listUsers(query: UserListDto): Promise<UserListResponseDto>;
}
