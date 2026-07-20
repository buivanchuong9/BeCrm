import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { OutboxService } from '../../core/outbox/outbox.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { NotFoundAppError } from '../../core/errors/app-error';
import { toOffsetPage } from '../../core/pagination/pagination.util';
import { PatientsRepository } from './patients.repository';
import { ConsentsRepository, ConsentType } from './consents.repository';
import { assertCanChangeConsent, canViewConsentReadOnly } from './policies/patient-policies';
import { CreateConsentGrantRequest } from './dto/create-consent-grant.dto';
import { CreateConsentWithdrawalRequest } from './dto/create-consent-withdrawal.dto';
import { ConsentResponseDto } from './dto/responses/consent-response.dto';
import { RequestContext } from './patients.service';

function toConsentResponse(consent: {
  id: string;
  patientId: string;
  type: string;
  policyVersion: string;
  granted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  version: number;
}): ConsentResponseDto {
  return {
    id: consent.id,
    patientId: consent.patientId,
    type: consent.type,
    policyVersion: consent.policyVersion,
    granted: consent.granted,
    grantedAt: consent.grantedAt?.toISOString() ?? null,
    withdrawnAt: consent.withdrawnAt?.toISOString() ?? null,
    version: consent.version,
  };
}

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsRepository,
    private readonly consents: ConsentsRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  private async loadAuthorizedPatient(principal: AuthenticatedPrincipal, patientId: string) {
    const patient = await this.patients.findVisibleById(principal, patientId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }
    return patient;
  }

  async list(
    principal: AuthenticatedPrincipal,
    patientId: string,
    query: { page: number; limit: number; type?: string },
  ) {
    const patient = await this.loadAuthorizedPatient(principal, patientId);
    if (!canViewConsentReadOnly(principal, patient)) {
      throw new NotFoundAppError('Patient not found.');
    }
    const rows = await this.consents.listByPatientId(patientId, query.type);
    const page = toOffsetPage(rows.map(toConsentResponse), rows.length, query.page, query.limit);
    return { data: page.data, meta: page.meta };
  }

  async grant(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateConsentGrantRequest,
    context: RequestContext,
  ) {
    const patient = await this.loadAuthorizedPatient(principal, patientId);
    assertCanChangeConsent(principal, patient);

    const grantedAt = dto.grantedAt ? new Date(dto.grantedAt) : new Date();
    const type = dto.type as ConsentType;

    const consent = await this.prisma.$transaction(async (tx) => {
      const updated = await this.consents.grant(tx, patientId, type, dto.policyVersion, grantedAt);
      await this.consents.writeEvent(tx, {
        consentId: updated.id,
        patientId,
        type,
        action: 'granted',
        policyVersion: dto.policyVersion,
        actorId: principal.userId,
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'consent.grant',
          resourceType: 'consent',
          resourceId: updated.id,
          patientId,
          organizationId: patient.organizationId,
          result: 'success',
          changedFields: ['granted', 'grantedAt', 'policyVersion'],
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'consent',
        aggregateId: updated.id,
        eventType: 'consent.granted',
        payload: { patientId, type, policyVersion: dto.policyVersion },
      });
      return updated;
    });

    return { data: toConsentResponse(consent) };
  }

  async withdraw(
    principal: AuthenticatedPrincipal,
    patientId: string,
    dto: CreateConsentWithdrawalRequest,
    context: RequestContext,
  ) {
    const patient = await this.loadAuthorizedPatient(principal, patientId);
    assertCanChangeConsent(principal, patient);

    const type = dto.type as ConsentType;
    const current = await this.consents.findCurrent(patientId, type);
    if (!current) {
      throw new NotFoundAppError('Consent not found.');
    }
    const withdrawnAt = new Date();

    const consent = await this.prisma.$transaction(async (tx) => {
      const updated = await this.consents.withdraw(tx, current.id, dto.version, withdrawnAt);
      await this.consents.writeEvent(tx, {
        consentId: updated.id,
        patientId,
        type,
        action: 'withdrawn',
        policyVersion: updated.policyVersion,
        actorId: principal.userId,
        reason: dto.reason,
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'consent.withdraw',
          resourceType: 'consent',
          resourceId: updated.id,
          patientId,
          organizationId: patient.organizationId,
          result: 'success',
          reason: dto.reason ?? null,
          changedFields: ['granted', 'withdrawnAt'],
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'consent',
        aggregateId: updated.id,
        eventType: 'consent.withdrawn',
        payload: { patientId, type },
      });
      return updated;
    });

    return { data: toConsentResponse(consent) };
  }

  async set(
    principal: AuthenticatedPrincipal,
    patientId: string,
    type: string,
    dto: { granted: boolean; policyVersion?: string; reason?: string },
    context: RequestContext,
  ) {
    const current = await this.consents.findCurrent(patientId, type as ConsentType);
    if (dto.granted) {
      return this.grant(
        principal,
        patientId,
        {
          type: type as ConsentType,
          policyVersion: dto.policyVersion ?? current?.policyVersion ?? 'current',
        },
        context,
      );
    }
    if (!current) throw new NotFoundAppError('Consent not found.');
    return this.withdraw(
      principal,
      patientId,
      { type: type as ConsentType, reason: dto.reason, version: current.version },
      context,
    );
  }
}
