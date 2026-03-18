import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from 'src/common/database/database.module';

import { EventFavoriteController } from './controllers/event-favorite.controller';
import { EventFavoriteService } from './services/event-favorite.service';

@Module({
    imports: [DatabaseModule, ConfigModule],
    controllers: [EventFavoriteController],
    providers: [EventFavoriteService],
    exports: [EventFavoriteService],
})
export class EventFavoriteModule {}
