import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const TYPE_VALUES = ['laboratory', 'imaging', 'consultation'] as const;
const ASSIGNABLE_ROLES = ['lab_technician', 'imaging_technician', 'doctor', 'nurse'] as const;

export class CreateClinicalOrderRequest {
  @ApiProperty({ enum: TYPE_VALUES })
  @IsIn(TYPE_VALUES)
  type!: (typeof TYPE_VALUES)[number];

  @ApiProperty()
  @IsString()
  justification!: string;

  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  assignedRole!: (typeof ASSIGNABLE_ROLES)[number];
}
