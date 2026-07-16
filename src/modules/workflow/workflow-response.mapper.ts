import {
  WorkflowInstance,
  WorkflowTask,
  WorkflowTemplate,
  WorkflowTemplateVersion,
} from '@prisma/client';
import { WorkflowStepDefinition } from './workflow-step-graph.util';
import {
  WorkflowTemplateResponseDto,
  WorkflowTemplateVersionResponseDto,
} from './dto/responses/workflow-template-response.dto';
import { WorkflowInstanceResponseDto } from './dto/responses/workflow-instance-response.dto';
import { WorkflowTaskResponseDto } from './dto/responses/workflow-task-response.dto';

export function toWorkflowTemplateResponse(
  template: WorkflowTemplate,
): WorkflowTemplateResponseDto {
  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    specialty: template.specialty,
    description: template.description,
    createdBy: template.createdBy,
    latestPublishedVersionId: template.latestPublishedVersionId,
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export function toWorkflowTemplateVersionResponse(
  version: WorkflowTemplateVersion,
): WorkflowTemplateVersionResponseDto {
  return {
    id: version.id,
    templateId: version.templateId,
    versionNumber: version.versionNumber,
    status: version.status,
    steps: version.steps as unknown as WorkflowStepDefinition[],
    nodePositions: version.nodePositions as unknown as Record<
      string,
      { x: number; y: number }
    > | null,
    rowVersion: version.rowVersion,
    createdAt: version.createdAt.toISOString(),
    publishedAt: version.publishedAt?.toISOString() ?? null,
  };
}

export function toWorkflowInstanceResponse(
  instance: WorkflowInstance,
): WorkflowInstanceResponseDto {
  return {
    id: instance.id,
    patientId: instance.patientId,
    encounterId: instance.encounterId,
    templateId: instance.templateId,
    templateVersionId: instance.templateVersionId,
    instanceCode: instance.instanceCode,
    identityVersion: instance.identityVersion,
    status: instance.status,
    activatedBy: instance.activatedBy,
    activatedAt: instance.activatedAt.toISOString(),
    completedAt: instance.completedAt?.toISOString() ?? null,
    suspendedReason: instance.suspendedReason,
    version: instance.version,
  };
}

export function toWorkflowTaskResponse(task: WorkflowTask): WorkflowTaskResponseDto {
  return {
    id: task.id,
    instanceId: task.instanceId,
    encounterId: task.encounterId,
    stepCode: task.stepCode,
    name: task.name,
    responsibleRole: task.responsibleRole,
    department: task.department,
    status: task.status,
    assigneeId: task.assigneeId,
    dependsOnStepCodes: task.dependsOnStepCodes,
    slaMinutes: task.slaMinutes,
    priority: task.priority,
    urgency: task.urgency,
    mandatory: task.mandatory,
    clinicalWarning: task.clinicalWarning,
    reworkCount: task.reworkCount,
    version: task.version,
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}
