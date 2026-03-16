import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { EventAttendanceEventsController } from './controllers/event-attendance.events.controller';
import { EventAttendanceUsersController } from './controllers/event-attendance.users.controller';
import { EventAttendanceService } from './services/event-attendance.service';

@Module({
    imports: [DatabaseModule],
    controllers: [
        EventAttendanceEventsController,
        EventAttendanceUsersController,
    ],
    providers: [EventAttendanceService],
    exports: [EventAttendanceService],
})
export class EventAttendanceModule {}
