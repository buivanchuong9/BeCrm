import { ApiProperty } from '@nestjs/swagger';

export class SymptomIntakeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty() chiefComplaint!: string;
  @ApiProperty() severity!: number;
  @ApiProperty() durationDays!: number;
  @ApiProperty({ type: [String] }) symptoms!: string[];
  @ApiProperty({ type: [String] }) history!: string[];
  @ApiProperty({ type: [String] }) currentMedication!: string[];
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty({ format: 'date-time' }) submittedAt!: string;
}
