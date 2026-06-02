import { Module } from '@nestjs/common';
import { BpmParticipantController } from './bpm-participant.controller';
import { BpmParticipantService } from './bpm-participant.service';

@Module({
  controllers: [BpmParticipantController],
  providers: [BpmParticipantService],
  exports: [BpmParticipantService],
})
export class BpmParticipantModule {}
