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
  @Get('cxmSurvey/get') getSurvey(@Query('id') id: string) { return this.svc.getSurvey(id); }
  @Get('survey') statistic(@TenantId() t: string) { return this.svc.surveySummary(t); }
  @Post('cxmSurvey/update') upsert(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertSurvey(b, a); }
  @Delete('cxmSurvey/delete') delete(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteSurvey(id, a); }

  @Get('cxmQuestion/list') listQ(@Query('surveyId') surveyId: string) { return this.svc.listQuestions(surveyId); }
  @Get('cxmQuestion/get') getQ(@Query('id') id: string) { return this.svc.getQuestion(id); }
  @Post('cxmQuestion/update') upsertQ(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertQuestion(b, a); }
  @Delete('cxmQuestion/delete') deleteQ(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteQuestion(id, a); }

  @Get('cxmOption/list') listOpt(@Query('questionId') questionId: string) { return this.svc.listOptions(questionId); }
  @Get('cxmOption/get') getOpt(@Query('id') id: string) { return this.svc.getOption(id); }
  @Post('cxmOption/update') upsertOpt(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertOption(b, a); }
  @Delete('cxmOption/delete') deleteOpt(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteOption(id, a); }
}
