import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { CommonModule } from 'src/common/common.module';
import { EventAttendanceModule } from 'src/modules/event-attendance/event-attendance.module';
import { EventModule } from 'src/modules/event/event.module';
import { UserModule } from 'src/modules/user/user.module';
import { WorkerModule } from 'src/workers/worker.module';
import { MCPCommonModule } from 'src/common/mcp/mcp.module';

import { HealthController } from './controllers/health.controller';
@Module({
    imports: [
        // Shared Common Services
        CommonModule,

        // MCP Integration
        MCPCommonModule,

        // Background Processing
        WorkerModule,

        // Health Check
        TerminusModule,

        // Feature Modules
        UserModule,
        EventModule,
        EventAttendanceModule,
    ],
    controllers: [HealthController],
})
export class AppModule {}
