import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { DatabaseModule } from '../database/database.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, CloudinaryModule],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}
