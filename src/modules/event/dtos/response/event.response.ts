import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums, Event } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class EventOrganizerResponseDto {
    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    id: string;

    @ApiProperty({ example: faker.internet.username() })
    @Expose()
    @IsString()
    userName: string;

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
        example: faker.image.avatar(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    avatar: string | null;
}

export class EventResponseDto implements Partial<Event> {
    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    id: string;

    @ApiProperty({ example: 'Balada do Mês' })
    @Expose()
    @IsString()
    title: string;

    @ApiProperty({ example: 'A maior festa universitária do semestre.' })
    @Expose()
    @IsString()
    description: string;

    @ApiProperty({ enum: $Enums.EventType, example: $Enums.EventType.MAIN })
    @Expose()
    @IsEnum($Enums.EventType)
    type: $Enums.EventType;

    @ApiProperty({
        enum: $Enums.EventCategory,
        example: $Enums.EventCategory.NIGHTLIFE,
    })
    @Expose()
    @IsEnum($Enums.EventCategory)
    category: $Enums.EventCategory;

    @ApiProperty({
        enum: $Enums.EventStatus,
        example: $Enums.EventStatus.DRAFT,
    })
    @Expose()
    @IsEnum($Enums.EventStatus)
    status: $Enums.EventStatus;

    @ApiProperty({
        example: 'event-covers/uuid.jpg',
        required: false,
        nullable: true,
    })
    @Expose()
    @IsString()
    @IsOptional()
    coverImage: string | null;

    @ApiProperty({ example: 'São Paulo' })
    @Expose()
    @IsString()
    city: string;

    @ApiProperty({ example: 'Clube X' })
    @Expose()
    @IsString()
    venueName: string;

    @ApiProperty({ example: 'Rua das Flores, 123' })
    @Expose()
    @IsString()
    address: string;

    @ApiProperty({ example: -23.5505, required: false, nullable: true })
    @Expose()
    @IsNumber()
    @IsOptional()
    latitude: number | null;

    @ApiProperty({ example: -46.6333, required: false, nullable: true })
    @Expose()
    @IsNumber()
    @IsOptional()
    longitude: number | null;

    @ApiProperty({ example: faker.date.future().toISOString() })
    @Expose()
    @IsDate()
    startAt: Date;

    @ApiProperty({ example: faker.date.future().toISOString() })
    @Expose()
    @IsDate()
    endAt: Date;

    @ApiProperty({ example: faker.string.uuid() })
    @Expose()
    @IsUUID()
    organizerId: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsUUID()
    @IsOptional()
    parentEventId: string | null;

    @ApiProperty({
        example: faker.string.uuid(),
        required: false,
        nullable: true,
    })
    @Expose()
    @IsUUID()
    @IsOptional()
    rootEventId: string | null;

    @ApiProperty({
        enum: $Enums.SubEventPermissionMode,
        example: $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
    })
    @Expose()
    @IsEnum($Enums.SubEventPermissionMode)
    prePartyPermissionMode: $Enums.SubEventPermissionMode;

    @ApiProperty({
        enum: $Enums.SubEventPermissionMode,
        example: $Enums.SubEventPermissionMode.ORGANIZER_ONLY,
    })
    @Expose()
    @IsEnum($Enums.SubEventPermissionMode)
    afterPartyPermissionMode: $Enums.SubEventPermissionMode;

    @ApiProperty({ example: false })
    @Expose()
    @IsBoolean()
    isPrivate: boolean;

    @ApiProperty({
        example: false,
        description: 'Evento oficial criado por um organizador verificado',
    })
    @Expose()
    @IsBoolean()
    isOfficial: boolean;

    @ApiProperty({ example: 'a1b2c3d4e5f6g7h8' })
    @Expose()
    @IsString()
    inviteCode: string;

    @ApiProperty({ example: 'http://localhost:3000/events/a1b2c3d4e5f6g7h8' })
    @Expose()
    @IsString()
    inviteUrl: string;

    @ApiProperty({ example: faker.date.past().toISOString() })
    @Expose()
    @IsDate()
    createdAt: Date;

    @ApiProperty({ example: faker.date.recent().toISOString() })
    @Expose()
    @IsDate()
    updatedAt: Date;

    @ApiProperty({
        enum: $Enums.SubEventApprovalStatus,
        example: $Enums.SubEventApprovalStatus.PENDING,
        required: false,
        nullable: true,
    })
    @Expose()
    @IsEnum($Enums.SubEventApprovalStatus)
    @IsOptional()
    approvalStatus: $Enums.SubEventApprovalStatus | null;
}

export class EventSubResponseDto extends EventResponseDto {
    @ApiProperty({ type: EventOrganizerResponseDto })
    @Expose()
    @Type(() => EventOrganizerResponseDto)
    organizer: EventOrganizerResponseDto;
}

export class EventDetailResponseDto extends EventResponseDto {
    @ApiProperty({ type: EventOrganizerResponseDto })
    @Expose()
    @Type(() => EventOrganizerResponseDto)
    organizer: EventOrganizerResponseDto;

    @ApiProperty({ type: [EventSubResponseDto] })
    @Expose()
    @Type(() => EventSubResponseDto)
    preParties: EventSubResponseDto[];

    @ApiProperty({ type: [EventSubResponseDto] })
    @Expose()
    @Type(() => EventSubResponseDto)
    afterParties: EventSubResponseDto[];

    @ApiProperty({
        example: 42,
        description: 'Number of users marked as INTERESTED',
    })
    @Expose()
    @IsNumber()
    interestedCount: number;

    @ApiProperty({
        example: 15,
        description:
            'Number of users actively participating (GOING + CHECKED_IN + ATTENDED)',
    })
    @Expose()
    @IsNumber()
    attendeesCount: number;
}

export class EventListResponseDto {
    @ApiProperty({ type: [EventResponseDto] })
    @Expose()
    @Type(() => EventResponseDto)
    items: EventResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}

export class EventCreateResponseDto extends EventResponseDto {}
export class EventUpdateResponseDto extends EventResponseDto {}
export class EventCancelResponseDto extends EventResponseDto {}
export class SubEventCreateResponseDto extends EventResponseDto {}
export class SubEventApprovalResponseDto extends EventResponseDto {}

export class SubEventPendingListResponseDto {
    @ApiProperty({ type: [SubEventApprovalResponseDto] })
    @Expose()
    @Type(() => SubEventApprovalResponseDto)
    items: SubEventApprovalResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}

export class EventInviteResponseDto {
    @ApiProperty({ example: 'a1b2c3d4e5f6g7h8' })
    @Expose()
    @IsString()
    inviteCode: string;

    @ApiProperty({ example: 'http://localhost:3000/events/a1b2c3d4e5f6g7h8' })
    @Expose()
    @IsString()
    inviteUrl: string;

    @ApiProperty({
        example: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        description: 'QR code como data URL base64 (image/png)',
    })
    @Expose()
    @IsString()
    qrCodeDataUrl: string;
}

export class OrganizedEventResponseDto extends EventResponseDto {
    @ApiProperty({
        example: 42,
        description: 'Number of users marked as INTERESTED',
    })
    @Expose()
    @IsNumber()
    interestedCount: number;

    @ApiProperty({
        example: 15,
        description:
            'Number of users actively participating (GOING + CHECKED_IN + ATTENDED)',
    })
    @Expose()
    @IsNumber()
    attendeesCount: number;
}

export class EventUserContextResponseDto {
    @ApiProperty({
        enum: $Enums.EventAttendanceStatus,
        example: $Enums.EventAttendanceStatus.GOING,
        nullable: true,
        required: false,
        description:
            'Current attendance status of the logged-in user for this event',
    })
    @Expose()
    @IsEnum($Enums.EventAttendanceStatus)
    @IsOptional()
    attendanceStatus: $Enums.EventAttendanceStatus | null;

    @ApiProperty({
        example: false,
        description: 'True if the current user is the event organizer',
    })
    @Expose()
    @IsBoolean()
    isOrganizer: boolean;

    @ApiProperty({
        example: true,
        description: 'User can create a pre-party under this event',
    })
    @Expose()
    @IsBoolean()
    canCreatePreParty: boolean;

    @ApiProperty({
        example: false,
        description: 'User can create an after-party under this event',
    })
    @Expose()
    @IsBoolean()
    canCreateAfterParty: boolean;

    @ApiProperty({
        example: false,
        description: 'User can edit or cancel this event',
    })
    @Expose()
    @IsBoolean()
    canManageEvent: boolean;

    @ApiProperty({
        example: false,
        description: 'User can approve or reject pending sub-events',
    })
    @Expose()
    @IsBoolean()
    canApproveSubEvents: boolean;
}

export class OrganizedEventListResponseDto {
    @ApiProperty({ type: [OrganizedEventResponseDto] })
    @Expose()
    @Type(() => OrganizedEventResponseDto)
    items: OrganizedEventResponseDto[];

    @ApiProperty({ example: 'cursor-uuid', required: false, nullable: true })
    @Expose()
    @IsString()
    @IsOptional()
    nextCursor: string | null;
}
