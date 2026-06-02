import { Module } from '@nestjs/common';
import { CatalogExtController, CallCenterController } from './catalog-ext.controller';
import { CatalogExtService } from './catalog-ext.service';

@Module({
  controllers: [CatalogExtController, CallCenterController],
  providers: [CatalogExtService],
  exports: [CatalogExtService],
})
export class CatalogExtModule {}
