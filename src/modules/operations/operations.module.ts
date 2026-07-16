import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { EncountersModule } from '../encounters/encounters.module';
import { PatientsModule } from '../patients/patients.module';
import {
  ActivitiesController,
  AlertsController,
  AuditController,
  CarePlansController,
  DashboardController,
  EncounterRequestsController,
  IntegrationsController,
  MedicationRemindersController,
  NotificationsController,
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
    CarePlansController,
    ActivitiesController,
    AlertsController,
    EncounterRequestsController,
    NotificationsController,
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
