import { Module } from '@nestjs/common';
import { EformMappingController } from './eform-mapping.controller';
import { EformMappingService } from './eform-mapping.service';

@Module({
  controllers: [EformMappingController],
  providers: [EformMappingService],
  exports: [EformMappingService],
})
export class EformMappingModule {}
