import { Module } from '@nestjs/common';
import { WorkController, WorkBpmController } from './work.controller';
import { WorkService } from './work.service';

@Module({
  controllers: [WorkController, WorkBpmController],
  providers: [WorkService],
  exports: [WorkService],
})
export class WorkModule {}
