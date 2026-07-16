import { ClinicalOrder, ClinicalResult } from '@prisma/client';
import {
  ClinicalOrderResponseDto,
  ClinicalResultResponseDto,
} from './dto/responses/clinical-order-response.dto';

export function toClinicalOrderResponse(order: ClinicalOrder): ClinicalOrderResponseDto {
  return {
    id: order.id,
    encounterId: order.encounterId,
    type: order.type,
    orderedByDoctorId: order.orderedByDoctorId,
    justification: order.justification,
    status: order.status,
    assignedRole: order.assignedRole,
    invalidSampleReason: order.invalidSampleReason,
    version: order.version,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toClinicalResultResponse(result: ClinicalResult): ClinicalResultResponseDto {
  return {
    id: result.id,
    orderId: result.orderId,
    summary: result.summary,
    abnormal: result.abnormal,
    recordedAt: result.recordedAt.toISOString(),
    recordedBy: result.recordedBy,
  };
}
