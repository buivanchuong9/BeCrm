import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
} from '../../common/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';
import { canTransition } from '../encounters/encounter-state-machine';
import { ClinicalOrdersRepository } from './clinical-orders.repository';
import {
  toClinicalOrderResponse,
  toClinicalResultResponse,
} from './clinical-order-response.mapper';
import { CreateClinicalOrderRequest } from './dto/create-clinical-order.dto';
import { InvalidSampleRequest } from './dto/invalid-sample.dto';
import { SubmitResultRequest } from './dto/submit-result.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ClinicalOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ClinicalOrdersRepository,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
  ) {}

  private async loadEncounter(principal: AuthenticatedPrincipal, encounterId: string) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    return encounter;
  }

  /** docs/api.md section 26: technician actions require holding the order's
   * `assignedRole` in the encounter's organization — department-string
   * matching is out of scope for Phase 2 (Encounter.department is free text,
   * not linked to the Department reference table yet). */
  private assertAssignedRole(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    role: UserRole,
  ) {
    const isSuperAdmin = principal.memberships.some((m) => m.role === 'super_administrator');
    if (isSuperAdmin) return;
    const has = principal.memberships.some(
      (m) => m.organizationId === organizationId && m.role === role,
    );
    if (!has) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', `This action requires the "${role}" role.`);
    }
  }

  async create(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: CreateClinicalOrderRequest,
    context: RequestContext,
  ) {
    if (!principal.memberships.some((m) => m.role === 'doctor')) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', 'Only a doctor may create a clinical order.');
    }
    const encounter = await this.loadEncounter(principal, encounterId);
    const shouldTransition = canTransition(encounter.status, 'awaiting_results');

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create(tx, {
        encounterId,
        type: dto.type,
        orderedByDoctorId: principal.userId,
        justification: dto.justification,
        assignedRole: dto.assignedRole,
      });
      if (shouldTransition) {
        await tx.medicalEncounter.update({
          where: { id: encounterId },
          data: { status: 'awaiting_results', version: { increment: 1 } },
        });
      }
      await this.encounters.addEvent(tx, encounterId, `Chờ kết quả: ${dto.type}`, 'info');
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'clinical_order.created',
          resourceType: 'clinical_order',
          resourceId: created.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toClinicalOrderResponse(order) };
  }

  async listForEncounter(principal: AuthenticatedPrincipal, encounterId: string) {
    await this.loadEncounter(principal, encounterId);
    const rows = await this.repo.listForEncounter(encounterId);
    return { data: rows.map(toClinicalOrderResponse) };
  }

  private async loadOrderAndEncounter(principal: AuthenticatedPrincipal, orderId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) {
      throw new NotFoundAppError('Clinical order not found.');
    }
    const encounter = await this.loadEncounter(principal, order.encounterId);
    this.assertAssignedRole(principal, encounter.organizationId, order.assignedRole);
    return { order, encounter };
  }

  async markInvalidSample(
    principal: AuthenticatedPrincipal,
    orderId: string,
    dto: InvalidSampleRequest,
    context: RequestContext,
  ) {
    const { order, encounter } = await this.loadOrderAndEncounter(principal, orderId);
    if (order.status !== 'requested' && order.status !== 'in_progress') {
      throw new ConflictAppError(
        'CLINICAL_ORDER_INVALID_TRANSITION',
        'This order cannot be marked invalid now.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.update(tx, orderId, dto.version, {
        status: 'invalid_sample',
        invalidSampleReason: dto.reason,
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The order was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'clinical_order.invalid_sample',
          resourceType: 'clinical_order',
          resourceId: orderId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          reason: dto.reason,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.clinicalOrder.findUniqueOrThrow({ where: { id: orderId } });
    });

    return { data: toClinicalOrderResponse(updated) };
  }

  async submitResult(
    principal: AuthenticatedPrincipal,
    orderId: string,
    dto: SubmitResultRequest,
    context: RequestContext,
  ) {
    const { order, encounter } = await this.loadOrderAndEncounter(principal, orderId);
    if (order.status !== 'requested' && order.status !== 'in_progress') {
      throw new ConflictAppError(
        'CLINICAL_ORDER_INVALID_TRANSITION',
        'This order cannot receive a result now.',
      );
    }
    const newStatus = dto.abnormal ? 'result_ready' : 'completed';

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await this.repo.update(tx, orderId, dto.version, { status: newStatus });
      if (updateResult.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The order was modified by another request.',
        );
      }
      const createdResult = await this.repo.createResult(tx, {
        orderId,
        summary: dto.summary,
        abnormal: dto.abnormal,
        recordedBy: principal.userId,
      });
      await this.encounters.addEvent(
        tx,
        order.encounterId,
        `Kết quả cận lâm sàng đã có (${order.type})${dto.abnormal ? ' — bất thường' : ''}`,
        dto.abnormal ? 'warning' : 'success',
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'clinical_result.submitted',
          resourceType: 'clinical_result',
          resourceId: createdResult.id,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return createdResult;
    });

    return { data: toClinicalResultResponse(result) };
  }

  // Read-only: relationship scope only (docs/api.md section 26 "GET
  // .../result") — unlike the write actions, viewing a result is not
  // restricted to the order's assignedRole.
  async getResult(principal: AuthenticatedPrincipal, orderId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) {
      throw new NotFoundAppError('Clinical order not found.');
    }
    await this.loadEncounter(principal, order.encounterId);
    const result = await this.repo.findResultByOrderId(orderId);
    if (!result) {
      throw new NotFoundAppError('Result not found.');
    }
    return { data: toClinicalResultResponse(result) };
  }
}
