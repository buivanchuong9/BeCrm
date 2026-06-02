import { IsString, IsOptional, IsObject, IsArray, IsEnum, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NodePositionDto {
  @ApiProperty()
  @IsNotEmpty()
  x: number;

  @ApiProperty()
  @IsNotEmpty()
  y: number;
}

export class ReactFlowNodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => NodePositionDto)
  position: NodePositionDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: object;
}

export class ReactFlowEdgeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  target: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}

export class ReactFlowDataDto {
  @ApiProperty({ type: [ReactFlowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReactFlowNodeDto)
  nodes: ReactFlowNodeDto[];

  @ApiProperty({ type: [ReactFlowEdgeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReactFlowEdgeDto)
  edges: ReactFlowEdgeDto[];
}

export enum ProcessStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  INACTIVE = 'INACTIVE',
}

export class CreateProcessTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  xmlData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReactFlowDataDto)
  reactFlowData?: ReactFlowDataDto;

  @ApiPropertyOptional({ enum: ProcessStatus, default: ProcessStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProcessStatus)
  status?: ProcessStatus;
}

export class UpdateProcessTemplateDto extends CreateProcessTemplateDto {}
