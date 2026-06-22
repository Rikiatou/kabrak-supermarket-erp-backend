import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
  imports: [LicensesModule],
  controllers: [AdminController],
})
export class AdminModule {}
