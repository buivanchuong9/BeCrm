import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateWorkflowTemplateRequest {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  specialty!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

export class UpdateWorkflowTemplateRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}

export class NodePositionsRequest {
  @ApiProperty({ description: 'Merged into existing positions, not replaced wholesale.' })
  @IsObject()
  positions!: Record<string, { x: number; y: number }>;
}

export class ActivateWorkflowRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateId!: string;

  @ApiProperty({ description: "Encounter's current version, for the optimistic-lock guard." })
  @IsInt()
  @Min(1)
  encounterVersion!: number;
}

export class VersionOnlyRequest {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}

export class ReasonedVersionRequest {
  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}

export class ReassignTaskRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assigneeId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
