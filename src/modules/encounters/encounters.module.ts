import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncountersRepository } from './encounters.repository';

@Module({
  imports: [PatientsModule],
  controllers: [EncountersController],
  providers: [EncountersService, EncountersRepository],
  exports: [EncountersRepository],
})
export class EncountersModule {}
