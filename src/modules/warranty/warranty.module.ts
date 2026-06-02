import { Module } from '@nestjs/common';
import { WarrantyController } from './warranty.controller';
import { WarrantyService } from './warranty.service';
import { WarrantyProcedureController } from './procedure/warranty-procedure.controller';
import { WarrantyProcedureService } from './procedure/warranty-procedure.service';

@Module({
  controllers: [WarrantyController, WarrantyProcedureController],
  providers: [WarrantyService, WarrantyProcedureService],
  exports: [WarrantyService],
})
export class WarrantyModule {}
