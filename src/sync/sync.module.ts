import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { DatabaseModule } from '../database/database.module';
import { SyncPrismaService } from './sync-prisma.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SyncController],
  providers: [SyncService, SyncPrismaService],
  exports: [SyncService],
})
export class SyncModule {}
