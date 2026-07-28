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

@Module({
  imports: [EncountersModule],
  controllers: [
    EncounterAiAssessmentController,
    AiAssessmentDetailController,
    SkinAnalysisController,
  ],
  providers: [AiAssessmentService, AiAssessmentRepository, SkinAnalysisService],
  exports: [AiAssessmentRepository],
})
export class AiAssessmentModule {}
