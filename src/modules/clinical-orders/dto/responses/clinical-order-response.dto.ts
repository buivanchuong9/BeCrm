import { ApiProperty } from '@nestjs/swagger';

const TYPE_VALUES = ['laboratory', 'imaging', 'consultation'] as const;
const STATUS_VALUES = [
  'requested',
  'in_progress',
  'invalid_sample',
  'result_ready',
  'completed',
  'cancelled',
] as const;

export class ClinicalOrderResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ enum: TYPE_VALUES }) type!: (typeof TYPE_VALUES)[number];
  @ApiProperty({ format: 'uuid' }) orderedByDoctorId!: string;
  @ApiProperty() justification!: string;
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty() assignedRole!: string;
  @ApiProperty({ nullable: true }) invalidSampleReason!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ClinicalResultResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) orderId!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() abnormal!: boolean;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
  @ApiProperty({ format: 'uuid' }) recordedBy!: string;
}
