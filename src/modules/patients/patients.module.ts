import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { ConsentsController } from './consents.controller';
import { LifetimeMedicalRecordController } from './lifetime-medical-record.controller';
import { AllergiesController, AllergyKnowledgeAssessmentController } from './allergies.controller';
import { PatientsService } from './patients.service';
import { ConsentsService } from './consents.service';
import { LifetimeMedicalRecordService } from './lifetime-medical-record.service';
import { AllergiesService } from './allergies.service';
import { PatientsRepository } from './patients.repository';
import { ConsentsRepository } from './consents.repository';
import { LifetimeMedicalRecordRepository } from './lifetime-medical-record.repository';

@Module({
  controllers: [
    PatientsController,
    ConsentsController,
    LifetimeMedicalRecordController,
    AllergiesController,
    AllergyKnowledgeAssessmentController,
  ],
  providers: [
    PatientsService,
    ConsentsService,
    LifetimeMedicalRecordService,
    AllergiesService,
    PatientsRepository,
    ConsentsRepository,
    LifetimeMedicalRecordRepository,
  ],
  exports: [PatientsRepository],
})
export class PatientsModule {}
