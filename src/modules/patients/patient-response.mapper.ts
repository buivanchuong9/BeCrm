import { PatientWithDoctor } from './patients.repository';
import { PatientDetailResponseDto, PatientResponseDto } from './dto/responses/patient-response.dto';

function toLocalDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toPatientResponse(patient: PatientWithDoctor): PatientResponseDto {
  return {
    id: patient.id,
    code: patient.code,
    userId: patient.userId,
    organizationId: patient.organizationId,
    name: patient.name,
    dob: toLocalDate(patient.dob),
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    bloodType: patient.bloodType as PatientResponseDto['bloodType'],
    primaryDoctor: patient.primaryDoctor
      ? { id: patient.primaryDoctor.id, name: patient.primaryDoctor.displayName }
      : null,
    version: patient.version,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

export function toPatientDetailResponse(
  patient: PatientWithDoctor,
  extras: {
    activeAppointmentCount: number;
    activeEncounterId: string | null;
    activeCarePlanId: string | null;
    consentSummary: Array<{ type: string; granted: boolean; policyVersion: string }>;
  },
): PatientDetailResponseDto {
  return { ...toPatientResponse(patient), ...extras };
}
