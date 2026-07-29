import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { LifetimeMedicalRecordQuery } from './dto/lifetime-medical-record-query.dto';
import { LifetimeMedicalRecordResponseDto } from './dto/responses/lifetime-medical-record-response.dto';
import { LifetimeMedicalRecordService } from './lifetime-medical-record.service';

@ApiTags('patients')
@Controller({ path: 'patients/:patientId', version: '1' })
export class LifetimeMedicalRecordController {
  constructor(private readonly service: LifetimeMedicalRecordService) {}

  @ApiOperation({
    summary:
      '🆕 Mới trong v2.7.1 — Hồ sơ bệnh án trọn đời (dòng thời gian hợp nhất trong tổ chức hiện tại)',
  })
  @ApiOkEnvelope(LifetimeMedicalRecordResponseDto)
  @Get('lifetime-medical-record')
  @Header('Cache-Control', 'private, no-store')
  async get(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: LifetimeMedicalRecordQuery,
    @Req() req: Request,
  ) {
    return this.service.get(principal, patientId, query, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
