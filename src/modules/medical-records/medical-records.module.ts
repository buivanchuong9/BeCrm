import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import {
  MedicalRecordsController,
  RecordActionsController,
  DocumentsController,
} from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [EncountersModule],
  controllers: [MedicalRecordsController, RecordActionsController, DocumentsController],
  providers: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
