import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { OutboxService } from '../../core/outbox/outbox.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ConflictAppError, ForbiddenAppError, NotFoundAppError } from '../../core/errors/app-error';
import { EncountersRepository } from '../encounters/encounters.repository';

type Context = { requestId?: string; ip?: string; userAgent?: string };
// No `super_administrator` bypass: prescribing, diagnosing, signing, and
// annotating a medical record are clinical authorship, the one category of
// action the permission model never lets an Owner perform directly (see
// DoctorDecisionService's identical precedent and the removed bypasses in
// encounter-policies.ts / clinical-orders.service.ts).
const DOCTOR = ['doctor'];

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  private hasRole(p: AuthenticatedPrincipal, roles: string[]) {
    return p.memberships.some((m) => roles.includes(m.role));
  }
  private requireRole(p: AuthenticatedPrincipal, roles: string[]) {
    if (!this.hasRole(p, roles)) throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
  /** SECURITY FIX: flagLateResult/reviewDocument/flagDocument below had no
   * role check at all (every other write in this file requires DOCTOR or
   * medical_administrator) — a `patient` principal, who can see their own
   * encounter via `visible()`, could flip a signed record to
   * `addendum_required` or toggle a clinical document's review/flag state.
   * This is the minimal, unambiguous fix: exclude `patient` specifically,
   * matching this file's established pattern that patients never get
   * clinical-governance write actions. The exact staff-role subset (e.g.
   * nurse vs. care_coordinator vs. doctor-only) needs a product decision;
   * flagged as follow-up rather than guessed. */
  private requireStaffRole(p: AuthenticatedPrincipal) {
    if (!p.memberships.some((m) => m.role !== 'patient')) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN', 'This action requires a staff role.');
    }
  }
  private async visible(p: AuthenticatedPrincipal, encounterId: string) {
    const e = await this.encounters.findVisibleById(p, encounterId);
    if (!e) throw new NotFoundAppError('Encounter not found.');
    return e;
  }
  private async recordVisible(p: AuthenticatedPrincipal, recordId: string) {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundAppError('Medical record not found.');
    const encounter = await this.visible(p, record.encounterId);
    return { record, encounter };
  }
  private async log(
    tx: Prisma.TransactionClient,
    p: AuthenticatedPrincipal,
    e: { id: string; patientId: string; organizationId: string },
    action: string,
    resourceId: string,
    c: Context,
    reason?: string,
  ) {
    await this.audit.write(
      {
        actorId: p.userId,
        action,
        resourceType: 'medical_record',
        resourceId,
        patientId: e.patientId,
        organizationId: e.organizationId,
        result: 'success',
        reason: reason ?? null,
        requestId: c.requestId ?? null,
        ip: c.ip ?? null,
        userAgent: c.userAgent ?? null,
      },
      tx,
    );
  }
  private shape(
    record: Awaited<ReturnType<PrismaService['medicalRecord']['findUniqueOrThrow']>>,
    addenda: unknown[] = [],
  ) {
    return {
      ...record,
      addenda,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      signedAt: record.signedAt?.toISOString() ?? null,
    };
  }

  private async fullRecord(recordId: string) {
    const record = await this.prisma.medicalRecord.findUniqueOrThrow({ where: { id: recordId } });
    const addenda = await this.prisma.medicalRecordAddendum.findMany({
      where: { recordId },
      orderBy: { addedAt: 'asc' },
    });
    return this.shape(record, addenda);
  }
  async ensureDraft(p: AuthenticatedPrincipal, encounterId: string) {
    await this.visible(p, encounterId);
    const record = await this.prisma.medicalRecord.upsert({
      where: { encounterId },
      update: {},
      create: { encounterId },
    });
    const addenda = await this.prisma.medicalRecordAddendum.findMany({
      where: { recordId: record.id },
      orderBy: { addedAt: 'asc' },
    });
    return { data: this.shape(record, addenda) };
  }
  async prescribe(
    p: AuthenticatedPrincipal,
    encounterId: string,
    medications: Array<{ name: string; dose: string; durationDays: number }>,
    c: Context,
  ) {
    this.requireRole(p, DOCTOR);
    const e = await this.visible(p, encounterId);
    const result = await this.prisma.$transaction(async (tx) => {
      const record = await tx.medicalRecord.upsert({
        where: { encounterId },
        update: {},
        create: { encounterId },
      });
      if (['signed', 'amended'].includes(record.status))
        throw new ConflictAppError(
          'MEDICAL_RECORD_ALREADY_SIGNED',
          'Signed records cannot be changed.',
        );
      const prescription = await tx.prescription.create({
        data: { encounterId, doctorId: p.userId, medications },
      });
      await tx.medicalRecord.update({
        where: { id: record.id },
        data: { prescriptionId: prescription.id, status: 'in_review', version: { increment: 1 } },
      });
      await this.log(tx, p, e, 'prescription.issued', prescription.id, c);
      await this.outbox.write(tx, {
        aggregateType: 'prescription',
        aggregateId: prescription.id,
        eventType: 'prescription.issued',
        payload: { encounterId, patientId: e.patientId },
      });
      return prescription;
    });
    return { data: result };
  }
  async listPrescriptions(p: AuthenticatedPrincipal, encounterId: string) {
    await this.visible(p, encounterId);
    return {
      data: await this.prisma.prescription.findMany({
        where: { encounterId },
        orderBy: { issuedAt: 'desc' },
      }),
    };
  }
  async addDocument(
    p: AuthenticatedPrincipal,
    encounterId: string,
    dto: { type: string; fileId: string; workflowTaskId?: string; clinicalOrderId?: string },
    c: Context,
  ) {
    const e = await this.visible(p, encounterId);
    const upload = await this.prisma.uploadObject.findFirst({
      where: { id: dto.fileId, ownerId: p.userId, status: 'confirmed' },
    });
    if (!upload?.fileHash)
      throw new ConflictAppError('VALIDATION_FAILED', 'Upload must be confirmed first.');
    const fileHash = upload.fileHash;
    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clinicalDocument.create({
        data: {
          encounterId,
          type: dto.type,
          fileId: dto.fileId,
          fileName: upload.fileName,
          fileHash,
          uploadedBy: p.userId,
          workflowTaskId: dto.workflowTaskId,
          clinicalOrderId: dto.clinicalOrderId,
        },
      });
      await this.log(tx, p, e, 'clinical_document.uploaded', created.id, c);
      return created;
    });
    return { data: doc };
  }
  async listDocuments(p: AuthenticatedPrincipal, encounterId: string) {
    await this.visible(p, encounterId);
    return {
      data: await this.prisma.clinicalDocument.findMany({
        where: { encounterId },
        orderBy: { uploadedAt: 'desc' },
      }),
    };
  }
  async attachDiagnosis(
    p: AuthenticatedPrincipal,
    encounterId: string,
    dto: { diagnosisId: string; version: number },
    c: Context,
  ) {
    this.requireRole(p, DOCTOR);
    const e = await this.visible(p, encounterId);
    const diagnosis = await this.prisma.doctorDiagnosis.findFirst({
      where: { id: dto.diagnosisId, encounterId, status: { in: ['confirmed', 'revised'] } },
    });
    if (!diagnosis) throw new NotFoundAppError('Confirmed diagnosis not found.');
    const record = await this.prisma.medicalRecord.upsert({
      where: { encounterId },
      update: {},
      create: { encounterId },
    });
    const result = await this.prisma.medicalRecord.updateMany({
      where: { id: record.id, version: dto.version, status: { notIn: ['signed', 'amended'] } },
      data: { diagnosisId: dto.diagnosisId, status: 'in_review', version: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictAppError('OPTIMISTIC_LOCK_FAILED', 'Medical record changed.');
    await this.audit.write({
      actorId: p.userId,
      action: 'medical_record.diagnosis_attached',
      resourceType: 'medical_record',
      resourceId: record.id,
      patientId: e.patientId,
      organizationId: e.organizationId,
      result: 'success',
      requestId: c.requestId ?? null,
    });
    return this.ensureDraft(p, encounterId);
  }
  async setDischarge(
    p: AuthenticatedPrincipal,
    encounterId: string,
    dto: { discharge?: unknown; followUp?: unknown; version: number },
    c: Context,
  ) {
    this.requireRole(p, DOCTOR);
    const e = await this.visible(p, encounterId);
    const record = await this.prisma.medicalRecord.upsert({
      where: { encounterId },
      update: {},
      create: { encounterId },
    });
    const changed = await this.prisma.medicalRecord.updateMany({
      where: { id: record.id, version: dto.version, status: { notIn: ['signed', 'amended'] } },
      data: {
        discharge: dto.discharge as Prisma.InputJsonValue,
        followUp: dto.followUp as Prisma.InputJsonValue,
        status: 'awaiting_signature',
        version: { increment: 1 },
      },
    });
    if (!changed.count)
      throw new ConflictAppError('OPTIMISTIC_LOCK_FAILED', 'Medical record changed.');
    await this.audit.write({
      actorId: p.userId,
      action: 'medical_record.discharge_updated',
      resourceType: 'medical_record',
      resourceId: record.id,
      patientId: e.patientId,
      organizationId: e.organizationId,
      result: 'success',
      requestId: c.requestId ?? null,
    });
    return this.ensureDraft(p, encounterId);
  }
  async completionCheck(p: AuthenticatedPrincipal, recordId: string) {
    const { record } = await this.recordVisible(p, recordId);
    const missing: Array<{ code: string; message: string }> = [];
    if (!record.diagnosisId) {
      missing.push({
        code: 'DIAGNOSIS_NOT_CONFIRMED',
        message: 'Chẩn đoán chưa được xác nhận',
      });
    } else if (
      !(await this.prisma.doctorDiagnosis.findFirst({
        where: { id: record.diagnosisId, status: { in: ['confirmed', 'revised'] } },
      }))
    ) {
      missing.push({
        code: 'DIAGNOSIS_NOT_CONFIRMED',
        message: 'Chẩn đoán chưa được xác nhận',
      });
    }
    return {
      data: {
        ok: missing.length === 0,
        missing,
        checkedAt: new Date().toISOString(),
        recordVersion: record.version,
      },
    };
  }
  async sign(p: AuthenticatedPrincipal, recordId: string, c: Context) {
    this.requireRole(p, DOCTOR);
    const { record, encounter: e } = await this.recordVisible(p, recordId);
    if (['signed', 'amended'].includes(record.status))
      throw new ConflictAppError('MEDICAL_RECORD_ALREADY_SIGNED', 'Record is already signed.');
    const check = await this.completionCheck(p, recordId);
    if (!check.data.ok)
      throw new ConflictAppError(
        'MEDICAL_RECORD_COMPLETION_REQUIRED',
        check.data.missing.map((m) => m.message).join(', '),
      );
    const signed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.medicalRecord.update({
        where: { id: recordId },
        data: {
          status: 'signed',
          signedBy: p.userId,
          signedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (e.status === 'discharge_ready')
        await tx.medicalEncounter.update({
          where: { id: e.id },
          data: { status: 'record_signed', version: { increment: 1 } },
        });
      await this.log(tx, p, e, 'medical_record.signed', recordId, c);
      await this.outbox.write(tx, {
        aggregateType: 'medical_record',
        aggregateId: recordId,
        eventType: 'medical_record.signed',
        payload: { encounterId: e.id, patientId: e.patientId },
      });
      return updated;
    });
    return { data: this.shape(signed) };
  }
  async addAddendum(p: AuthenticatedPrincipal, recordId: string, text: string, c: Context) {
    this.requireRole(p, DOCTOR);
    const { record, encounter: e } = await this.recordVisible(p, recordId);
    if (!['signed', 'amended'].includes(record.status))
      throw new ConflictAppError('INVALID_STATE_TRANSITION', 'Addenda require a signed record.');
    await this.prisma.$transaction(async (tx) => {
      await tx.medicalRecordAddendum.create({
        data: { recordId, text, addedBy: p.userId },
      });
      await tx.medicalRecord.update({
        where: { id: recordId },
        data: { status: 'amended', version: { increment: 1 } },
      });
      await this.log(tx, p, e, 'medical_record.addendum_added', recordId, c);
    });
    return { data: await this.fullRecord(recordId) };
  }
  async reopen(p: AuthenticatedPrincipal, recordId: string, reason: string, c: Context) {
    // No `super_administrator` bypass — same reasoning as DOCTOR above.
    this.requireRole(p, ['medical_administrator']);
    const { record, encounter: e } = await this.recordVisible(p, recordId);
    await this.prisma.$transaction(async (tx) => {
      await tx.medicalRecord.update({
        where: { id: record.id },
        data: { status: 'reopened', reopenedReason: reason, version: { increment: 1 } },
      });
      await this.log(tx, p, e, 'medical_record.reopened', recordId, c, reason);
    });
    return { data: await this.fullRecord(recordId) };
  }
  async flagLateResult(
    p: AuthenticatedPrincipal,
    recordId: string,
    description: string,
    c: Context,
  ) {
    this.requireStaffRole(p);
    const { record, encounter: e } = await this.recordVisible(p, recordId);
    if (!['signed', 'amended'].includes(record.status))
      await this.prisma.medicalRecord.update({
        where: { id: recordId },
        data: { status: 'addendum_required', version: { increment: 1 } },
      });
    await this.audit.write({
      actorId: p.userId,
      action: 'medical_record.late_result_flagged',
      resourceType: 'medical_record',
      resourceId: recordId,
      patientId: e.patientId,
      organizationId: e.organizationId,
      result: 'success',
      reason: description,
      requestId: c.requestId ?? null,
    });
    return { data: await this.fullRecord(recordId) };
  }
  async reviewDocument(p: AuthenticatedPrincipal, id: string, c: Context) {
    this.requireStaffRole(p);
    const doc = await this.prisma.clinicalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundAppError('Document not found.');
    const e = await this.visible(p, doc.encounterId);
    const row = await this.prisma.clinicalDocument.update({
      where: { id },
      data: { reviewStatus: 'reviewed', version: { increment: 1 } },
    });
    await this.audit.write({
      actorId: p.userId,
      action: 'clinical_document.reviewed',
      resourceType: 'clinical_document',
      resourceId: id,
      patientId: e.patientId,
      organizationId: e.organizationId,
      result: 'success',
      requestId: c.requestId ?? null,
    });
    return { data: row };
  }
  async flagDocument(p: AuthenticatedPrincipal, id: string, reason: string, c: Context) {
    this.requireStaffRole(p);
    const doc = await this.prisma.clinicalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundAppError('Document not found.');
    const e = await this.visible(p, doc.encounterId);
    const row = await this.prisma.clinicalDocument.update({
      where: { id },
      data: { incorrectLinkFlag: true, version: { increment: 1 } },
    });
    await this.audit.write({
      actorId: p.userId,
      action: 'clinical_document.incorrect_link_flagged',
      resourceType: 'clinical_document',
      resourceId: id,
      patientId: e.patientId,
      organizationId: e.organizationId,
      result: 'success',
      reason,
      requestId: c.requestId ?? null,
    });
    return { data: row };
  }
}
