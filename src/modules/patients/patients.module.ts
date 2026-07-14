import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { ConsentsController } from './consents.controller';
import { PatientsService } from './patients.service';
import { ConsentsService } from './consents.service';
import { PatientsRepository } from './patients.repository';
import { ConsentsRepository } from './consents.repository';

@Module({
  controllers: [PatientsController, ConsentsController],
  providers: [PatientsService, ConsentsService, PatientsRepository, ConsentsRepository],
  exports: [PatientsRepository],
})
export class PatientsModule {}
