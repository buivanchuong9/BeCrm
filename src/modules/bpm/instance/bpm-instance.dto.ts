import { IsString, IsOptional, IsObject, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartInstanceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  processDefinitionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class CompleteTaskDto {
  @ApiProperty()
  @IsObject()
  formData: Record<string, unknown>;
}

export class DelegateTaskDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
