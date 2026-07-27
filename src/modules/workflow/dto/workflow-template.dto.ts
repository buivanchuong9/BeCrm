import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

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

export class WorkflowTerminalEdgeRequest {
  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty()
  @IsString()
  target!: string;
}

export class WorkflowGraphPositionRequest {
  @ApiProperty()
  @IsNumber()
  x!: number;

  @ApiProperty()
  @IsNumber()
  y!: number;
}

export class WorkflowGraphLayoutRequest {
  @ApiProperty({
    description: 'Complete graph position snapshot. Reserved keys __START__ and __END__ are supported.',
    additionalProperties: { type: 'object' },
  })
  @IsObject()
  positions!: Record<string, WorkflowGraphPositionRequest>;

  @ApiProperty({ type: [WorkflowTerminalEdgeRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTerminalEdgeRequest)
  terminalEdges!: WorkflowTerminalEdgeRequest[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  rowVersion!: number;
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
