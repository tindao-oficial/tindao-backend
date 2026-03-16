import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UserUpdateOrganizerDto {
    @ApiProperty({
        example: true,
        description: 'Grant or revoke organizer privileges',
    })
    @IsBoolean()
    isOrganizer: boolean;
}
