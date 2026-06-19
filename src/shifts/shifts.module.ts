import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ShiftsController, SchedulesController],
  providers: [ShiftsService, SchedulesService],
  exports: [ShiftsService, SchedulesService],
})
export class ShiftsModule {}
