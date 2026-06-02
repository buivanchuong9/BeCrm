import { Module } from '@nestjs/common';
import { BoughtController } from './bought.controller';
import { BoughtService } from './bought.service';

@Module({
  controllers: [BoughtController],
  providers: [BoughtService],
  exports: [BoughtService],
})
export class BoughtModule {}
