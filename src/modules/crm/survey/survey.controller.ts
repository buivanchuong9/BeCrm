import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SurveyService } from './survey.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('survey')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class SurveyController {
  constructor(private svc: SurveyService) {}

  @Get('cxmSurvey/list') list(@TenantId() t: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listSurveys(t, Number(p ?? 1), Number(l ?? 20)); }
  @Post('cxmSurvey/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSurvey(b, a); }
  @Delete('cxmSurvey/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSurvey(id, a); }

  @Post('cxmQuestion/update') upsertQ(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertQuestion(b, a); }
  @Delete('cxmQuestion/delete') deleteQ(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteQuestion(id, a); }

  @Post('cxmOption/update') upsertOpt(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertOption(b, a); }
  @Delete('cxmOption/delete') deleteOpt(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteOption(id, a); }
}
