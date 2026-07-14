import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrganizationsService } from './organizations.service';

class ListDepartmentsQuery {
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

/** Top-level reference-data resource per docs/api.md section 25:
 * `GET /api/v1/departments`. */
@ApiTags('departments')
@Controller({ path: 'departments', version: '1' })
export class DepartmentsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@Query() query: ListDepartmentsQuery) {
    return { data: await this.organizationsService.listDepartments(query) };
  }
}
