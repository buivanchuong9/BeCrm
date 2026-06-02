import { Module } from '@nestjs/common';
import { ApprovedObjectController } from './approved-object.controller';
import { ApprovedObjectService } from './approved-object.service';

@Module({
  controllers: [ApprovedObjectController],
  providers: [ApprovedObjectService],
  exports: [ApprovedObjectService],
})
export class ApprovedObjectModule {}
