import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule],
  providers: [CronService],
})
export class CronModule {}
