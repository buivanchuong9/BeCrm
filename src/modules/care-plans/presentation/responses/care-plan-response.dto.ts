import { ApiProperty } from '@nestjs/swagger';

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
}
