import { Injectable } from '@nestjs/common';
import { EncounterStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ConflictAppError, ForbiddenAppError, NotFoundAppError } from '../../core/errors/app-error';
import { toOffsetPage, toCursorPage, decodeCursor } from '../../core/pagination/pagination.util';
import { PatientsRepository } from '../patients/patients.repository';
import { EncountersRepository } from './encounters.repository';
import {
  resolveEncounterListScope,
  assertCanCreateEncounter,
  assertCanCloseEncounter,
  assertCanTransition,
} from './policies/encounter-policies';
import { assertTransitionAllowed, canTransition } from './encounter-state-machine';
import { toEncounterEventResponse, toEncounterResponse } from './encounter-response.mapper';
import { CreateEncounterRequest } from './dto/create-encounter.dto';
import { TransitionEncounterRequest } from './dto/transition-encounter.dto';
import { CloseEncounterRequest } from './dto/close-encounter.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

function eventKindFor(status: EncounterStatus): 'info' | 'warning' | 'success' | 'danger' {
  if (status === 'escalated') return 'danger';
  if (status === 'closed' || status === 'record_signed' || status === 'diagnosed') return 'success';
  return 'info';
}

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: EncountersRepository,
    private readonly patients: PatientsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    query: {
      page: number;
      limit: number;
      status?: EncounterStatus;
      department?: string;
      clinicLocationId?: string;
    },
  ) {
    const scope = resolveEncounterListScope(principal);

    if (scope.mode === 'self') {
      const patient = await this.patients.findByUserId(principal.userId);
      if (!patient) {
        return { data: [], meta: { page: 1, limit: query.limit, total: 0, totalPages: 1 } };
      }
      const { rows, total } = await this.encounters.listSelf(
        patient.id,
        { status: query.status, department: query.department },
        query.page,
        query.limit,
      );
      const page = toOffsetPage(rows.map(toEncounterResponse), total, query.page, query.limit);
      return { data: page.data, meta: page.meta };
    }

    const { rows, total } = await this.encounters.listForOrganizations({
      organizationIds: scope.mode === 'organizations' ? scope.organizationIds : null,
      status: query.status,
      department: query.department,
      clinicLocationId: query.clinicLocationId,
      page: query.page,
      limit: query.limit,
    });
    const page = toOffsetPage(rows.map(toEncounterResponse), total, query.page, query.limit);
    return { data: page.data, meta: page.meta };
  }

  async getDetail(principal: AuthenticatedPrincipal, encounterId: string, context: RequestContext) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }

    // Sensitive-access audit (docs/api.md section 15 item 4) — every detail
    // read is logged, mirroring PatientsService.getDetail's unconditional
    // `patient.read` audit event.
    await this.audit.write({
      actorId: principal.userId,
      action: 'encounter.read',
      resourceType: 'encounter',
      resourceId: encounter.id,
      patientId: encounter.patientId,
      organizationId: encounter.organizationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return { data: toEncounterResponse(encounter) };
  }

  async getActive(principal: AuthenticatedPrincipal) {
    // docs/api.md ENC-4: never an arbitrary ?patientId= query param — always
    // the caller's own patient row, resolved server-side from the token.
    if (!principal.memberships.some((m) => m.role === 'patient')) {
      throw new ForbiddenAppError(
        'AUTH_FORBIDDEN',
        'Only patients may look up their own active encounter.',
      );
    }
    const patient = await this.patients.findByUserId(principal.userId);
    if (!patient) {
      throw new NotFoundAppError('No active encounter found.');
    }
    const encounter = await this.encounters.findActiveForPatient(patient.id);
    if (!encounter) {
      throw new NotFoundAppError('No active encounter found.');
    }
    return { data: toEncounterResponse(encounter) };
  }

  async listEvents(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    query: { cursor?: string; limit: number },
  ) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    const decoded = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && !decoded) {
      throw new ConflictAppError('VALIDATION_FAILED', 'Invalid cursor.');
    }
    const rows = await this.encounters.listEvents(
      encounterId,
      query.limit,
      decoded ? { v: decoded.v, id: decoded.id } : undefined,
    );
    const page = toCursorPage(rows, query.limit, (row) => row.at.toISOString());
    return { data: page.data.map(toEncounterEventResponse), meta: page.meta };
  }

  async create(
    principal: AuthenticatedPrincipal,
    dto: CreateEncounterRequest,
    context: RequestContext,
  ) {
    assertCanCreateEncounter(principal);
    const patient = await this.patients.findVisibleById(principal, dto.patientId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const encounter = await this.encounters.create(tx, {
        organizationId: patient.organizationId,
        patientId: patient.id,
        parentEncounterId: dto.parentEncounterId ?? null,
        type: dto.type,
        origin: dto.origin,
        status: 'registered',
        department: dto.department,
      });
      await this.encounters.addEvent(tx, encounter.id, 'Encounter created', 'info');
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'encounter.created',
          resourceType: 'encounter',
          resourceId: encounter.id,
          patientId: patient.id,
          organizationId: patient.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return encounter;
    });

    return { data: toEncounterResponse(created) };
  }

  async transition(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: TransitionEncounterRequest,
    context: RequestContext,
  ) {
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    assertTransitionAllowed(encounter.status, dto.toStatus);
    assertCanTransition(principal, encounter.status, dto.toStatus);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.medicalEncounter.updateMany({
        where: { id: encounterId, version: dto.version },
        data: {
          status: dto.toStatus,
          ...(dto.blockingCondition !== undefined
            ? { blockingCondition: dto.blockingCondition }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The encounter was modified by another request.',
        );
      }
      await this.encounters.addEvent(
        tx,
        encounterId,
        dto.reason
          ? `Status changed to "${dto.toStatus}": ${dto.reason}`
          : `Status changed to "${dto.toStatus}"`,
        eventKindFor(dto.toStatus),
      );
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'encounter.status_changed',
          resourceType: 'encounter',
          resourceId: encounterId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          reason: dto.reason ?? null,
          changedFields: ['status'],
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.medicalEncounter.findUniqueOrThrow({ where: { id: encounterId } });
    });

    return { data: toEncounterResponse(updated) };
  }

  async close(
    principal: AuthenticatedPrincipal,
    encounterId: string,
    dto: CloseEncounterRequest,
    context: RequestContext,
  ) {
    assertCanCloseEncounter(principal);
    const encounter = await this.encounters.findVisibleById(principal, encounterId);
    if (!encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    if (!canTransition(encounter.status, 'closed') || encounter.status !== 'record_signed') {
      // docs/api.md section 23: closing additionally requires
      // MedicalRecord.status === 'signed'. The Medical Record module has not
      // shipped yet (docs/api.md section 29, Phase 2) — once it exists, this
      // guard must be extended to re-check that table server-side rather than
      // trusting the encounter status alone, exactly as the frontend evidence
      // itself specifies ("BE phải validate lại, không tin FE").
      throw new ConflictAppError(
        'ENCOUNTER_CLOSE_REQUIRES_SIGNED_RECORD',
        'The encounter cannot be closed until its medical record has been signed.',
      );
    }
    const signedRecord = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      select: { status: true, signedAt: true, signedBy: true },
    });
    if (
      !signedRecord ||
      signedRecord.status !== 'signed' ||
      !signedRecord.signedAt ||
      !signedRecord.signedBy
    ) {
      throw new ConflictAppError(
        'ENCOUNTER_CLOSE_REQUIRES_SIGNED_RECORD',
        'The encounter cannot be closed until its medical record has been signed.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.medicalEncounter.updateMany({
        where: { id: encounterId, version: dto.version, status: 'record_signed' },
        data: { status: 'closed', version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The encounter was modified by another request.',
        );
      }
      await this.encounters.addEvent(tx, encounterId, 'Encounter closed', 'success');
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'encounter.closed',
          resourceType: 'encounter',
          resourceId: encounterId,
          patientId: encounter.patientId,
          organizationId: encounter.organizationId,
          result: 'success',
          changedFields: ['status'],
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.medicalEncounter.findUniqueOrThrow({ where: { id: encounterId } });
    });

    return { data: toEncounterResponse(updated) };
  }
}
