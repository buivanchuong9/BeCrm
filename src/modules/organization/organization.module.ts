import { Module } from '@nestjs/common';
import { DepartmentController } from './department/department.controller';
import { DepartmentService } from './department/department.service';
import { EmployeeController } from './employee/employee.controller';
import { EmployeeService } from './employee/employee.service';
import { CustomerController } from './customer/customer.controller';
import { CustomerService } from './customer/customer.service';
import { WorkModule } from './work/work.module';
import { GroupModule } from './group/group.module';
import { BoughtModule } from './bought/bought.module';
import { CatalogModule } from './catalog/catalog.module';
import { CatalogExtModule } from './catalog-ext/catalog-ext.module';
import { IntegrationModule } from './integration/integration.module';

@Module({
  imports: [WorkModule, GroupModule, BoughtModule, CatalogModule, CatalogExtModule, IntegrationModule],
  controllers: [DepartmentController, EmployeeController, CustomerController],
  providers: [DepartmentService, EmployeeService, CustomerService],
  exports: [EmployeeService, CustomerService],
})
export class OrganizationModule {}
