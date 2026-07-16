import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import {
  EncounterAiAssessmentController,
  AiAssessmentDetailController,
} from './ai-assessment.controller';
import { AiAssessmentService } from './ai-assessment.service';
import { AiAssessmentRepository } from './ai-assessment.repository';

@Module({
  imports: [EncountersModule],
  controllers: [EncounterAiAssessmentController, AiAssessmentDetailController],
  providers: [AiAssessmentService, AiAssessmentRepository],
  exports: [AiAssessmentRepository],
})
export class AiAssessmentModule {}
