import { ApiProperty } from '@nestjs/swagger';

export class FollowUpActivityResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) carePlanId!: string;
  @ApiProperty() type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ format: 'date' }) dueDate!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) automationMode!: string | null;
  @ApiProperty({ nullable: true }) automationAction!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) lastAutomatedAt!: string | null;
  @ApiProperty() automationRunCount!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
