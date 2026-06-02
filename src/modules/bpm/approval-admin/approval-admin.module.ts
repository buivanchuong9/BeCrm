import { Module } from '@nestjs/common';
import { ApprovalAdminController } from './approval-admin.controller';
import { ApprovalAdminService } from './approval-admin.service';

@Module({
  controllers: [ApprovalAdminController],
  providers: [ApprovalAdminService],
  exports: [ApprovalAdminService],
})
export class ApprovalAdminModule {}
