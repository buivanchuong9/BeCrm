import { ApiProperty } from '@nestjs/swagger';

const INSTANCE_STATUS_VALUES = [
  'created',
  'active',
  'suspended',
  'completed',
  'cancelled',
] as const;

export class WorkflowInstanceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid' }) templateId!: string;
  @ApiProperty({ format: 'uuid' }) templateVersionId!: string;
  @ApiProperty() instanceCode!: string;
  @ApiProperty() identityVersion!: number;
  @ApiProperty({ enum: INSTANCE_STATUS_VALUES }) status!: (typeof INSTANCE_STATUS_VALUES)[number];
  @ApiProperty({ format: 'uuid' }) activatedBy!: string;
  @ApiProperty({ format: 'date-time' }) activatedAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true }) completedAt!: string | null;
  @ApiProperty({ nullable: true }) suspendedReason!: string | null;
  @ApiProperty() version!: number;
}

export class WorkflowIdentityVerificationResponseDto {
  @ApiProperty() valid!: boolean;
}
