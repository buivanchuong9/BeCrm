import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { NotFoundAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { toCarePlanResponse } from '../mappers/care-plan.mapper';
import { EncountersRepository } from '../../../encounters/encounters.repository';

/** `GET /patients/{patientId}/care-plan` — returns the patient's latest care
 * plan, auto-creating one against their most recently updated encounter if
 * none exists yet. Verbatim port of operations.service.ts's getCarePlan(). */
@Injectable()
export class GetOrCreateCarePlanUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly encounters: EncountersRepository,
  ) {}

  async execute(principal: AuthenticatedPrincipal, patientId: string) {
    await this.access.assertPatientVisible(principal, patientId);

    let plan = await this.carePlans.findLatestForPatient(patientId);
    if (!plan) {
      const encounter = await this.encounters.findMostRecentlyUpdatedForPatient(patientId);
      if (!encounter) {
        throw new NotFoundAppError('No encounter is available to create a care plan.');
      }
      plan = await this.carePlans.create(patientId, encounter.id);
    }
    return { data: toCarePlanResponse(plan) };
  }
}
