import { Module } from '@nestjs/common';
import { WorkController, WorkBpmController, WorkSaleController } from './work.controller';
import { WorkService } from './work.service';

@Module({
  controllers: [WorkController, WorkBpmController, WorkSaleController],
  providers: [WorkService],
  exports: [WorkService],
})
export class WorkModule {}
