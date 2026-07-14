import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrganizationsService } from './organizations.service';

class ListClinicLocationsQuery {
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

/** Top-level reference-data resource per docs/api.md section 25
 * ("Clinics, doctors and scheduling"): `GET /api/v1/clinic-locations`. */
@ApiTags('clinic-locations')
@Controller({ path: 'clinic-locations', version: '1' })
export class ClinicLocationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@Query() query: ListClinicLocationsQuery) {
    return { data: await this.organizationsService.listClinicLocations(query) };
  }
}
