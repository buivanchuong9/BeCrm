import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const ROLE_VALUES = [
  'super_administrator',
  'patient',
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'imaging_technician',
  'pharmacist',
  'care_coordinator',
  'customer_care_employee',
  'medical_administrator',
  'system_administrator',
  'clinical_process_designer',
] as const;

export class WorkflowStepDefinitionDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  executorType?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  taskType!: string;

  @ApiProperty({ enum: ROLE_VALUES })
  @IsIn(ROLE_VALUES)
  responsibleRole!: (typeof ROLE_VALUES)[number];

  @ApiProperty()
  @IsString()
  department!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsBoolean()
  mandatory!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conditionalRule?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  estimatedDurationMinutes!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  maxWaitingMinutes!: number;

  @ApiProperty({ enum: ROLE_VALUES, isArray: true })
  @IsArray()
  @IsIn(ROLE_VALUES, { each: true })
  skipPermission!: (typeof ROLE_VALUES)[number][];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reworkRule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  escalationRule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notificationRule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requiredOutput?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  prerequisiteStepCodes!: string[];
}

export class ReplaceStepsRequest {
  @ApiProperty({ type: [WorkflowStepDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDefinitionDto)
  steps!: WorkflowStepDefinitionDto[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  rowVersion!: number;
}
