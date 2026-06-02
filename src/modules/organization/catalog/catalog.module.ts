import { Module } from '@nestjs/common';
import { CatalogController, CatalogPublicController, BpmCommonController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController, CatalogPublicController, BpmCommonController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
