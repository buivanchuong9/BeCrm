import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() event!: string;
  @ApiProperty({ format: 'uuid' }) recipientId!: string;
  @ApiProperty() recipientRole!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() status!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) relatedPatientId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) relatedEncounterId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) relatedWorkflowTaskId!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) deliveredAt!: string | null;
  @ApiProperty({ nullable: true }) failureReason!: string | null;
  @ApiProperty() retryCount!: number;
  @ApiProperty() read!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class UnreadNotificationCountResponseDto {
  @ApiProperty() count!: number;
}
