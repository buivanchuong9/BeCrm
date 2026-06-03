import { Module } from '@nestjs/common';
import { BpmTemplateController } from './template/bpm-template.controller';
import { BpmTemplateService } from './template/bpm-template.service';
import { BpmInstanceController } from './instance/bpm-instance.controller';
import { BpmInstanceService } from './instance/bpm-instance.service';
import { BpmEngineService } from './instance/bpm-engine.service';
import { BpmWorkOrderController, BpmUserTaskRuntimeController, BpmWorkOrderLowercaseController } from './work-order/bpm-work-order.controller';
import { BpmWorkOrderService } from './work-order/bpm-work-order.service';
import { BpmApprovalController } from './approval/bpm-approval.controller';
import { BpmApprovalService } from './approval/bpm-approval.service';
import { BusinessRuleController } from './business-rule/business-rule.controller';
import { BusinessRuleService } from './business-rule/business-rule.service';
import { BpmFormModule } from './form/bpm-form.module';
import { BpmParticipantModule } from './participant/bpm-participant.module';
import { EformMappingModule } from './eform-mapping/eform-mapping.module';
import { ApprovedObjectModule } from './approved-object/approved-object.module';
import { ApprovalAdminModule } from './approval-admin/approval-admin.module';
import { DecisionTableModule } from './decision-table/decision-table.module';
import { BpmNodeModule } from './generic-node/bpm-node.module';

@Module({
  imports: [
    BpmFormModule,
    BpmParticipantModule,
    EformMappingModule,
    ApprovedObjectModule,
    ApprovalAdminModule,
    DecisionTableModule,
    BpmNodeModule,
  ],
  controllers: [
    BpmTemplateController,
    BpmInstanceController,
    BpmWorkOrderController,
    BpmUserTaskRuntimeController,
    BpmWorkOrderLowercaseController,
    BpmApprovalController,
    BusinessRuleController,
  ],
  providers: [
    BpmTemplateService,
    BpmInstanceService,
    BpmEngineService,
    BpmWorkOrderService,
    BpmApprovalService,
    BusinessRuleService,
  ],
  exports: [BpmEngineService, BpmWorkOrderService],
})
export class BpmModule {}
