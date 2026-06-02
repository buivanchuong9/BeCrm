import { IsString, IsOptional, IsInt, Min, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListEmployeeDto {
  @ApiPropertyOptional({ description: 'Search by name', example: 'Nguyen' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID (BeautyBranch)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter active employees' })
  @IsOptional()
  isActive?: string; // "true" | "false" — from query string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class UpsertEmployeeDto {
  @ApiPropertyOptional({ description: 'Employee ID — omit to create, provide to update' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'nva@clinic.vn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Bác sĩ nội khoa' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  /** SIP phone extension for WebRTC calls */
  @ApiPropertyOptional({ example: '470' })
  @IsOptional()
  @IsString()
  sipExtension?: string;

  /** Default redirect after login (e.g. "/customer") */
  @ApiPropertyOptional({ example: '/customer' })
  @IsOptional()
  @IsString()
  defaultRedirect?: string;
}

export class InsertBatchRoleDto {
  @ApiProperty({ type: [String], description: 'Array of role IDs to assign' })
  roleIds!: string[];
}
