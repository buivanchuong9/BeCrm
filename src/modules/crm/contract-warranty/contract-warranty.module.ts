import { Module } from '@nestjs/common';
import { ContractWarrantyController } from './contract-warranty.controller';
import { ContractWarrantyService } from './contract-warranty.service';

@Module({ controllers: [ContractWarrantyController], providers: [ContractWarrantyService], exports: [ContractWarrantyService] })
export class ContractWarrantyModule {}
