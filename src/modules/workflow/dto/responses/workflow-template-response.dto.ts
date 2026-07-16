import { ApiProperty } from '@nestjs/swagger';
import { WorkflowStepDefinitionDto } from '../workflow-step-definition.dto';

export class WorkflowTemplateResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() specialty!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) latestPublishedVersionId!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

const TEMPLATE_STATUS_VALUES = [
  'draft',
  'in_review',
  'published',
  'deprecated',
  'archived',
] as const;

export class WorkflowTemplateVersionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) templateId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiProperty({ enum: TEMPLATE_STATUS_VALUES }) status!: (typeof TEMPLATE_STATUS_VALUES)[number];
  @ApiProperty({ type: [WorkflowStepDefinitionDto] }) steps!: WorkflowStepDefinitionDto[];
  @ApiProperty({ nullable: true }) nodePositions!: Record<string, { x: number; y: number }> | null;
  @ApiProperty() rowVersion!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true }) publishedAt!: string | null;
}
