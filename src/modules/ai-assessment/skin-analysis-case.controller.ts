import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  ParseUUIDPipe,
  Req,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { Roles } from '../../common/authorization/roles.decorator';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { AnalyzeSkinCaseRequest } from './dto/analyze-skin-case.dto';
import { SkinAnalysisCaseResponseDto } from './dto/responses/skin-analysis-case-response.dto';
import { ReviewSkinCaseRequest } from './dto/review-skin-case.dto';
import { SkinAnalysisCaseService, SkinCaseFiles } from './skin-analysis-case.service';
import { IsOptional, IsUUID } from 'class-validator';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

class ListSkinCasesQuery {
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsUUID() encounterId?: string;
}

@ApiTags('ai-assessment')
@ApiBearerAuth()
@Controller({ path: 'ai/skin-analysis-cases', version: '1' })
export class SkinAnalysisCaseController {
  constructor(private readonly cases: SkinAnalysisCaseService) {}

  @Post()
  @RequireIdempotencyKey({ clinical: true })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: '[v2.8.1 NEW] Phân tích ca da liễu từ tối đa ba ảnh với Grad-CAM',
    description:
      'Close-up là ảnh bắt buộc. Grad-CAM thể hiện vùng ảnh ảnh hưởng đến prediction, không phải mask tổn thương hoặc bằng chứng chẩn đoán.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['closeup', 'bodyRegion', 'patientId'],
      properties: {
        overview: { type: 'string', format: 'binary' },
        closeup: { type: 'string', format: 'binary' },
        alternate: { type: 'string', format: 'binary' },
        bodyRegion: { type: 'string', maxLength: 100 },
        durationDays: { type: 'integer', minimum: 0, maximum: 36_500 },
        symptoms: {
          type: 'string',
          description: 'JSON string array, e.g. ["fever","rapid_spreading"]',
        },
        note: {
          type: 'string',
          maxLength: 500,
          description: 'Free-text clinical context consumed by the multimodal text encoder.',
        },
        patientId: { type: 'string', format: 'uuid' },
        encounterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOkEnvelope(SkinAnalysisCaseResponseDto)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'overview', maxCount: 1 },
        { name: 'closeup', maxCount: 1 },
        { name: 'alternate', maxCount: 1 },
      ],
      { limits: { files: 3, fileSize: MAX_IMAGE_BYTES, fields: 6, parts: 9 } },
    ),
  )
  analyze(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @UploadedFiles() files: SkinCaseFiles,
    @Body() dto: AnalyzeSkinCaseRequest,
    @Req() req: Request,
  ) {
    return this.cases.analyze(principal, files ?? {}, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Get()
  @Roles('doctor')
  @ApiOperation({ summary: 'Danh sách ca phân tích da bác sĩ được phép xem' })
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListSkinCasesQuery) {
    return this.cases.list(principal, query);
  }

  @Get(':caseId')
  @Roles('doctor')
  @ApiOperation({ summary: 'Chi tiết ảnh và kết quả AI phục vụ bác sĩ xem xét' })
  detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ) {
    return this.cases.detail(principal, caseId);
  }

  @Post(':caseId/review')
  @Roles('doctor')
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({
    summary: '[v2.8.1 NEW] Bác sĩ xác nhận hoặc bác bỏ kết quả phân tích ảnh da',
  })
  review(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: ReviewSkinCaseRequest,
    @Req() req: Request,
  ) {
    return this.cases.review(principal, caseId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
