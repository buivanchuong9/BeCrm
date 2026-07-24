import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { PatientsModule } from '../patients/patients.module';
import { EncountersModule } from '../encounters/encounters.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ActivitiesController,
  CarePlansController,
  FollowUpActivityConfirmationsController,
  FollowUpActivityTransitionsController,
  PatientCarePlanController,
} from './presentation/controllers/care-plans.controller';
import { CarePlansRepository } from './infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from './application/care-plan-access.service';
import { GetOrCreateCarePlanUseCase } from './application/use-cases/get-or-create-care-plan.use-case';
import { ListFollowUpActivitiesUseCase } from './application/use-cases/list-follow-up-activities.use-case';
import { CreateFollowUpActivityUseCase } from './application/use-cases/create-follow-up-activity.use-case';
import { AdvanceFollowUpActivityUseCase } from './application/use-cases/advance-follow-up-activity.use-case';
import { ConfirmFollowUpActivityUseCase } from './application/use-cases/confirm-follow-up-activity.use-case';
import { TransitionFollowUpActivityUseCase } from './application/use-cases/transition-follow-up-activity.use-case';
import { RunCarePlanAutomationUseCase } from './application/use-cases/run-care-plan-automation.use-case';

@Module({
  imports: [AuditModule, PatientsModule, EncountersModule, NotificationsModule],
  controllers: [
    PatientCarePlanController,
    CarePlansController,
    ActivitiesController,
    FollowUpActivityConfirmationsController,
    FollowUpActivityTransitionsController,
  ],
  providers: [
    CarePlansRepository,
    CarePlanAccessService,
    GetOrCreateCarePlanUseCase,
    ListFollowUpActivitiesUseCase,
    CreateFollowUpActivityUseCase,
    AdvanceFollowUpActivityUseCase,
    ConfirmFollowUpActivityUseCase,
    TransitionFollowUpActivityUseCase,
    RunCarePlanAutomationUseCase,
  ],
})
export class CarePlansModule {}
