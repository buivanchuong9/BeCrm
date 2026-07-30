import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { AppConfiguration } from '../../core/configuration/configuration';
import { PrismaService } from '../../core/database/prisma.service';
import {
  AppError,
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { PatientsRepository } from '../patients/patients.repository';
import { EncountersRepository } from '../encounters/encounters.repository';
import {
  isSuperAdministrator,
  viewOrgWideOrganizationIds,
} from '../patients/policies/patient-policies';
import { AnalyzeSkinCaseRequest } from './dto/analyze-skin-case.dto';
import { SkinAnalysisCaseResponseDto } from './dto/responses/skin-analysis-case-response.dto';
import { RequestContext } from './ai-assessment.service';
import { ReviewSkinCaseRequest } from './dto/review-skin-case.dto';
import { AiEntitlementsService } from '../ai-entitlements/ai-entitlements.service';

export type SkinImageRole = 'overview' | 'closeup' | 'alternate';
export interface SkinCaseFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}
export type SkinCaseFiles = Partial<Record<SkinImageRole, SkinCaseFile[]>>;

@Injectable()
export class SkinAnalysisCaseService {
  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly patients: PatientsRepository,
    private readonly encounters: EncountersRepository,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly entitlements: AiEntitlementsService,
  ) {}

  async analyze(
    principal: AuthenticatedPrincipal,
    files: SkinCaseFiles,
    dto: AnalyzeSkinCaseRequest,
    context: RequestContext,
  ): Promise<{ data: SkinAnalysisCaseResponseDto }> {
    const closeup = files.closeup?.[0];
    if (!closeup) {
      throw new ValidationAppError([
        { field: 'closeup', code: 'VALIDATION_ERROR', message: 'Close-up image is required.' },
      ]);
    }

    const symptoms = this.parseSymptoms(dto.symptoms);
    const patient = await this.patients.findVisibleById(principal, dto.patientId);
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }
    const encounter = dto.encounterId
      ? await this.encounters.findVisibleById(principal, dto.encounterId)
      : null;
    if (dto.encounterId && !encounter) {
      throw new NotFoundAppError('Encounter not found.');
    }
    if (encounter && encounter.patientId !== patient.id) {
      throw new ValidationAppError([
        {
          field: 'encounterId',
          code: 'VALIDATION_ERROR',
          message: 'Encounter must belong to the selected patient.',
        },
      ]);
    }

    const ai = this.config.get('ai', { infer: true });
    const form = new FormData();
    for (const role of ['overview', 'closeup', 'alternate'] as const) {
      const file = files[role]?.[0];
      if (file) {
        form.append(role, new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      }
    }
    form.append('bodyRegion', dto.bodyRegion);
    if (dto.durationDays !== undefined) {
      form.append('durationDays', String(dto.durationDays));
    }
    form.append('symptoms', JSON.stringify(symptoms));
    if (dto.note?.trim()) {
      form.append('note', dto.note.trim());
    }

    const reservation = await this.entitlements.reserve(
      patient.id,
      principal.userId,
      context.requestId,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ai.timeoutMs);
    try {
      const response = await fetch(`${ai.serviceUrl}/v1/analyze-case`, {
        method: 'POST',
        headers: {
          ...(ai.apiKey ? { 'X-AI-API-Key': ai.apiKey } : {}),
          ...(context.requestId ? { 'X-Request-Id': context.requestId } : {}),
        },
        body: form,
        signal: controller.signal,
      });
      const declaredLength = Number(response.headers.get('content-length') ?? 0);
      if (declaredLength > ai.maxResponseBytes) {
        throw new AppError(
          'AI_RESPONSE_TOO_LARGE',
          'AI response exceeded the configured limit.',
          HttpStatus.BAD_GATEWAY,
        );
      }
      const rawBody = await response.text();
      if (Buffer.byteLength(rawBody) > ai.maxResponseBytes) {
        throw new AppError(
          'AI_RESPONSE_TOO_LARGE',
          'AI response exceeded the configured limit.',
          HttpStatus.BAD_GATEWAY,
        );
      }
      const body = this.parseResponse(rawBody);
      if (!response.ok) {
        const detail =
          body && 'detail' in body && typeof body.detail === 'string'
            ? body.detail
            : 'AI case analysis failed.';
        const clientError = [400, 413, 415, 422].includes(response.status);
        throw new AppError(
          clientError ? 'AI_IMAGE_REJECTED' : 'AI_SERVICE_UNAVAILABLE',
          detail,
          clientError ? HttpStatus.BAD_REQUEST : HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const result = body as unknown as SkinAnalysisCaseResponseDto;
      const artifacts = result.images.flatMap((image) => {
        const rows: Array<{
          role: string;
          kind: string;
          mimeType: string;
          width: number;
          height: number;
          content: Buffer;
        }> = [];
        if (image.original?.dataUrl) {
          rows.push({
            role: image.role,
            kind: 'review_original',
            mimeType: image.original.mimeType,
            width: image.original.width,
            height: image.original.height,
            content: this.decodeReviewArtifact(image.original.dataUrl, 'image/jpeg'),
          });
        }
        if (image.heatmap?.dataUrl) {
          rows.push({
            role: image.role,
            kind: 'heatmap',
            mimeType: image.heatmap.mimeType,
            width: image.heatmap.width,
            height: image.heatmap.height,
            content: this.decodeReviewArtifact(image.heatmap.dataUrl, 'image/png'),
          });
        }
        return rows;
      });
      const totalArtifactBytes = artifacts.reduce((total, item) => total + item.content.length, 0);
      if (totalArtifactBytes > 5 * 1024 * 1024) {
        throw new AppError(
          'AI_RESPONSE_TOO_LARGE',
          'AI review artifacts exceeded the configured limit.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.aISkinAnalysisCase.create({
          data: {
            id: result.caseId,
            patientId: patient.id,
            encounterId: encounter?.id ?? null,
            actorId: principal.userId,
            organizationId: patient.organizationId,
            status: result.status,
            bodyRegion: dto.bodyRegion,
            durationDays: dto.durationDays ?? null,
            symptomSnapshot: symptoms,
            imageMetadata: result.images.map((image) => ({
              role: image.role,
              width: image.width,
              height: image.height,
              quality: image.quality,
              predictions: image.predictions,
              heatmap: image.heatmap
                ? {
                    method: image.heatmap.method,
                    targetClassIndex: image.heatmap.targetClassIndex,
                    allZero: image.heatmap.allZero,
                    attention: image.heatmap.attention,
                  }
                : null,
            })) as unknown as Prisma.InputJsonValue,
            aggregateOutput: result.aggregate as unknown as Prisma.InputJsonValue,
            triageOutput: result.triage as unknown as Prisma.InputJsonValue,
            modelVersion: result.modelVersion,
            labelsVersion: result.labelsVersion,
            preprocessingVersion: result.preprocessingVersion,
            labelsConfigured: result.labelsConfigured,
            generatedAt: new Date(result.generatedAt),
          },
        });
        if (artifacts.length) {
          await tx.aISkinAnalysisArtifact.createMany({
            data: artifacts.map((artifact) => ({ caseId: result.caseId, ...artifact })),
          });
        }
        await this.entitlements.completeInTransaction(
          tx,
          reservation.id,
          result.caseId,
          new Date(),
        );
        await this.audit.write(
          {
            actorId: principal.userId,
            action: 'ai.skin_analysis_case.generated',
            resourceType: 'ai_skin_analysis_case',
            resourceId: result.caseId,
            patientId: patient.id,
            organizationId: patient.organizationId,
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
            result: 'success',
            sourceModule: 'ai-assessment',
            afterRedacted: {
              status: result.status,
              imageRoles: result.images.map((image) => image.role),
              modelVersion: result.modelVersion,
              labelsVersion: result.labelsVersion,
              labelsConfigured: result.labelsConfigured,
              abstainReasons: result.aggregate.abstainReasons,
            } as Prisma.InputJsonValue,
          },
          tx,
        );
      });
      return { data: result };
    } catch (error) {
      await this.entitlements
        .release(reservation.id, error instanceof AppError ? error.code : 'ai_analysis_failed')
        .catch(() => undefined);
      if (error instanceof AppError) throw error;
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new AppError(
        timedOut ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNAVAILABLE',
        timedOut
          ? 'AI case analysis exceeded the configured timeout.'
          : 'AI inference service is unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async list(
    principal: AuthenticatedPrincipal,
    filters: { patientId?: string; encounterId?: string },
  ) {
    if (filters.patientId && !(await this.patients.findVisibleById(principal, filters.patientId))) {
      throw new NotFoundAppError('Patient not found.');
    }
    if (
      filters.encounterId &&
      !(await this.encounters.findVisibleById(principal, filters.encounterId))
    ) {
      throw new NotFoundAppError('Encounter not found.');
    }

    const orgWideIds = viewOrgWideOrganizationIds(principal);
    const patientVisibility: Prisma.PatientWhereInput = isSuperAdministrator(principal)
      ? {}
      : {
          OR: [
            { userId: principal.userId },
            { primaryDoctorId: principal.userId },
            {
              careTeam: {
                some: {
                  userId: principal.userId,
                  OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
                },
              },
            },
            ...(orgWideIds.length ? [{ organizationId: { in: orgWideIds } }] : []),
          ],
        };
    const rows = await this.prisma.aISkinAnalysisCase.findMany({
      where: {
        patientId: { not: null },
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.encounterId ? { encounterId: filters.encounterId } : {}),
        patient: { is: patientVisibility },
      },
      include: {
        patient: { select: { id: true, code: true, userId: true, name: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    });
    return {
      data: rows.map((row) => ({
        caseId: row.id,
        encounterId: row.encounterId,
        patient: row.patient,
        status: row.status,
        bodyRegion: row.bodyRegion,
        generatedAt: row.generatedAt.toISOString(),
        triage: row.triageOutput,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        reviewerDecision: row.reviewerDecision,
        reviewerDiagnosis: row.reviewerDiagnosis,
      })),
    };
  }

  async detail(principal: AuthenticatedPrincipal, caseId: string) {
    const row = await this.prisma.aISkinAnalysisCase.findUnique({
      where: { id: caseId },
      include: {
        patient: { select: { id: true, code: true, userId: true, name: true } },
        artifacts: true,
      },
    });
    if (
      !row ||
      !row.patientId ||
      !(await this.patients.findVisibleById(principal, row.patientId))
    ) {
      throw new NotFoundAppError('Skin analysis case not found.');
    }

    const metadata = Array.isArray(row.imageMetadata)
      ? (row.imageMetadata as Array<Record<string, unknown>>)
      : [];
    const images = metadata.map((image) => {
      const role = typeof image.role === 'string' ? image.role : '';
      const original = row.artifacts.find(
        (artifact) => artifact.role === role && artifact.kind === 'review_original',
      );
      const heatmapArtifact = row.artifacts.find(
        (artifact) => artifact.role === role && artifact.kind === 'heatmap',
      );
      const heatmapMetadata =
        image.heatmap && typeof image.heatmap === 'object'
          ? (image.heatmap as Record<string, unknown>)
          : null;
      return {
        ...image,
        original: original
          ? {
              width: original.width,
              height: original.height,
              mimeType: original.mimeType,
              dataUrl: this.toDataUrl(original.mimeType, original.content),
            }
          : null,
        heatmap: heatmapArtifact
          ? {
              ...heatmapMetadata,
              width: heatmapArtifact.width,
              height: heatmapArtifact.height,
              mimeType: heatmapArtifact.mimeType,
              dataUrl: this.toDataUrl(heatmapArtifact.mimeType, heatmapArtifact.content),
            }
          : heatmapMetadata,
      };
    });

    return {
      data: {
        caseId: row.id,
        encounterId: row.encounterId,
        patient: row.patient,
        status: row.status,
        bodyRegion: row.bodyRegion,
        durationDays: row.durationDays,
        symptoms: row.symptomSnapshot,
        generatedAt: row.generatedAt.toISOString(),
        images,
        aggregate: row.aggregateOutput,
        triage: row.triageOutput,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        reviewerDecision: row.reviewerDecision,
        reviewerDiagnosis: row.reviewerDiagnosis,
        reviewerNote: row.reviewerNote,
      },
    };
  }

  async review(
    principal: AuthenticatedPrincipal,
    caseId: string,
    dto: ReviewSkinCaseRequest,
    context: RequestContext,
  ) {
    const row = await this.prisma.aISkinAnalysisCase.findUnique({ where: { id: caseId } });
    if (!row) throw new NotFoundAppError('Skin analysis case not found.');
    if (row.patientId && !(await this.patients.findVisibleById(principal, row.patientId))) {
      throw new NotFoundAppError('Skin analysis case not found.');
    }
    if (dto.decision === 'different_diagnosis' && !dto.diagnosis?.trim()) {
      throw new ValidationAppError([
        {
          field: 'diagnosis',
          code: 'VALIDATION_ERROR',
          message: 'Diagnosis is required when selecting a different diagnosis.',
        },
      ]);
    }
    if (dto.decision !== 'accepted' && !dto.note?.trim()) {
      throw new ValidationAppError([
        {
          field: 'note',
          code: 'VALIDATION_ERROR',
          message: 'A review note is required unless the result is accepted.',
        },
      ]);
    }

    const updated = await this.prisma.aISkinAnalysisCase.updateMany({
      where: { id: caseId, reviewedAt: null },
      data: {
        reviewerDecision: dto.decision,
        reviewerDiagnosis: dto.diagnosis?.trim() ?? null,
        reviewerNote: dto.note?.trim() ?? null,
        reviewedBy: principal.userId,
        reviewedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new ConflictAppError('ALREADY_REVIEWED', 'Skin analysis case was already reviewed.');
    }
    const result = await this.prisma.aISkinAnalysisCase.findUniqueOrThrow({
      where: { id: caseId },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'ai.skin_analysis_case.reviewed',
      resourceType: 'ai_skin_analysis_case',
      resourceId: caseId,
      patientId: row.patientId,
      organizationId: row.organizationId,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      result: 'success',
      sourceModule: 'ai-assessment',
      afterRedacted: {
        decision: dto.decision,
        hasAlternativeDiagnosis: !!dto.diagnosis,
        hasNote: !!dto.note,
      },
    });
    return { data: result };
  }

  private parseSymptoms(value?: string): string[] {
    if (!value) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new ValidationAppError([
        {
          field: 'symptoms',
          code: 'VALIDATION_ERROR',
          message: 'Symptoms must be a JSON string array.',
        },
      ]);
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length > 30 ||
      !parsed.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 100)
    ) {
      throw new ValidationAppError([
        {
          field: 'symptoms',
          code: 'VALIDATION_ERROR',
          message: 'Symptoms must contain at most 30 non-empty strings.',
        },
      ]);
    }
    return [...new Set(parsed.map((item) => item.trim().toLowerCase()))];
  }

  private parseResponse(rawBody: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(rawBody);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      throw new AppError(
        'AI_INVALID_RESPONSE',
        'AI service returned an invalid response.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private decodeReviewArtifact(dataUrl: string, expectedMimeType: string): Buffer {
    const match = /^data:(image\/(?:jpeg|png));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match || match[1] !== expectedMimeType) {
      throw new AppError(
        'AI_INVALID_RESPONSE',
        'AI service returned an invalid review image.',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return Buffer.from(match[2], 'base64');
  }

  private toDataUrl(mimeType: string, content: Uint8Array): string {
    return `data:${mimeType};base64,${Buffer.from(content).toString('base64')}`;
  }
}
