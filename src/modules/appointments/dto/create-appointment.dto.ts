import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const MODE_VALUES = ['video', 'in_person'] as const;

export class CreateAppointmentRequest {
  @ApiProperty({ description: 'Tamper-resistant reference returned by the availability API.' })
  @IsString()
  @MinLength(40)
  slotId!: string;

  @ApiProperty({ enum: MODE_VALUES })
  @IsIn(MODE_VALUES)
  mode!: (typeof MODE_VALUES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  consultationType?: string;

  // docs/api.md section 21 APT-3: never accepted from a `patient` caller —
  // required only when the caller is `receptionist` (enforced in the service,
  // not here, since it depends on the authenticated role).
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  onBehalfOfPatientId?: string;
}
