import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import { AiAssessmentModule } from '../ai-assessment/ai-assessment.module';
import {
  EncounterDoctorDecisionController,
  DiagnosesController,
} from './doctor-decision.controller';
import { DoctorDecisionService } from './doctor-decision.service';
import { DoctorDecisionRepository } from './doctor-decision.repository';

@Module({
  imports: [EncountersModule, AiAssessmentModule],
  controllers: [EncounterDoctorDecisionController, DiagnosesController],
  providers: [DoctorDecisionService, DoctorDecisionRepository],
  exports: [DoctorDecisionRepository],
})
export class DoctorDecisionModule {}
