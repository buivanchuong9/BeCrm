import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';

/** `GET /care-plans/{carePlanId}/activities` */
@Injectable()
export class ListFollowUpActivitiesUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
  ) {}

  async execute(principal: AuthenticatedPrincipal, carePlanId: string) {
    await this.access.resolveCarePlan(principal, carePlanId);
    const rows = await this.carePlans.listActivities(carePlanId);
    return { data: rows.map(toFollowUpActivityResponse) };
  }
}
