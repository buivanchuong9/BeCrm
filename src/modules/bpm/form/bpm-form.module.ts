import { Module } from '@nestjs/common';
import { BpmFormController, BpmFormAdminController } from './bpm-form.controller';
import { BpmFormService } from './bpm-form.service';
import { BpmGridDataController } from './bpm-grid-data.controller';
import { BpmGridDataService } from './bpm-grid-data.service';

@Module({
  controllers: [BpmFormController, BpmFormAdminController, BpmGridDataController],
  providers: [BpmFormService, BpmGridDataService],
  exports: [BpmFormService, BpmGridDataService],
})
export class BpmFormModule {}
