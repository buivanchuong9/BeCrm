import { CrmCarePlan } from '@prisma/client';
import { CarePlanResponseDto } from '../../presentation/responses/care-plan-response.dto';

export function toCarePlanResponse(carePlan: CrmCarePlan): CarePlanResponseDto {
  return {
    id: carePlan.id,
    patientId: carePlan.patientId,
    encounterId: carePlan.encounterId,
    status: carePlan.status,
    createdAt: carePlan.createdAt.toISOString(),
    updatedAt: carePlan.updatedAt.toISOString(),
  };
}
