import { Injectable } from '@nestjs/common';
import { CrmCarePlan } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../../core/security/auth.types';
import { NotFoundAppError } from '../../../core/errors/app-error';
import { PatientsRepository } from '../../patients/patients.repository';
import { CarePlansRepository } from '../infrastructure/repositories/care-plans.repository';

/**
 * Shared resolve+authorize step used by every care-plan/activity use case —
 * ported verbatim from operations.service.ts's private `patient()`/`carePlan()`
 * helpers. A care plan is only visible if its patient is visible to the
 * caller (via PatientsRepository.findVisibleById's IDOR-safe scoping); the
 * 404 message deliberately distinguishes "Patient not found" from "Care plan
 * not found" exactly as the original did.
 */
@Injectable()
export class CarePlanAccessService {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly patients: PatientsRepository,
  ) {}

  async assertPatientVisible(principal: AuthenticatedPrincipal, patientId: string) {
    const patient = await this.patients.findVisibleById(principal, patientId);
    if (!patient) throw new NotFoundAppError('Patient not found.');
    return patient;
  }

  async resolveCarePlan(
    principal: AuthenticatedPrincipal,
    carePlanId: string,
  ): Promise<CrmCarePlan> {
    const carePlan = await this.carePlans.findById(carePlanId);
    if (!carePlan) throw new NotFoundAppError('Care plan not found.');
    await this.assertPatientVisible(principal, carePlan.patientId);
    return carePlan;
  }
}
