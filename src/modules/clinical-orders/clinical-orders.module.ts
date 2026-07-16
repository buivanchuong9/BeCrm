import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import {
  EncounterClinicalOrdersController,
  ClinicalOrdersController,
} from './clinical-orders.controller';
import { ClinicalOrdersService } from './clinical-orders.service';
import { ClinicalOrdersRepository } from './clinical-orders.repository';

@Module({
  imports: [EncountersModule],
  controllers: [EncounterClinicalOrdersController, ClinicalOrdersController],
  providers: [ClinicalOrdersService, ClinicalOrdersRepository],
  exports: [ClinicalOrdersRepository],
})
export class ClinicalOrdersModule {}
