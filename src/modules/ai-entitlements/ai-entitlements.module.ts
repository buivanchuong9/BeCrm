import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import {
  AiCommercialRequestsController,
  SelfAiEntitlementsController,
} from './ai-entitlements.controller';
import { AiEntitlementsService } from './ai-entitlements.service';

@Module({
  imports: [PatientsModule],
  controllers: [SelfAiEntitlementsController, AiCommercialRequestsController],
  providers: [AiEntitlementsService],
  exports: [AiEntitlementsService],
})
export class AiEntitlementsModule {}
