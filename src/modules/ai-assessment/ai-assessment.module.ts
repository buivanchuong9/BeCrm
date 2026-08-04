import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import {
  EncounterAiAssessmentController,
  AiAssessmentDetailController,
} from './ai-assessment.controller';
import { AiAssessmentService } from './ai-assessment.service';
import { AiAssessmentRepository } from './ai-assessment.repository';
import { SkinAnalysisController } from './skin-analysis.controller';
import { SkinAnalysisService } from './skin-analysis.service';
import { PatientsModule } from '../patients/patients.module';
import { SkinAnalysisCaseController } from './skin-analysis-case.controller';
import { SkinAnalysisCaseService } from './skin-analysis-case.service';
import { AiEntitlementsModule } from '../ai-entitlements/ai-entitlements.module';

@Module({
  imports: [EncountersModule, PatientsModule, AiEntitlementsModule],
  controllers: [
    EncounterAiAssessmentController,
    AiAssessmentDetailController,
    SkinAnalysisController,
    SkinAnalysisCaseController,
  ],
  providers: [
    AiAssessmentService,
    AiAssessmentRepository,
    SkinAnalysisService,
    SkinAnalysisCaseService,
  ],
  exports: [AiAssessmentRepository, SkinAnalysisCaseService],
})
export class AiAssessmentModule {}
