import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ROLE_VALUES } from './workflow-step-definition.dto';

export class CreateAdHocTaskRequest {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ROLE_VALUES })
  @IsIn(ROLE_VALUES)
  responsibleRole!: (typeof ROLE_VALUES)[number];

  @ApiProperty()
  @IsString()
  department!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  slaMinutes!: number;
}

export class UpdateAdHocTaskRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: ROLE_VALUES, required: false })
  @IsOptional()
  @IsIn(ROLE_VALUES)
  responsibleRole?: (typeof ROLE_VALUES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  slaMinutes?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}

export class CancelAdHocTaskRequest {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
