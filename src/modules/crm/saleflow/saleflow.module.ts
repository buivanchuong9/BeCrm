import { Module } from '@nestjs/common';
import { SaleflowController } from './saleflow.controller';
import { SaleflowService } from './saleflow.service';

@Module({ controllers: [SaleflowController], providers: [SaleflowService], exports: [SaleflowService] })
export class SaleflowModule {}
