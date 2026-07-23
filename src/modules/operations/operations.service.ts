import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { AuditService } from '../../core/audit/audit.service';
import { ConflictAppError, ForbiddenAppError, NotFoundAppError } from '../../core/errors/app-error';
import { AppConfiguration } from '../../core/configuration/configuration';
import { PrismaService } from '../../core/database/prisma.service';
import { EncountersRepository } from '../encounters/encounters.repository';
import { PatientsRepository } from '../patients/patients.repository';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

const ALERT_RULES = {
  new_red_flag_symptom: ['critical', 'on_call_doctor', 1, true],
  worsening_symptoms: ['high', 'care_coordinator', 4, true],
  treatment_failure: ['high', 'care_coordinator_to_medical_administrator', 24, true],
  urgent_contact_request: ['high', 'care_coordinator', 2, false],
  abnormal_home_monitoring: ['medium', 'care_coordinator', 6, true],
  medication_side_effect: ['medium', 'pharmacist_to_doctor', 12, false],
  missed_follow_up: ['medium', 'customer_care_employee', 24, false],
  no_response: ['medium', 'customer_care_employee', 24, false],
  medication_non_adherence: ['low', 'care_coordinator', 48, false],
} as const;

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsRepository,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  private roles(p: AuthenticatedPrincipal) {
    return new Set(p.memberships.map((m) => m.role));
  }
  private has(p: AuthenticatedPrincipal, roles: UserRole[]) {
    const own = this.roles(p);
    return own.has('super_administrator') || roles.some((r) => own.has(r));
  }
  private require(p: AuthenticatedPrincipal, roles: UserRole[]) {
    if (!this.has(p, roles)) throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
  private async patient(p: AuthenticatedPrincipal, id: string) {
    const row = await this.patients.findVisibleById(p, id);
    if (!row) throw new NotFoundAppError('Patient not found.');
    return row;
  }
  private async log(
    p: AuthenticatedPrincipal,
    action: string,
    resourceType: string,
    resourceId: string | null,
    c: RequestContext,
    patientId?: string | null,
  ) {
    await this.audit.write({
      actorId: p.userId,
      action,
      resourceType,
      resourceId,
      patientId,
      organizationId: p.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: c.requestId ?? null,
      ip: c.ip ?? null,
      userAgent: c.userAgent ?? null,
    });
  }

  async createAlert(
    p: AuthenticatedPrincipal,
    patientId: string,
    trigger: keyof typeof ALERT_RULES,
    note: string,
    c: RequestContext,
  ) {
    this.require(p, ['care_coordinator', 'system_administrator']);
    await this.patient(p, patientId);
    const rule = ALERT_RULES[trigger];
    if (!rule) throw new ConflictAppError('VALIDATION_FAILED', 'Unsupported escalation trigger.');
    const plan = await this.prisma.crmCarePlan.findFirst({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
    });
    const row = await this.prisma.clinicalAlert.create({
      data: {
        patientId,
        carePlanId: plan?.id,
        encounterId: plan?.encounterId,
        trigger,
        severity: rule[0],
        responsibleActor: rule[1],
        responseDeadlineHours: rule[2],
        requiresLinkedEncounter: rule[3],
        note,
      },
    });
    if (rule[3])
      await this.prisma.encounterCreationRequest.create({
        data: {
          patientId,
          sourceAlertId: row.id,
          requestedByRole: p.memberships[0]?.role ?? 'system_administrator',
          reason: `Automatic request for ${trigger}`,
        },
      });
    await this.log(p, 'clinical_alert.created', 'clinical_alert', row.id, c, patientId);
    return { data: row };
  }
  async patientAlerts(p: AuthenticatedPrincipal, patientId: string) {
    await this.patient(p, patientId);
    return {
      data: await this.prisma.clinicalAlert.findMany({
        where: { patientId },
        orderBy: { detectedAt: 'desc' },
      }),
    };
  }
  async alerts(p: AuthenticatedPrincipal, status?: string) {
    this.require(p, [
      'doctor',
      'nurse',
      'receptionist',
      'care_coordinator',
      'medical_administrator',
      'system_administrator',
    ]);
    const organizationIds = [...new Set(p.memberships.map((m) => m.organizationId))];
    return {
      data: await this.prisma.clinicalAlert.findMany({
        where: {
          ...(status ? { status } : {}),
          patientId: {
            in: (
              await this.prisma.patient.findMany({
                where: this.roles(p).has('super_administrator')
                  ? {}
                  : { organizationId: { in: organizationIds } },
                select: { id: true },
              })
            ).map((x) => x.id),
          },
        },
        orderBy: { detectedAt: 'desc' },
      }),
    };
  }
  async closeAlert(p: AuthenticatedPrincipal, id: string, c: RequestContext) {
    this.require(p, ['doctor', 'medical_administrator', 'care_coordinator']);
    const row = await this.prisma.clinicalAlert.findUnique({ where: { id } });
    if (!row) throw new NotFoundAppError('Alert not found.');
    await this.patient(p, row.patientId);
    const updated = await this.prisma.clinicalAlert.update({
      where: { id },
      data: {
        status: 'resolved',
        closedBy: p.userId,
        closedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.log(p, 'clinical_alert.closed', 'clinical_alert', id, c, row.patientId);
    return { data: updated };
  }

  async requestEncounter(
    p: AuthenticatedPrincipal,
    patientId: string,
    dto: { reason: string; requestedByRole: string; sourceAlertId?: string },
    c: RequestContext,
  ) {
    await this.patient(p, patientId);
    const ownRoles = this.roles(p);
    if (!ownRoles.has('super_administrator') && !ownRoles.has(dto.requestedByRole as UserRole))
      throw new ForbiddenAppError('AUTH_FORBIDDEN');
    const row = await this.prisma.encounterCreationRequest.create({ data: { patientId, ...dto } });
    await this.log(
      p,
      'encounter_request.created',
      'encounter_creation_request',
      row.id,
      c,
      patientId,
    );
    return { data: row };
  }
  async encounterRequests(p: AuthenticatedPrincipal, status?: string) {
    this.require(p, ['doctor', 'medical_administrator']);
    const organizationIds = [...new Set(p.memberships.map((m) => m.organizationId))];
    const patientIds = (
      await this.prisma.patient.findMany({
        where: this.roles(p).has('super_administrator')
          ? {}
          : { organizationId: { in: organizationIds } },
        select: { id: true },
      })
    ).map((x) => x.id);
    return {
      data: await this.prisma.encounterCreationRequest.findMany({
        where: { patientId: { in: patientIds }, ...(status ? { status } : {}) },
        orderBy: { requestedAt: 'asc' },
      }),
    };
  }
  async decideEncounterRequest(
    p: AuthenticatedPrincipal,
    id: string,
    decision: 'approve' | 'reject',
    department: string | undefined,
    c: RequestContext,
  ) {
    this.require(p, ['doctor', 'medical_administrator']);
    const request = await this.prisma.encounterCreationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundAppError('Encounter request not found.');
    const patient = await this.patient(p, request.patientId);
    if (request.status !== 'requested')
      throw new ConflictAppError('INVALID_STATE_TRANSITION', 'Request was already decided.');
    let encounterId: string | null = null;
    if (decision === 'approve') {
      const parent = await this.encounters.findMostRecentlyUpdatedForPatient(request.patientId);
      const clinicLocationId = p.memberships.find(
        (m) => m.organizationId === patient.organizationId,
      )?.clinicLocationId;
      if (!clinicLocationId)
        throw new ConflictAppError('VALIDATION_FAILED', 'A clinic-scoped membership is required.');
      const row = await this.prisma.medicalEncounter.create({
        data: {
          patientId: request.patientId,
          organizationId: patient.organizationId,
          clinicLocationId,
          type: 'follow_up',
          origin: 'follow_up_request',
          department: department ?? parent?.department ?? 'dermatology',
          parentEncounterId: parent?.id,
          currentDoctorId: this.has(p, ['doctor']) ? p.userId : undefined,
        },
      });
      encounterId = row.id;
    }
    const updated = await this.prisma.encounterCreationRequest.update({
      where: { id },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedBy: p.userId,
        decidedAt: new Date(),
        createdEncounterId: encounterId,
        version: { increment: 1 },
      },
    });
    await this.log(
      p,
      'encounter_request.decided',
      'encounter_creation_request',
      id,
      c,
      request.patientId,
    );
    return { data: updated };
  }

  async auditEvents(
    p: AuthenticatedPrincipal,
    q: {
      entityType?: string;
      patientId?: string;
      encounterId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    this.require(p, ['medical_administrator', 'system_administrator']);
    const where: Prisma.AuditEventWhereInput = {
      ...(q.entityType ? { resourceType: q.entityType } : {}),
      ...(q.patientId ? { patientId: q.patientId } : {}),
      ...(q.encounterId ? { resourceId: q.encounterId } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            occurredAt: {
              ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
              ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
            },
          }
        : {}),
    };
    const page = q.page ?? 1,
      take = Math.min(q.pageSize ?? 50, 200);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { data, meta: { page, pageSize: take, total } };
  }
  async clientEvent(
    p: AuthenticatedPrincipal,
    dto: { action?: string; message: string; stack?: string },
    c: RequestContext,
  ) {
    await this.audit.write({
      actorId: p.userId,
      action: dto.action ?? 'UNHANDLED_CLIENT_ERROR',
      resourceType: 'client',
      result: 'error',
      reason: `${dto.message}${dto.stack ? `\n${dto.stack}` : ''}`.slice(0, 4000),
      requestId: c.requestId ?? null,
      ip: c.ip ?? null,
      userAgent: c.userAgent ?? null,
    });
    return { data: { accepted: true } };
  }

  connections(p: AuthenticatedPrincipal) {
    this.require(p, ['medical_administrator', 'system_administrator']);
    return this.prisma.integrationConnection
      .findMany({ orderBy: { name: 'asc' } })
      .then((data) => ({ data }));
  }
  messages(p: AuthenticatedPrincipal, connectionId: string) {
    this.require(p, ['medical_administrator', 'system_administrator']);
    return this.prisma.integrationMessage
      .findMany({ where: { connectionId }, orderBy: { createdAt: 'desc' } })
      .then((data) => ({ data }));
  }
  async retryConnection(p: AuthenticatedPrincipal, id: string, c: RequestContext) {
    this.require(p, ['medical_administrator', 'system_administrator']);
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: { status: 'retrying', retryCount: { increment: 1 } },
    });
    await this.prisma.integrationMessage.updateMany({
      where: { connectionId: id, status: 'failed' },
      data: { status: 'pending' },
    });
    await this.log(p, 'integration.retry_requested', 'integration_connection', id, c);
    return { data: row };
  }
  async reconcileConnection(p: AuthenticatedPrincipal, id: string, c: RequestContext) {
    this.require(p, ['medical_administrator', 'system_administrator']);
    const pending = await this.prisma.integrationMessage.count({
      where: { connectionId: id, status: 'pending' },
    });
    const failed = await this.prisma.integrationMessage.count({
      where: { connectionId: id, status: 'failed' },
    });
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        pendingMessages: pending,
        deadLetterCount: failed,
        status: failed ? 'degraded' : 'healthy',
        ...(failed ? { lastFailureAt: new Date() } : { lastSuccessAt: new Date() }),
      },
    });
    await this.log(p, 'integration.reconciled', 'integration_connection', id, c);
    return { data: row };
  }

  async operationalKpis(p: AuthenticatedPrincipal) {
    this.require(p, [
      'doctor',
      'nurse',
      'receptionist',
      'care_coordinator',
      'medical_administrator',
      'system_administrator',
    ]);
    const orgIds = [...new Set(p.memberships.map((m) => m.organizationId))];
    const encounterWhere = this.roles(p).has('super_administrator')
      ? {}
      : { organizationId: { in: orgIds } };
    const patientIds = (
      await this.prisma.patient.findMany({
        where: this.roles(p).has('super_administrator') ? {} : { organizationId: { in: orgIds } },
        select: { id: true },
      })
    ).map((x) => x.id);
    const encounterIds = (
      await this.prisma.medicalEncounter.findMany({ where: encounterWhere, select: { id: true } })
    ).map((row) => row.id);
    const openTasks = await this.prisma.workflowTask.findMany({
      where: {
        status: { notIn: ['completed', 'skipped', 'cancelled'] },
        ...(this.roles(p).has('super_administrator') ? {} : { encounterId: { in: encounterIds } }),
      },
      select: { createdAt: true, slaMinutes: true },
    });
    const overdueSlaTasks = openTasks.filter(
      (task) => task.createdAt.getTime() + task.slaMinutes * 60_000 < Date.now(),
    ).length;
    const [
      activeEncounters,
      awaitingDoctorReview,
      emergencyEncounters,
      recordsAwaitingSignature,
      openCrmAlerts,
      failedNotifications,
      unhealthyIntegrations,
    ] = await Promise.all([
      this.prisma.medicalEncounter.count({
        where: { ...encounterWhere, status: { notIn: ['closed', 'follow_up_linked'] } },
      }),
      this.prisma.medicalEncounter.count({
        where: { ...encounterWhere, status: 'under_doctor_review' },
      }),
      this.prisma.medicalEncounter.count({ where: { ...encounterWhere, status: 'escalated' } }),
      this.prisma.medicalRecord.count({
        where: { status: 'awaiting_signature', encounterId: { in: encounterIds } },
      }),
      this.prisma.clinicalAlert.count({
        where: { patientId: { in: patientIds }, status: { not: 'resolved' } },
      }),
      this.prisma.notification.count({
        where: {
          status: 'failed',
          ...(this.roles(p).has('super_administrator')
            ? {}
            : {
                OR: [
                  { relatedPatientId: { in: patientIds } },
                  { relatedEncounterId: { in: encounterIds } },
                ],
              }),
        },
      }),
      this.prisma.integrationConnection.count({ where: { status: { not: 'healthy' } } }),
    ]);
    return {
      data: {
        activeEncounters,
        awaitingDoctorReview,
        emergencyEncounters,
        overdueSlaTasks,
        recordsAwaitingSignature,
        openCrmAlerts,
        failedNotifications,
        unhealthyIntegrations,
      },
    };
  }

  async presign(
    p: AuthenticatedPrincipal,
    dto: { fileName: string; contentType: string; context: string },
    c: RequestContext,
  ) {
    const allowed = ['clinical-document', 'progress-photo', 'avatar', 'intake-image'];
    if (!allowed.includes(dto.context))
      throw new ConflictAppError('VALIDATION_FAILED', 'Unsupported upload context.');
    const storageKey = `${p.userId}/${dto.context}/${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const row = await this.prisma.uploadObject.create({
      data: { ownerId: p.userId, ...dto, storageKey, expiresAt },
    });
    const storage = this.config.get('storage', { infer: true });
    const uploadUrl = `${(storage.endpoint ?? '').replace(/\/$/, '')}/${storage.bucket}/${storageKey}`;
    await this.log(p, 'upload.presigned', 'upload_object', row.id, c);
    return { data: { fileId: row.id, uploadUrl, expiresAt } };
  }
  async confirmUpload(p: AuthenticatedPrincipal, id: string, fileHash: string, c: RequestContext) {
    if (!/^[a-f0-9]{64}$/i.test(fileHash))
      throw new ConflictAppError('VALIDATION_FAILED', 'fileHash must be a SHA-256 hex digest.');
    const row = await this.prisma.uploadObject.findFirst({ where: { id, ownerId: p.userId } });
    if (!row) throw new NotFoundAppError('Upload not found.');
    if (row.expiresAt < new Date())
      throw new ConflictAppError('UPLOAD_EXPIRED', 'Upload URL expired.');
    const updated = await this.prisma.uploadObject.update({
      where: { id },
      data: { fileHash: fileHash.toLowerCase(), status: 'confirmed', confirmedAt: new Date() },
    });
    await this.log(p, 'upload.confirmed', 'upload_object', id, c);
    return { data: updated };
  }
  async supportTicket(
    p: AuthenticatedPrincipal,
    topic: string,
    message: string,
    c: RequestContext,
  ) {
    const row = await this.prisma.supportTicket.create({
      data: { userId: p.userId, topic, message },
    });
    await this.log(p, 'support_ticket.created', 'support_ticket', row.id, c);
    return { data: row };
  }

  async reminders(p: AuthenticatedPrincipal, patientId: string) {
    await this.patient(p, patientId);
    return {
      data: await this.prisma.medicationReminder.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }
  async addReminder(
    p: AuthenticatedPrincipal,
    patientId: string,
    dto: { prescriptionId?: string; medicationName: string; schedule: unknown },
    c: RequestContext,
  ) {
    await this.patient(p, patientId);
    const row = await this.prisma.medicationReminder.create({
      data: {
        patientId,
        prescriptionId: dto.prescriptionId,
        medicationName: dto.medicationName,
        schedule: dto.schedule as Prisma.InputJsonValue,
      },
    });
    await this.log(p, 'medication_reminder.created', 'medication_reminder', row.id, c, patientId);
    return { data: row };
  }
  async reminderTaken(p: AuthenticatedPrincipal, id: string, c: RequestContext) {
    const row = await this.prisma.medicationReminder.findUnique({ where: { id } });
    if (!row) throw new NotFoundAppError('Reminder not found.');
    await this.patient(p, row.patientId);
    const updated = await this.prisma.medicationReminder.update({
      where: { id },
      data: { takenAt: new Date() },
    });
    await this.log(p, 'medication_reminder.taken', 'medication_reminder', id, c, row.patientId);
    return { data: updated };
  }
  async requestRefill(
    p: AuthenticatedPrincipal,
    prescriptionId: string,
    reason: string | undefined,
    c: RequestContext,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!prescription) throw new NotFoundAppError('Prescription not found.');
    const encounter = await this.encounters.findVisibleById(p, prescription.encounterId);
    if (!encounter) throw new NotFoundAppError('Prescription not found.');
    const existing = await this.prisma.prescriptionRefillRequest.findFirst({
      where: { prescriptionId, patientId: encounter.patientId, status: 'requested' },
    });
    if (existing) return { data: existing };
    const row = await this.prisma.prescriptionRefillRequest.create({
      data: { prescriptionId, patientId: encounter.patientId, requestedBy: p.userId, reason },
    });
    await this.log(
      p,
      'prescription.refill_requested',
      'prescription_refill_request',
      row.id,
      c,
      encounter.patientId,
    );
    return { data: row };
  }
  async addProgressPhoto(
    p: AuthenticatedPrincipal,
    patientId: string,
    dto: { fileId: string; takenAt: string; note?: string },
    c: RequestContext,
  ) {
    await this.patient(p, patientId);
    const upload = await this.prisma.uploadObject.findFirst({
      where: { id: dto.fileId, ownerId: p.userId, status: 'confirmed', context: 'progress-photo' },
    });
    if (!upload)
      throw new ConflictAppError(
        'VALIDATION_FAILED',
        'A confirmed progress-photo upload is required.',
      );
    const row = await this.prisma.progressPhoto.create({
      data: { patientId, fileId: dto.fileId, takenAt: new Date(dto.takenAt), note: dto.note },
    });
    await this.log(p, 'progress_photo.created', 'progress_photo', row.id, c, patientId);
    return { data: row };
  }
  async healthSummary(p: AuthenticatedPrincipal, patientId: string) {
    await this.patient(p, patientId);
    const photoCount = await this.prisma.progressPhoto.count({ where: { patientId } });
    return {
      data: {
        score: null,
        treatmentProgress: null,
        riskLevel: 'not_assessed',
        dataAvailability: { progressPhotos: photoCount, clinicalScoringModel: false },
        notice: 'Clinical scoring formula has not been approved; no score is fabricated.',
      },
    };
  }
  async healthHistory(p: AuthenticatedPrincipal, patientId: string) {
    await this.patient(p, patientId);
    const data = await this.prisma.progressPhoto.findMany({
      where: { patientId },
      orderBy: { takenAt: 'asc' },
      select: { id: true, takenAt: true, aiScore: true },
    });
    return { data };
  }
  async report(p: AuthenticatedPrincipal, patientId: string, type: string) {
    await this.patient(p, patientId);
    if (type === 'overview') {
      const [appointments, encounters] = await Promise.all([
        this.prisma.appointment.count({ where: { patientId, status: 'done' } }),
        this.prisma.medicalEncounter.count({ where: { patientId, status: 'closed' } }),
      ]);
      return { data: { completedAppointments: appointments, closedEncounters: encounters } };
    }
    if (type === 'treatment-history')
      return {
        data: await this.prisma.medicalEncounter.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
        }),
      };
    if (type === 'medicine-history') {
      const encounterIds = (
        await this.prisma.medicalEncounter.findMany({ where: { patientId }, select: { id: true } })
      ).map((row) => row.id);
      return {
        data: await this.prisma.prescription.findMany({
          where: { encounterId: { in: encounterIds } },
          orderBy: { issuedAt: 'desc' },
        }),
      };
    }
    if (type === 'ai-summary') {
      const rows = await this.prisma.aIPreliminaryAssessment.findMany({
        where: { encounter: { patientId } },
        orderBy: { generatedAt: 'desc' },
      });
      return {
        data: {
          assessments: rows,
          grade: null,
          notice: 'Aggregate clinical grade has not been approved.',
        },
      };
    }
    throw new NotFoundAppError('Report type not found.');
  }
  async exportReport(p: AuthenticatedPrincipal, patientId: string) {
    const overview = await this.report(p, patientId, 'overview');
    const payload = JSON.stringify({
      patientId,
      generatedAt: new Date().toISOString(),
      overview: overview.data,
    });
    return {
      data: {
        format: 'json',
        contentHash: createHash('sha256').update(payload).digest('hex'),
        content: JSON.parse(payload) as unknown,
      },
    };
  }
  async exportReportPdf(p: AuthenticatedPrincipal, patientId: string) {
    const report = await this.exportReport(p, patientId);
    const text =
      `DermaHealth Patient Report - Patient ${patientId} - Generated ${new Date().toISOString()} - Overview ${JSON.stringify(report.data.content)}`.replace(
        /[()\\]/g,
        (value) => `\\${value}`,
      );
    const body = `BT /F1 10 Tf 50 780 Td (${text}) Tj ET`;
    const objects = [
      `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
      `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj`,
      `4 0 obj << /Length ${Buffer.byteLength(body)} >> stream\n${body}\nendstream endobj`,
      `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => String(offset).padStart(10, '0') + ' 00000 n ')
      .join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
  }
  async deletionRequest(
    p: AuthenticatedPrincipal,
    userId: string,
    reason: string | undefined,
    c: RequestContext,
  ) {
    if (userId !== p.userId && !this.has(p, ['super_administrator']))
      throw new ForbiddenAppError('AUTH_FORBIDDEN');
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: 'requested' },
    });
    if (existing) return { data: existing };
    const row = await this.prisma.accountDeletionRequest.create({ data: { userId, reason } });
    await this.log(p, 'account_deletion.requested', 'account_deletion_request', row.id, c);
    return { data: row };
  }
}
