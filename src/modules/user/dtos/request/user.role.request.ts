import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UserUpdateRoleDto {
    @ApiProperty({
        enum: Role,
        example: Role.ADMIN,
        description: 'New role to assign to the user',
    })
    @IsEnum(Role)
    role: Role;
}
