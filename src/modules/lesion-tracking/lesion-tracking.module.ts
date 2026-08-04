import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { OwnerGovernanceModule } from '../owner-governance/owner-governance.module';
import { AiAssessmentModule } from '../ai-assessment/ai-assessment.module';
import { ComparisonAnalysisService } from './comparison-analysis.service';
import {
  LesionComparisonsController,
  LesionObservationsController,
  LesionsController,
  PatientLesionsController,
} from './lesion-tracking.controller';
import { LesionTrackingRepository } from './lesion-tracking.repository';
import { LesionTrackingService } from './lesion-tracking.service';
import { UnavailableImageAnalysisAdapter } from './analysis-adapters/unavailable-image-analysis.adapter';
import { DemoImageAnalysisAdapter } from './analysis-adapters/demo-image-analysis.adapter';
import { RealImageAnalysisAdapter } from './analysis-adapters/real-image-analysis.adapter';

@Module({
  imports: [PatientsModule, OwnerGovernanceModule, AiAssessmentModule],
  controllers: [
    PatientLesionsController,
    LesionsController,
    LesionObservationsController,
    LesionComparisonsController,
  ],
  providers: [
    LesionTrackingRepository,
    LesionTrackingService,
    ComparisonAnalysisService,
    UnavailableImageAnalysisAdapter,
    DemoImageAnalysisAdapter,
    RealImageAnalysisAdapter,
  ],
})
export class LesionTrackingModule {}
