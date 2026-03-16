import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from 'src/common/database/database.module';
import { EventAttendanceModule } from 'src/modules/event-attendance/event-attendance.module';

import { EventPublicController } from './controllers/event.public.controller';
import { EventUsersController } from './controllers/event.users.controller';
import { EventService } from './services/event.service';

@Module({
    imports: [DatabaseModule, ConfigModule, EventAttendanceModule],
    controllers: [EventPublicController, EventUsersController],
    providers: [EventService],
    exports: [EventService],
})
export class EventModule {}
