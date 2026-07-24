import { ApiProperty } from '@nestjs/swagger';
import { FollowUpActivityResponseDto } from './follow-up-activity-response.dto';

export class CarePlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class RunCarePlanAutomationResultDto {
  @ApiProperty() processed!: number;
  @ApiProperty() notifications!: number;
  @ApiProperty({ format: 'date-time' }) runAt!: string;
  @ApiProperty({ type: () => [FollowUpActivityResponseDto] })
  activities!: FollowUpActivityResponseDto[];
}
