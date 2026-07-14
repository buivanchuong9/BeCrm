import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { ClinicLocationsController } from './clinic-locations.controller';
import { DepartmentsController } from './departments.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController, ClinicLocationsController, DepartmentsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
