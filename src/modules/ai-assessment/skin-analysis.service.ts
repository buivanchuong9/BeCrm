import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../core/configuration/configuration';
import { AppError, ValidationAppError } from '../../core/errors/app-error';
import { SkinAnalysisResponseDto } from './dto/responses/skin-analysis-response.dto';

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class SkinAnalysisService {
  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  async analyze(file?: UploadedImage): Promise<{ data: SkinAnalysisResponseDto }> {
    if (!file) {
      throw new ValidationAppError([
        { field: 'file', code: 'VALIDATION_ERROR', message: 'Skin image is required.' },
      ]);
    }

    const ai = this.config.get('ai', { infer: true });
    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ai.timeoutMs);
    try {
      const response = await fetch(`${ai.serviceUrl}/v1/analyze`, {
        method: 'POST',
        headers: ai.apiKey ? { 'X-AI-API-Key': ai.apiKey } : undefined,
        body: form,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as
        | SkinAnalysisResponseDto
        | { detail?: string }
        | null;

      if (!response.ok) {
        const detail =
          body && 'detail' in body && typeof body.detail === 'string'
            ? body.detail
            : 'AI inference request failed.';
        const clientError = [400, 413, 415].includes(response.status);
        throw new AppError(
          clientError ? 'AI_IMAGE_REJECTED' : 'AI_SERVICE_UNAVAILABLE',
          detail,
          clientError ? HttpStatus.BAD_REQUEST : HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return { data: body as SkinAnalysisResponseDto };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new AppError(
        timedOut ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNAVAILABLE',
        timedOut
          ? 'AI analysis exceeded the configured timeout.'
          : 'AI inference service is unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
