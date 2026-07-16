import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const TYPE_VALUES = ['standard', 'emergency', 'follow_up', 'remote'] as const;
// docs/api.md ENC-5: origin:'appointment' is never accepted here — that path
// is exclusively AppointmentsService.book's side effect.
const ORIGIN_VALUES = ['walk_in', 'follow_up_request'] as const;

export class CreateEncounterRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: TYPE_VALUES })
  @IsIn(TYPE_VALUES)
  type!: (typeof TYPE_VALUES)[number];

  @ApiProperty({ enum: ORIGIN_VALUES })
  @IsIn(ORIGIN_VALUES)
  origin!: (typeof ORIGIN_VALUES)[number];

  @ApiProperty()
  @IsString()
  department!: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentEncounterId?: string;
}
