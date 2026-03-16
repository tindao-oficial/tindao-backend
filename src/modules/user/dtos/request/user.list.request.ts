import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class UserListDto {
    @ApiProperty({ example: 20, required: false })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    @Type(() => Number)
    limit?: number;

    @ApiProperty({ example: 'cursor-uuid', required: false })
    @IsString()
    @IsOptional()
    cursor?: string;

    @ApiProperty({ enum: Role, required: false })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @ApiProperty({
        example: true,
        required: false,
        description: 'Filtrar por status de organizador',
    })
    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    isOrganizer?: boolean;

    @ApiProperty({
        example: 'joão',
        required: false,
        description: 'Busca por nome, username ou email',
    })
    @IsString()
    @IsOptional()
    search?: string;
}
