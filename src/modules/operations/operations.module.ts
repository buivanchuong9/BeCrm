import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { EncountersModule } from '../encounters/encounters.module';
import { PatientsModule } from '../patients/patients.module';
import {
  AlertsController,
  AuditController,
  DashboardController,
  EncounterRequestsController,
  IntegrationsController,
  MedicationRemindersController,
  PatientOperationsController,
  PrescriptionOperationsController,
  SupportController,
  UploadsController,
  UserOperationsController,
} from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [AuditModule, PatientsModule, EncountersModule],
  controllers: [
    PatientOperationsController,
    PrescriptionOperationsController,
    AlertsController,
    EncounterRequestsController,
    AuditController,
    IntegrationsController,
    DashboardController,
    UploadsController,
    SupportController,
    MedicationRemindersController,
    UserOperationsController,
  ],
  providers: [OperationsService],
})
export class OperationsModule {}
