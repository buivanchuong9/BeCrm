import { ApiProperty } from '@nestjs/swagger';
import { ReferenceResponseDto } from '../../../../core/http/reference-response.dto';

const GENDER_VALUES = ['male', 'female', 'other', 'unknown'] as const;
const BLOOD_TYPE_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;

export class PatientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'date' })
  dob!: string;

  @ApiProperty({ enum: GENDER_VALUES })
  gender!: (typeof GENDER_VALUES)[number];

  @ApiProperty()
  phone!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ enum: BLOOD_TYPE_VALUES })
  bloodType!: (typeof BLOOD_TYPE_VALUES)[number];

  @ApiProperty({ type: ReferenceResponseDto, nullable: true })
  primaryDoctor!: ReferenceResponseDto | null;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

class ConsentSummaryItemDto {
  @ApiProperty() type!: string;
  @ApiProperty() granted!: boolean;
  @ApiProperty() policyVersion!: string;
}

export class PatientDetailResponseDto extends PatientResponseDto {
  @ApiProperty()
  activeAppointmentCount!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  activeEncounterId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  activeCarePlanId!: string | null;

  @ApiProperty({ type: [ConsentSummaryItemDto] })
  consentSummary!: ConsentSummaryItemDto[];
}
