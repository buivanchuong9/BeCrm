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
import { AnalyzeSkinCaseRequest } from './dto/analyze-skin-case.dto';
import { SkinAnalysisCaseResponseDto } from './dto/responses/skin-analysis-case-response.dto';
import { RequestContext } from './ai-assessment.service';
import { ReviewSkinCaseRequest } from './dto/review-skin-case.dto';

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
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
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
    const patient = dto.patientId
      ? await this.patients.findVisibleById(principal, dto.patientId)
      : null;
    if (dto.patientId && !patient) {
      throw new NotFoundAppError('Patient not found.');
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
      await this.prisma.aISkinAnalysisCase.create({
        data: {
          id: result.caseId,
          patientId: patient?.id ?? null,
          actorId: principal.userId,
          organizationId:
            patient?.organizationId ?? principal.memberships[0]?.organizationId ?? null,
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
                  targetLayer: image.heatmap.targetLayer,
                  targetClassIndex: image.heatmap.targetClassIndex,
                  allZero: image.heatmap.allZero,
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
      await this.audit.write({
        actorId: principal.userId,
        action: 'ai.skin_analysis_case.generated',
        resourceType: 'ai_skin_analysis_case',
        resourceId: result.caseId,
        patientId: patient?.id ?? null,
        organizationId: patient?.organizationId ?? principal.memberships[0]?.organizationId ?? null,
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
      });
      return { data: result };
    } catch (error) {
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
}
