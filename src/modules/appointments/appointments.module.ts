import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { EncountersModule } from '../encounters/encounters.module';
import { PractitionersModule } from '../practitioners/practitioners.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { CheckInTokensRepository } from './check-in-tokens.repository';

@Module({
  imports: [PatientsModule, EncountersModule, PractitionersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository, CheckInTokensRepository],
  exports: [AppointmentsRepository, CheckInTokensRepository],
})
export class AppointmentsModule {}
