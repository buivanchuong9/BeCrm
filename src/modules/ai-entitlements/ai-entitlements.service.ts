import { HttpStatus, Injectable } from '@nestjs/common';
import { AiAllowanceKind, Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { PrismaService } from '../../core/database/prisma.service';
import {
  AppError,
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { PatientsRepository } from '../patients/patients.repository';

const DEFAULT_PLAN_CODE = 'free';
const PURCHASE_MIN_CREDITS = 1;
const PURCHASE_MAX_CREDITS = 100;
const STALE_RESERVATION_MS = 15 * 60 * 1000;

interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AiEntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsRepository,
    private readonly audit: AuditService,
  ) {}

  async getSelfSummary(principal: AuthenticatedPrincipal) {
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) throw new NotFoundAppError('Patient not found.');
    return { data: await this.summary(patient.id) };
  }

  async summary(patientId: string) {
    const entitlement = await this.ensureEntitlement(patientId);
    const { start, end } = this.monthBounds();
    const [includedUsed, usageRows, plans, creditRequests, planRequests] = await Promise.all([
      this.prisma.aiUsageEvent.count({
        where: {
          patientId,
          status: 'completed',
          allowanceKind: 'included',
          occurredAt: { gte: start, lt: end },
        },
      }),
      this.prisma.aiUsageEvent.findMany({
        where: { patientId, status: 'completed', caseId: { not: null } },
        include: {
          case: {
            select: {
              bodyRegion: true,
              status: true,
              modelVersion: true,
              generatedAt: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.aiPlan.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.aiCreditPurchaseRequest.findMany({
        where: { patientId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiPlanChangeRequest.findMany({
        where: { patientId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const quota = entitlement.plan.monthlyIncludedCredits;
    const includedRemaining = quota === null ? null : Math.max(0, quota - includedUsed);
    const remainingCredits =
      includedRemaining === null ? null : includedRemaining + entitlement.extraCreditBalance;
    const usagePercent =
      quota === null || quota === 0 ? 0 : Math.min(100, Math.round((includedUsed / quota) * 100));

    return {
      plan: this.mapPlan(entitlement.plan),
      availablePlans: plans.map((plan) => this.mapPlan(plan)),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      includedQuota: quota,
      includedUsed,
      extraCreditBalance: entitlement.extraCreditBalance,
      remainingCredits,
      usagePercent,
      purchaseMinCredits: PURCHASE_MIN_CREDITS,
      purchaseMaxCredits: PURCHASE_MAX_CREDITS,
      purchaseUnitPriceVnd: entitlement.plan.extraCreditUnitPriceVnd,
      usageHistory: usageRows.flatMap((row) =>
        row.case && row.caseId && row.occurredAt
          ? [
              {
                id: row.id,
                caseId: row.caseId,
                occurredAt: row.occurredAt.toISOString(),
                bodyRegion: row.case.bodyRegion,
                resultStatus: row.case.status,
                modelVersion: row.case.modelVersion,
                allowanceKind: row.allowanceKind,
              },
            ]
          : [],
      ),
      pendingRequests: [
        ...creditRequests.map((request) => ({
          id: request.id,
          type: 'credit_purchase',
          status: request.status,
          credits: request.credits,
          totalPriceVnd: request.totalPriceVnd,
          createdAt: request.createdAt.toISOString(),
        })),
        ...planRequests.map((request) => ({
          id: request.id,
          type: 'plan_change',
          status: request.status,
          planCode: request.requestedPlanCode,
          totalPriceVnd: request.quotedPriceVnd,
          createdAt: request.createdAt.toISOString(),
        })),
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    };
  }

  async createCreditPurchase(
    principal: AuthenticatedPrincipal,
    credits: number,
    context: RequestContext,
  ) {
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) throw new NotFoundAppError('Patient not found.');
    if (credits < PURCHASE_MIN_CREDITS || credits > PURCHASE_MAX_CREDITS) {
      throw new ValidationAppError([
        {
          field: 'credits',
          code: 'VALIDATION_ERROR',
          message: `Credits must be between ${PURCHASE_MIN_CREDITS} and ${PURCHASE_MAX_CREDITS}.`,
        },
      ]);
    }
    const entitlement = await this.ensureEntitlement(patient.id);
    if (entitlement.plan.monthlyIncludedCredits === null) {
      throw new ConflictAppError(
        'AI_PLAN_UNLIMITED',
        'The current plan already includes unlimited AI analysis.',
      );
    }
    const unitPriceVnd = entitlement.plan.extraCreditUnitPriceVnd;
    const request = await this.prisma.aiCreditPurchaseRequest.create({
      data: {
        patientId: patient.id,
        requestedBy: principal.userId,
        credits,
        unitPriceVnd,
        totalPriceVnd: credits * unitPriceVnd,
      },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'ai.credit_purchase.requested',
      resourceType: 'ai_credit_purchase_request',
      resourceId: request.id,
      patientId: patient.id,
      organizationId: patient.organizationId,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      result: 'success',
      afterRedacted: { credits, unitPriceVnd, totalPriceVnd: request.totalPriceVnd },
    });
    return {
      data: {
        id: request.id,
        type: 'credit_purchase',
        status: request.status,
        credits: request.credits,
        totalPriceVnd: request.totalPriceVnd,
        createdAt: request.createdAt.toISOString(),
      },
    };
  }

  async createPlanChange(
    principal: AuthenticatedPrincipal,
    planCode: string,
    context: RequestContext,
  ) {
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) throw new NotFoundAppError('Patient not found.');
    const [entitlement, requestedPlan] = await Promise.all([
      this.ensureEntitlement(patient.id),
      this.prisma.aiPlan.findFirst({ where: { code: planCode, active: true } }),
    ]);
    if (!requestedPlan) throw new NotFoundAppError('AI plan not found.');
    if (requestedPlan.code === entitlement.planCode) {
      throw new ConflictAppError('AI_PLAN_ALREADY_ACTIVE', 'This AI plan is already active.');
    }
    const existing = await this.prisma.aiPlanChangeRequest.findFirst({
      where: { patientId: patient.id, status: 'pending' },
    });
    if (existing) {
      throw new ConflictAppError(
        'AI_PLAN_CHANGE_PENDING',
        'A plan change request is already pending.',
      );
    }
    const request = await this.prisma.aiPlanChangeRequest.create({
      data: {
        patientId: patient.id,
        requestedBy: principal.userId,
        requestedPlanCode: requestedPlan.code,
        quotedPriceVnd: requestedPlan.annualPriceVnd,
      },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'ai.plan_change.requested',
      resourceType: 'ai_plan_change_request',
      resourceId: request.id,
      patientId: patient.id,
      organizationId: patient.organizationId,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      result: 'success',
      afterRedacted: {
        fromPlanCode: entitlement.planCode,
        requestedPlanCode: requestedPlan.code,
        quotedPriceVnd: requestedPlan.annualPriceVnd,
      },
    });
    return {
      data: {
        id: request.id,
        type: 'plan_change',
        status: request.status,
        planCode: request.requestedPlanCode,
        totalPriceVnd: request.quotedPriceVnd,
        createdAt: request.createdAt.toISOString(),
      },
    };
  }

  async reserve(patientId: string, actorId: string, requestId?: string): Promise<{ id: string }> {
    await this.ensureEntitlement(patientId);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT patient_id
          FROM patient_ai_entitlements
          WHERE patient_id = ${patientId}::uuid
          FOR UPDATE
        `;
        await this.releaseStaleReservations(tx, patientId);
        const entitlement = await tx.patientAiEntitlement.findUniqueOrThrow({
          where: { patientId },
          include: { plan: true },
        });
        const { start, end } = this.monthBounds();
        const activeIncludedUsage = await tx.aiUsageEvent.count({
          where: {
            patientId,
            status: { in: ['reserved', 'completed'] },
            allowanceKind: 'included',
            reservedAt: { gte: start, lt: end },
          },
        });

        let allowanceKind: AiAllowanceKind = 'included';
        const quota = entitlement.plan.monthlyIncludedCredits;
        if (quota !== null && activeIncludedUsage >= quota) {
          if (entitlement.extraCreditBalance <= 0) {
            throw new AppError(
              'AI_QUOTA_EXHAUSTED',
              'AI analysis quota is exhausted. Purchase additional credits or upgrade the plan.',
              HttpStatus.PAYMENT_REQUIRED,
            );
          }
          allowanceKind = 'purchased';
          await tx.patientAiEntitlement.update({
            where: { patientId },
            data: {
              extraCreditBalance: { decrement: 1 },
              version: { increment: 1 },
            },
          });
        }

        const usage = await tx.aiUsageEvent.create({
          data: {
            patientId,
            actorId,
            requestId: requestId ?? null,
            allowanceKind,
          },
          select: { id: true },
        });
        return usage;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async completeInTransaction(
    tx: Prisma.TransactionClient,
    reservationId: string,
    caseId: string,
    occurredAt: Date,
  ) {
    const result = await tx.aiUsageEvent.updateMany({
      where: { id: reservationId, status: 'reserved' },
      data: { status: 'completed', caseId, occurredAt },
    });
    if (result.count !== 1) {
      throw new ConflictAppError(
        'AI_USAGE_RESERVATION_INVALID',
        'AI usage reservation is no longer active.',
      );
    }
  }

  async release(reservationId: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.aiUsageEvent.findUnique({
        where: { id: reservationId },
        select: { patientId: true, allowanceKind: true, status: true },
      });
      if (!reservation || reservation.status !== 'reserved') return;
      const released = await tx.aiUsageEvent.updateMany({
        where: { id: reservationId, status: 'reserved' },
        data: {
          status: 'released',
          releasedAt: new Date(),
          releaseReason: reason.slice(0, 200),
        },
      });
      if (released.count === 1 && reservation.allowanceKind === 'purchased') {
        await tx.patientAiEntitlement.update({
          where: { patientId: reservation.patientId },
          data: {
            extraCreditBalance: { increment: 1 },
            version: { increment: 1 },
          },
        });
      }
    });
  }

  async decideCreditPurchase(
    principal: AuthenticatedPrincipal,
    requestId: string,
    decision: 'approved' | 'rejected',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.aiCreditPurchaseRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new NotFoundAppError('AI credit purchase request not found.');
      if (!(await this.patients.findVisibleById(principal, request.patientId))) {
        throw new NotFoundAppError('AI credit purchase request not found.');
      }
      const changed = await tx.aiCreditPurchaseRequest.updateMany({
        where: { id: requestId, status: 'pending' },
        data: {
          status: decision,
          decidedBy: principal.userId,
          decidedAt: new Date(),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictAppError('AI_REQUEST_ALREADY_DECIDED', 'Request was already decided.');
      }
      if (decision === 'approved') {
        await tx.patientAiEntitlement.upsert({
          where: { patientId: request.patientId },
          update: {
            extraCreditBalance: { increment: request.credits },
            version: { increment: 1 },
          },
          create: {
            patientId: request.patientId,
            planCode: DEFAULT_PLAN_CODE,
            extraCreditBalance: request.credits,
          },
        });
      }
      return { data: { id: request.id, status: decision } };
    });
  }

  async decidePlanChange(
    principal: AuthenticatedPrincipal,
    requestId: string,
    decision: 'approved' | 'rejected',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.aiPlanChangeRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new NotFoundAppError('AI plan change request not found.');
      if (!(await this.patients.findVisibleById(principal, request.patientId))) {
        throw new NotFoundAppError('AI plan change request not found.');
      }
      const changed = await tx.aiPlanChangeRequest.updateMany({
        where: { id: requestId, status: 'pending' },
        data: {
          status: decision,
          decidedBy: principal.userId,
          decidedAt: new Date(),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictAppError('AI_REQUEST_ALREADY_DECIDED', 'Request was already decided.');
      }
      if (decision === 'approved') {
        await tx.patientAiEntitlement.upsert({
          where: { patientId: request.patientId },
          update: {
            planCode: request.requestedPlanCode,
            version: { increment: 1 },
          },
          create: {
            patientId: request.patientId,
            planCode: request.requestedPlanCode,
          },
        });
      }
      return { data: { id: request.id, status: decision } };
    });
  }

  private async ensureEntitlement(patientId: string) {
    return this.prisma.patientAiEntitlement.upsert({
      where: { patientId },
      update: {},
      create: { patientId, planCode: DEFAULT_PLAN_CODE },
      include: { plan: true },
    });
  }

  private async releaseStaleReservations(tx: Prisma.TransactionClient, patientId: string) {
    const staleBefore = new Date(Date.now() - STALE_RESERVATION_MS);
    const releasedPurchased = await tx.aiUsageEvent.updateMany({
      where: {
        patientId,
        status: 'reserved',
        allowanceKind: 'purchased',
        reservedAt: { lt: staleBefore },
      },
      data: {
        status: 'released',
        releasedAt: new Date(),
        releaseReason: 'stale_reservation_timeout',
      },
    });
    await tx.aiUsageEvent.updateMany({
      where: {
        patientId,
        status: 'reserved',
        allowanceKind: 'included',
        reservedAt: { lt: staleBefore },
      },
      data: {
        status: 'released',
        releasedAt: new Date(),
        releaseReason: 'stale_reservation_timeout',
      },
    });
    if (releasedPurchased.count > 0) {
      await tx.patientAiEntitlement.update({
        where: { patientId },
        data: {
          extraCreditBalance: { increment: releasedPurchased.count },
          version: { increment: 1 },
        },
      });
    }
  }

  private monthBounds(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }

  private mapPlan(plan: {
    code: string;
    name: string;
    annualPriceVnd: number;
    monthlyIncludedCredits: number | null;
    extraCreditUnitPriceVnd: number;
    description: string;
    features: Prisma.JsonValue;
  }) {
    return {
      code: plan.code,
      name: plan.name,
      annualPriceVnd: plan.annualPriceVnd,
      monthlyIncludedCredits: plan.monthlyIncludedCredits,
      extraCreditUnitPriceVnd: plan.extraCreditUnitPriceVnd,
      description: plan.description,
      features: Array.isArray(plan.features)
        ? plan.features.filter((feature): feature is string => typeof feature === 'string')
        : [],
    };
  }
}
