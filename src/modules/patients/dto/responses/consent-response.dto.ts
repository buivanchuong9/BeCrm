import { ApiProperty } from '@nestjs/swagger';

export class ConsentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  patientId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  policyVersion!: string;

  @ApiProperty()
  granted!: boolean;

  @ApiProperty({ format: 'date-time', nullable: true })
  grantedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  withdrawnAt!: string | null;

  @ApiProperty()
  version!: number;
}
