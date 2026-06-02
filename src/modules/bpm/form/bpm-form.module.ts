import { Module } from '@nestjs/common';
import { BpmFormController, BpmFormAdminController } from './bpm-form.controller';
import { BpmFormService } from './bpm-form.service';

@Module({
  controllers: [BpmFormController, BpmFormAdminController],
  providers: [BpmFormService],
  exports: [BpmFormService],
})
export class BpmFormModule {}
