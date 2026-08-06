import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { LifetimeMedicalRecordQuery } from './dto/lifetime-medical-record-query.dto';
import { LifetimeMedicalRecordResponseDto } from './dto/responses/lifetime-medical-record-response.dto';
import { LifetimeMedicalRecordService } from './lifetime-medical-record.service';
import { UpdateNarrativeDto } from './dto/update-narrative.dto';
import { CreateProblemEntryDto, UpdateProblemEntryDto } from './dto/create-problem-entry.dto';
import { CreateCurrentMedicationDto, UpdateCurrentMedicationDto } from './dto/create-current-medication.dto';

@ApiTags('patients')
@Controller({ path: 'patients/:patientId', version: '1' })
export class LifetimeMedicalRecordController {
  constructor(private readonly service: LifetimeMedicalRecordService) {}

  @ApiOperation({ summary: 'Cập nhật thông tin tự khai (narrative)' })
  @Put('narrative')
  @HttpCode(HttpStatus.OK)
  upsertNarrative(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdateNarrativeDto,
  ) {
    return this.service.upsertNarrative(principal, patientId, dto);
  }

  @ApiOperation({ summary: 'Bác sĩ thêm chẩn đoán vào danh sách vấn đề bền vững' })
  @Post('problem-list')
  @HttpCode(HttpStatus.CREATED)
  addProblemEntry(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateProblemEntryDto,
  ) {
    return this.service.addProblemEntry(principal, patientId, dto);
  }

  @ApiOperation({ summary: 'Cập nhật mục trong danh sách vấn đề' })
  @Put('problem-list/:entryId')
  @HttpCode(HttpStatus.OK)
  updateProblemEntry(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateProblemEntryDto,
  ) {
    return this.service.updateProblemEntry(principal, patientId, entryId, dto);
  }

  @ApiOperation({ summary: 'Bác sĩ thêm thuốc đang dùng thường xuyên' })
  @Post('current-medications')
  @HttpCode(HttpStatus.CREATED)
  addCurrentMedication(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateCurrentMedicationDto,
  ) {
    return this.service.addCurrentMedication(principal, patientId, dto);
  }

  @ApiOperation({ summary: 'Cập nhật thuốc đang dùng (kể cả ngừng thuốc)' })
  @Put('current-medications/:medicationId')
  @HttpCode(HttpStatus.OK)
  updateCurrentMedication(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: UpdateCurrentMedicationDto,
  ) {
    return this.service.updateCurrentMedication(principal, patientId, medicationId, dto);
  }

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
