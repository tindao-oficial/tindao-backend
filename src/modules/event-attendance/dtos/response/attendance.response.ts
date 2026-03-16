import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums, EventAttendance } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class AttendeeUserResponseDto {
    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    id: string;

    @ApiProperty({
        example: faker.person.firstName(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    firstName: string | null;

    @ApiProperty({
        example: faker.person.lastName(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    lastName: string | null;

    @ApiProperty({
        example: 'profile-photos/uuid.jpg',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    profilePhoto: string | null;

    @ApiProperty({
        example: faker.image.avatar(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    avatar: string | null;
}

export class EventAttendanceResponseDto implements Partial<EventAttendance> {
    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    id: string;

    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    eventId: string;

    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    userId: string;

    @ApiProperty({
        enum: $Enums.EventAttendanceStatus,
        example: $Enums.EventAttendanceStatus.GOING,
    })
    @Expose()
    @IsEnum($Enums.EventAttendanceStatus)
    status: $Enums.EventAttendanceStatus;

    @ApiProperty({
        enum: $Enums.EventAttendanceSource,
        example: $Enums.EventAttendanceSource.MANUAL,
    })
    @Expose()
    @IsEnum($Enums.EventAttendanceSource)
    source: $Enums.EventAttendanceSource;

    @ApiProperty({ example: faker.date.past().toISOString() })
    @Expose()
    @IsDate()
    createdAt: Date;

    @ApiProperty({ example: faker.date.recent().toISOString() })
    @Expose()
    @IsDate()
    updatedAt: Date;
}

export class AttendeeListItemResponseDto extends EventAttendanceResponseDto {
    @ApiProperty({ type: AttendeeUserResponseDto })
    @Expose()
    user: AttendeeUserResponseDto;
}

export class AttendeeListResponseDto {
    @ApiProperty({ type: [AttendeeListItemResponseDto] })
    @Expose()
    @Type(() => AttendeeListItemResponseDto)
    items: AttendeeListItemResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}

export class MyAttendanceStatusResponseDto {
    @ApiProperty({ example: true })
    @Expose()
    @IsBoolean()
    exists: boolean;

    @ApiProperty({
        enum: $Enums.EventAttendanceStatus,
        example: $Enums.EventAttendanceStatus.GOING,
        nullable: true,
        required: false,
    })
    @Expose()
    @IsEnum($Enums.EventAttendanceStatus)
    @IsOptional()
    status: $Enums.EventAttendanceStatus | null;

    @ApiProperty({
        enum: $Enums.EventAttendanceSource,
        example: $Enums.EventAttendanceSource.MANUAL,
        nullable: true,
        required: false,
    })
    @Expose()
    @IsEnum($Enums.EventAttendanceSource)
    @IsOptional()
    source: $Enums.EventAttendanceSource | null;
}

export class MyEventItemResponseDto {
    @ApiProperty({ type: EventAttendanceResponseDto })
    @Expose()
    @Type(() => EventAttendanceResponseDto)
    attendance: EventAttendanceResponseDto;

    @ApiProperty({ description: 'Event data' })
    @Expose()
    event: Record<string, any>;
}

export class MyEventsListResponseDto {
    @ApiProperty({ type: [MyEventItemResponseDto] })
    @Expose()
    @Type(() => MyEventItemResponseDto)
    items: MyEventItemResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}
