import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { EncountersModule } from '../encounters/encounters.module';
import {
  QueueTicketsController,
  QueueStationsController,
  ReceptionController,
  QueueContractController,
} from './queue-tickets.controller';
import { CheckInAliasController, CheckInController } from './check-in.controller';
import { KioskDevicesController } from './kiosk-devices.controller';
import { QueueTicketsService } from './queue-tickets.service';
import { CheckInService } from './check-in.service';
import { KioskDevicesService } from './kiosk-devices.service';
import { QueueTicketsRepository } from './queue-tickets.repository';
import { KioskDevicesRepository } from './kiosk-devices.repository';

@Module({
  imports: [AppointmentsModule, EncountersModule],
  controllers: [
    QueueTicketsController,
    QueueStationsController,
    ReceptionController,
    CheckInController,
    CheckInAliasController,
    QueueContractController,
    KioskDevicesController,
  ],
  providers: [
    QueueTicketsService,
    CheckInService,
    KioskDevicesService,
    QueueTicketsRepository,
    KioskDevicesRepository,
  ],
  exports: [QueueTicketsRepository],
})
export class QueueModule {}
