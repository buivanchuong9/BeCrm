import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import { IdentityModule } from '../identity/identity.module';
import {
  MedicalRecordsController,
  RecordActionsController,
  DocumentsController,
  MedicalRecordBreakGlassController,
  MedicationOrdersController,
} from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordBreakGlassService } from './medical-record-break-glass.service';

@Module({
  imports: [EncountersModule, IdentityModule],
  controllers: [
    MedicalRecordsController,
    RecordActionsController,
    DocumentsController,
    MedicalRecordBreakGlassController,
    MedicationOrdersController,
  ],
  providers: [MedicalRecordsService, MedicalRecordBreakGlassService],
})
export class MedicalRecordsModule {}
