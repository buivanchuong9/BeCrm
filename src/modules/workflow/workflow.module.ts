import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import {
  EncounterWorkflowController,
  WorkflowInstancesController,
  WorkflowTasksController,
  WorkflowTemplatesController,
  WorkflowTemplateVersionsController,
} from './workflow.controller';
import { WorkflowTemplatesRepository } from './workflow-templates.repository';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowRuntimeRepository } from './workflow-runtime.repository';
import { WorkflowRuntimeService } from './workflow-runtime.service';

@Module({
  imports: [EncountersModule],
  controllers: [
    WorkflowTemplatesController,
    WorkflowTemplateVersionsController,
    EncounterWorkflowController,
    WorkflowInstancesController,
    WorkflowTasksController,
  ],
  providers: [
    WorkflowTemplatesRepository,
    WorkflowTemplatesService,
    WorkflowRuntimeRepository,
    WorkflowRuntimeService,
  ],
  exports: [WorkflowRuntimeService],
})
export class WorkflowModule {}
