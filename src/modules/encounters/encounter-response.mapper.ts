import { MedicalEncounter } from '@prisma/client';
import {
  EncounterResponseDto,
  EncounterEventResponseDto,
} from './dto/responses/encounter-response.dto';

export function toEncounterResponse(encounter: MedicalEncounter): EncounterResponseDto {
  return {
    id: encounter.id,
    patientId: encounter.patientId,
    parentEncounterId: encounter.parentEncounterId,
    appointmentId: encounter.appointmentId,
    type: encounter.type,
    origin: encounter.origin,
    status: encounter.status,
    department: encounter.department,
    room: encounter.room,
    queueNumber: encounter.queueNumber,
    peopleAheadInQueue: encounter.peopleAheadInQueue,
    estimatedWaitMinutes: encounter.estimatedWaitMinutes,
    currentDoctorId: encounter.currentDoctorId,
    blockingCondition: encounter.blockingCondition,
    version: encounter.version,
    createdAt: encounter.createdAt.toISOString(),
    updatedAt: encounter.updatedAt.toISOString(),
  };
}

export function toEncounterEventResponse(event: {
  id: string;
  at: Date;
  label: string;
  kind: string;
}): EncounterEventResponseDto {
  return {
    id: event.id,
    at: event.at.toISOString(),
    label: event.label,
    kind: event.kind as EncounterEventResponseDto['kind'],
  };
}
