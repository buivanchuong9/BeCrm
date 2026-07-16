import { Appointment, AppointmentCheckInToken } from '@prisma/client';
import {
  AppointmentResponseDto,
  CheckInTokenIssuedResponseDto,
  CheckInTokenResponseDto,
} from './dto/responses/appointment-response.dto';

export function toAppointmentResponse(appointment: Appointment): AppointmentResponseDto {
  return {
    id: appointment.id,
    organizationId: appointment.organizationId,
    clinicLocationId: appointment.clinicLocationId,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    department: appointment.department,
    consultationType: appointment.consultationType,
    mode: appointment.mode,
    status: appointment.status,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    // MedicalEncounter.appointmentId carries the FK (docs/api.md section 10 —
    // one appointment maps to at most one encounter); the service resolves it
    // via a lookup and passes it in explicitly since Appointment itself has no
    // encounter_id column.
    encounterId: null,
    cancelReason: appointment.cancelReason,
    version: appointment.version,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

export function toCheckInTokenResponse(token: AppointmentCheckInToken): CheckInTokenResponseDto {
  return {
    id: token.id,
    appointmentId: token.appointmentId,
    status: token.status,
    issuedAt: token.issuedAt.toISOString(),
    validFrom: token.validFrom.toISOString(),
    expiresAt: token.expiresAt.toISOString(),
    version: token.version,
  };
}

export function toCheckInTokenIssuedResponse(
  token: AppointmentCheckInToken,
  rawToken: string,
): CheckInTokenIssuedResponseDto {
  return { ...toCheckInTokenResponse(token), token: rawToken };
}
