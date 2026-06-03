import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BpmNodeService } from './bpm-node.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

// All BPMN node types that use the same get/update/clone pattern
const BPM_NODE_TYPES = [
  'compensationEndEvent', 'compensationIntermediateThrowEvent', 'complexGateway',
  'conditionalCatchEventTask', 'conditionalStartEventTask', 'endTask', 'errorEndEvent',
  'errorStartEvent', 'escalationStartEventTask', 'escalationThrowTask', 'exclusiveGateway',
  'inclusiveGateway', 'linkCatchEvent', 'linkEvent', 'manualTask', 'messageEndEvent',
  'messageIntermediateCatchEvent', 'messageIntermediateThrowEvent', 'messageStartEvent',
  'parallelGateway', 'receiveTask', 'scriptTask', 'sendTask', 'serviceTask',
  'signalCatchEvent', 'signalEndEvent', 'signalStartEvent', 'signalThrowEvent',
  'startTask', 'subprocess', 'terminateEndEvent', 'timerIntermediate', 'timerTask',
  'userTask', 'callActivity', 'businessRuleTask',
];

@ApiTags('bpm-nodes')
@ApiBearerAuth('JWT')
@Controller('bpmapi')
export class BpmNodeController {
  constructor(private svc: BpmNodeService) {}

  // ── Dynamic node type handler ─────────────────────────────────────────────
  // Each BPMN node type follows: GET /bpmapi/{nodeType}/get, POST /bpmapi/{nodeType}/update, POST /bpmapi/{nodeType}/clone

  @Get('compensationEndEvent/get') getCompensationEnd(@Query('id') id: string) { return this.svc.getNode('compensationEndEvent', id); }
  @Post('compensationEndEvent/update') upsertCompensationEnd(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('compensationEndEvent', b, a); }
  @Post('compensationEndEvent/clone') cloneCompensationEnd(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('compensationEndEvent', id, a); }
  @Delete('compensationEndEvent/delete') deleteCompensationEnd(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteNode(id, a); }

  @Get('compensationIntermediateThrowEvent/get') getCIT(@Query('id') id: string) { return this.svc.getNode('compensationIntermediateThrowEvent', id); }
  @Post('compensationIntermediateThrowEvent/update') upsertCIT(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('compensationIntermediateThrowEvent', b, a); }
  @Post('compensationIntermediateThrowEvent/clone') cloneCIT(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('compensationIntermediateThrowEvent', id, a); }

  @Get('complexGateway/get') getComplexGW(@Query('id') id: string) { return this.svc.getNode('complexGateway', id); }
  @Post('complexGateway/update') upsertComplexGW(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('complexGateway', b, a); }
  @Post('complexGateway/clone') cloneComplexGW(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('complexGateway', id, a); }

  @Get('conditionalCatchEventTask/get') getConditionalCatch(@Query('id') id: string) { return this.svc.getNode('conditionalCatchEventTask', id); }
  @Post('conditionalCatchEventTask/update') upsertConditionalCatch(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('conditionalCatchEventTask', b, a); }

  @Get('conditionalStartEventTask/get') getConditionalStart(@Query('id') id: string) { return this.svc.getNode('conditionalStartEventTask', id); }
  @Post('conditionalStartEventTask/update') upsertConditionalStart(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('conditionalStartEventTask', b, a); }

  @Get('endTask/get') getEndTask(@Query('id') id: string) { return this.svc.getNode('endTask', id); }
  @Post('endTask/update') upsertEndTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('endTask', b, a); }
  @Post('endTask/clone') cloneEndTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('endTask', id, a); }

  @Get('errorEndEvent/get') getErrorEnd(@Query('id') id: string) { return this.svc.getNode('errorEndEvent', id); }
  @Post('errorEndEvent/update') upsertErrorEnd(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('errorEndEvent', b, a); }
  @Post('errorEndEvent/clone') cloneErrorEnd(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('errorEndEvent', id, a); }

  @Get('errorStartEvent/get') getErrorStart(@Query('id') id: string) { return this.svc.getNode('errorStartEvent', id); }
  @Post('errorStartEvent/update') upsertErrorStart(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('errorStartEvent', b, a); }
  @Post('errorStartEvent/clone') cloneErrorStart(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('errorStartEvent', id, a); }

  @Get('escalationStartEventTask/get') getEscalationStart(@Query('id') id: string) { return this.svc.getNode('escalationStartEventTask', id); }
  @Post('escalationStartEventTask/update') upsertEscalationStart(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('escalationStartEventTask', b, a); }
  @Post('escalationStartEventTask/clone') cloneEscalationStart(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('escalationStartEventTask', id, a); }

  @Get('escalationThrowTask/get') getEscalationThrow(@Query('id') id: string) { return this.svc.getNode('escalationThrowTask', id); }
  @Post('escalationThrowTask/update') upsertEscalationThrow(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('escalationThrowTask', b, a); }
  @Post('escalationThrowTask/clone') cloneEscalationThrow(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('escalationThrowTask', id, a); }

  @Get('exclusiveGateway/get') getExclusiveGW(@Query('id') id: string) { return this.svc.getNode('exclusiveGateway', id); }
  @Post('exclusiveGateway/update') upsertExclusiveGW(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('exclusiveGateway', b, a); }
  @Post('exclusiveGateway/clone') cloneExclusiveGW(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('exclusiveGateway', id, a); }

  @Get('inclusiveGateway/get') getInclusiveGW(@Query('id') id: string) { return this.svc.getNode('inclusiveGateway', id); }
  @Post('inclusiveGateway/update') upsertInclusiveGW(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('inclusiveGateway', b, a); }
  @Post('inclusiveGateway/clone') cloneInclusiveGW(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('inclusiveGateway', id, a); }

  @Get('linkCatchEvent/get') getLinkCatch(@Query('id') id: string) { return this.svc.getNode('linkCatchEvent', id); }
  @Post('linkCatchEvent/update') upsertLinkCatch(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('linkCatchEvent', b, a); }
  @Post('linkCatchEvent/clone') cloneLinkCatch(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('linkCatchEvent', id, a); }

  @Get('linkEvent/get') getLinkEvent(@Query('id') id: string) { return this.svc.getNode('linkEvent', id); }
  @Post('linkEvent/update') upsertLinkEvent(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('linkEvent', b, a); }
  @Post('linkEvent/clone') cloneLinkEvent(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('linkEvent', id, a); }

  @Get('manualTask/get') getManualTask(@Query('id') id: string) { return this.svc.getNode('manualTask', id); }
  @Post('manualTask/update') upsertManualTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('manualTask', b, a); }
  @Post('manualTask/clone') cloneManualTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('manualTask', id, a); }

  @Get('messageEndEvent/get') getMsgEnd(@Query('id') id: string) { return this.svc.getNode('messageEndEvent', id); }
  @Post('messageEndEvent/update') upsertMsgEnd(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('messageEndEvent', b, a); }
  @Post('messageEndEvent/clone') cloneMsgEnd(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('messageEndEvent', id, a); }

  @Get('messageIntermediateCatchEvent/get') getMIC(@Query('id') id: string) { return this.svc.getNode('messageIntermediateCatchEvent', id); }
  @Post('messageIntermediateCatchEvent/update') upsertMIC(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('messageIntermediateCatchEvent', b, a); }
  @Post('messageIntermediateCatchEvent/clone') cloneMIC(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('messageIntermediateCatchEvent', id, a); }

  @Get('messageIntermediateThrowEvent/get') getMIT(@Query('id') id: string) { return this.svc.getNode('messageIntermediateThrowEvent', id); }
  @Post('messageIntermediateThrowEvent/update') upsertMIT(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('messageIntermediateThrowEvent', b, a); }
  @Post('messageIntermediateThrowEvent/clone') cloneMIT(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('messageIntermediateThrowEvent', id, a); }

  @Get('messageStartEvent/get') getMsgStart(@Query('id') id: string) { return this.svc.getNode('messageStartEvent', id); }
  @Post('messageStartEvent/update') upsertMsgStart(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('messageStartEvent', b, a); }
  @Post('messageStartEvent/clone') cloneMsgStart(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('messageStartEvent', id, a); }

  @Get('parallelGateway/get') getParallelGW(@Query('id') id: string) { return this.svc.getNode('parallelGateway', id); }
  @Post('parallelGateway/update') upsertParallelGW(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('parallelGateway', b, a); }
  @Post('parallelGateway/clone') cloneParallelGW(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('parallelGateway', id, a); }

  @Get('receiveTask/get') getReceiveTask(@Query('id') id: string) { return this.svc.getNode('receiveTask', id); }
  @Post('receiveTask/update') upsertReceiveTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('receiveTask', b, a); }
  @Post('receiveTask/clone') cloneReceiveTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('receiveTask', id, a); }

  @Get('scriptTask/get') getScriptTask(@Query('id') id: string) { return this.svc.getNode('scriptTask', id); }
  @Post('scriptTask/update') upsertScriptTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('scriptTask', b, a); }
  @Post('scriptTask/clone') cloneScriptTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('scriptTask', id, a); }

  @Get('sendTask/get') getSendTask(@Query('id') id: string) { return this.svc.getNode('sendTask', id); }
  @Post('sendTask/update') upsertSendTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('sendTask', b, a); }
  @Post('sendTask/clone') cloneSendTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('sendTask', id, a); }

  @Get('serviceTask/get') getServiceTask(@Query('id') id: string) { return this.svc.getNode('serviceTask', id); }
  @Post('serviceTask/update') upsertServiceTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('serviceTask', b, a); }
  @Post('serviceTask/clone') cloneServiceTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('serviceTask', id, a); }

  @Get('signalCatchEvent/get') getSigCatch(@Query('id') id: string) { return this.svc.getNode('signalCatchEvent', id); }
  @Post('signalCatchEvent/update') upsertSigCatch(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('signalCatchEvent', b, a); }
  @Post('signalCatchEvent/clone') cloneSigCatch(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('signalCatchEvent', id, a); }

  @Get('signalEndEvent/get') getSigEnd(@Query('id') id: string) { return this.svc.getNode('signalEndEvent', id); }
  @Post('signalEndEvent/update') upsertSigEnd(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('signalEndEvent', b, a); }
  @Post('signalEndEvent/clone') cloneSigEnd(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('signalEndEvent', id, a); }

  @Get('signalStartEvent/get') getSigStart(@Query('id') id: string) { return this.svc.getNode('signalStartEvent', id); }
  @Post('signalStartEvent/update') upsertSigStart(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('signalStartEvent', b, a); }
  @Post('signalStartEvent/clone') cloneSigStart(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('signalStartEvent', id, a); }

  @Get('signalThrowEvent/get') getSigThrow(@Query('id') id: string) { return this.svc.getNode('signalThrowEvent', id); }
  @Post('signalThrowEvent/update') upsertSigThrow(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('signalThrowEvent', b, a); }
  @Post('signalThrowEvent/clone') cloneSigThrow(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('signalThrowEvent', id, a); }

  @Get('startTask/get') getStartTask(@Query('id') id: string) { return this.svc.getNode('startTask', id); }
  @Post('startTask/update') upsertStartTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('startTask', b, a); }
  @Post('startTask/clone') cloneStartTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('startTask', id, a); }

  @Get('subprocess/get') getSubprocess(@Query('id') id: string) { return this.svc.getNode('subprocess', id); }
  @Post('subprocess/update') upsertSubprocess(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('subprocess', b, a); }
  @Post('subprocess/clone') cloneSubprocess(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('subprocess', id, a); }

  @Get('terminateEndEvent/get') getTerminateEnd(@Query('id') id: string) { return this.svc.getNode('terminateEndEvent', id); }
  @Post('terminateEndEvent/update') upsertTerminateEnd(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('terminateEndEvent', b, a); }
  @Post('terminateEndEvent/clone') cloneTerminateEnd(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('terminateEndEvent', id, a); }

  @Get('timerIntermediate/get') getTimerInter(@Query('id') id: string) { return this.svc.getNode('timerIntermediate', id); }
  @Post('timerIntermediate/update') upsertTimerInter(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('timerIntermediate', b, a); }
  @Post('timerIntermediate/clone') cloneTimerInter(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('timerIntermediate', id, a); }

  @Get('timerTask/get') getTimerTask(@Query('id') id: string) { return this.svc.getNode('timerTask', id); }
  @Post('timerTask/update') upsertTimerTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('timerTask', b, a); }
  @Post('timerTask/clone') cloneTimerTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('timerTask', id, a); }

  @Get('userTask/get') getUserTask(@Query('id') id: string) { return this.svc.getNode('userTask', id); }
  @Get('userTask/detail') getUserTaskDetail(@Query('nodeId') nodeId: string, @Query('id') id: string) { return this.svc.getNode('userTask', nodeId ?? id); }
  @Post('userTask/update') upsertUserTask(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('userTask', b, a); }
  @Post('userTask/clone') cloneUserTask(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('userTask', id, a); }

  @Get('callActivity/get') getCallAct(@Query('id') id: string) { return this.svc.getNode('callActivity', id); }
  @Post('callActivity/update') upsertCallAct(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('callActivity', b, a); }
  @Post('callActivity/clone') cloneCallAct(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('callActivity', id, a); }

  @Get('businessRuleTask/get') getBRT(@Query('id') id: string) { return this.svc.getNode('businessRuleTask', id); }
  @Post('businessRuleTask/update') upsertBRT(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertNode('businessRuleTask', b, a); }
  @Post('businessRuleTask/clone') cloneBRT(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('businessRuleTask', id, a); }

  // ── BpmConfigNode ─────────────────────────────────────────────────────────
  @Get('bpmConfigNode/list') listCN(@TenantId() t: string, @Query('templateId') tid?: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listConfigNodes(t, tid, Number(p ?? 1), Number(l ?? 50)); }
  @Get('bpmConfigNode/get') getCN(@Query('id') id: string) { return this.svc.getConfigNode(id); }
  @Post('bpmConfigNode/update') upsertCN(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertConfigNode(b, a); }
  @Delete('bpmConfigNode/delete') deleteCN(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteConfigNode(id, a); }
  @Post('bpmConfigNode/clone') cloneCN(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneNode('configNode', id, a); }

  // ── BpmConfigLinkNode ─────────────────────────────────────────────────────
  @Get('bpmConfigLinkNode/list') listCLN(@TenantId() t: string, @Query('templateId') tid?: string, @Query('page') p?: string, @Query('limit') l?: string) { return this.svc.listConfigLinkNodes(t, tid, Number(p ?? 1), Number(l ?? 50)); }
  @Get('bpmConfigLinkNode/list/children') listCLNChildren(@TenantId() t: string, @Query('parentId') pid?: string) { return this.svc.listConfigLinkNodeChildren(t, pid); }
  @Get('bpmConfigLinkNode/get') getCLN(@Query('id') id: string) { return this.svc.getConfigLinkNode(id); }
  @Post('bpmConfigLinkNode/update') upsertCLN(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertConfigLinkNode(b, a); }
  @Post('bpmConfigLinkNode/update/config') updateCLNConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateConfigLinkNodeConfig(b, a); }
  @Delete('bpmConfigLinkNode/delete') deleteCLN(@Query('id') id: string) { return this.svc.deleteConfigLinkNode(id); }
  @Post('bpmConfigLinkNode/clone') cloneCLN(@Body('id') id: string, @CurrentUser() a: RequestUser) { return { cloned: true }; }

  // ── BusinessProcess ───────────────────────────────────────────────────────
  @Get('businessProcess/list') listBP(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listBusinessProcesses(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('businessProcess/detail') getBPDetail(@Query('id') id: string) { return this.svc.getBusinessProcess(id); }
  @Get('businessProcess/get') getBP(@Query('id') id: string) { return this.svc.getBusinessProcess(id); }
  @Post('businessProcess/update') upsertBP(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBusinessProcess(b, a); }
  @Post('businessProcess/update/config') updateBPConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateBusinessProcessConfig(b.id as string, b, a); }
  @Post('businessProcess/updateConfig') updateBPConfig2(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateBusinessProcessConfig(b.id as string, b, a); }
  @Post('businessProcess/configNode/update') updateBPNodeConfig(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertConfigNode(b, a); }
  @Post('businessProcess/update/sla') updateBPSla(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.updateBusinessProcessSla(b.id as string, b, a); }
  @Delete('businessProcess/delete') deleteBP(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteBusinessProcess(id, a); }
  @Post('businessProcess/clone') cloneBP(@Body('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.cloneBusinessProcess(id, a); }
  @Delete('businessProcess/node/delete') deleteBPNode(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteNodeFromProcess(id, a); }
  @Get('businessProcess/exportExcel') exportBPExcel(@Query('id') id: string) { return this.svc.exportExcel(id); }
  @Get('businessProcess/exportExcel/status') exportBPExcelStatus(@Query('id') id: string) { return this.svc.getExportStatus(id); }
  @Post('businessProcess/importExcel') importBPExcel(@Body() b: Record<string, unknown>) { return this.svc.importExcel(b); }

  // ── StateMapping ──────────────────────────────────────────────────────────
  @Get('stateMapping/list') listSM(@TenantId() t: string) { return this.svc.listStateMappings(t); }
  @Post('stateMapping/update') upsertSM(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertStateMapping(b, a); }
  @Delete('stateMapping/delete') deleteSM(@Query('id') id: string) { return this.svc.deleteStateMapping(id); }

  // ── VariableDeclare ───────────────────────────────────────────────────────
  @Get('variableDeclare/list') listVars(@TenantId() t: string) { return this.svc.listVariables(t); }
  @Post('variableDeclare/update') upsertVar(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertVariable(b, a); }
  @Delete('variableDeclare/delete') deleteVar(@Query('id') id: string) { return this.svc.deleteVariable(id); }
  @Get('variableDeclare/get') getVar(@Query('id') id: string) { return { id }; }
  @Get('variableInstance/list') listVarInst(@Query('instanceId') id: string) { return this.svc.listVariableInstances(id); }

  // ── ProcessedObject ───────────────────────────────────────────────────────
  @Get('processedObject/list') listPO(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listProcessedObjects(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Get('processedobject/list') listPOAlias(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listProcessedObjects(t, q, Number(q.page ?? 1), Number(q.limit ?? 20)); }
  @Post('processedObject/update') upsertPO(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return { id: 'stub', ...b }; }
  @Delete('processedObject/delete') deletePO(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('processedObject/get') getPO(@Query('id') id: string) { return { id }; }
  @Post('processedObject/reset') resetPO(@Body('id') id: string) { return { reset: true }; }
  @Get('processedObjectLog/list') listPOLog(@Query('instanceId') instanceId: string) { return this.svc.listProcessedObjectLogs(instanceId); }

  // ── Workflow ──────────────────────────────────────────────────────────────
  @Get('workflow/list') listWF(@TenantId() t: string) { return this.svc.listWorkflows(t); }
  @Post('workflow/update') upsertWF(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBusinessProcess(b, a); }
  @Delete('workflow/delete') deleteWF(@Query('id') id: string, @CurrentUser() a: RequestUser) { return this.svc.deleteBusinessProcess(id, a); }
  @Get('workflowStatus/list') listWFStatus(@TenantId() t: string) { return this.svc.listWorkflowStatuses(t); }
  @Post('workflowStatus/update') upsertWFStatus(@Body() b: Record<string, unknown>) { return { id: 'stub', ...b }; }
  @Delete('workflowStatus/delete') deleteWFStatus(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── OLA / SLA ─────────────────────────────────────────────────────────────
  @Get('ola/export') exportOLA(@TenantId() t: string) { return this.svc.exportOLA(t); }
  @Get('sla/export') exportSLA(@TenantId() t: string) { return this.svc.exportSLA(t); }
  @Get('ola/list') listOLA(@TenantId() t: string) { return this.svc.listServiceLevels(t); }
  @Get('sla/list') listSLA(@TenantId() t: string) { return this.svc.listServiceLevels(t); }

  // ── ProcessInstance ───────────────────────────────────────────────────────
  @Get('processInstance/list') listPI(@TenantId() t: string) { return this.svc.listProcessInstances(t); }

  // ── ServiceLevel ──────────────────────────────────────────────────────────
  @Get('serviceLevel/list') listSL(@TenantId() t: string) { return this.svc.listServiceLevels(t); }
  @Post('serviceLevel/update') upsertSL(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertServiceLevel(b, a); }
  @Delete('serviceLevel/delete') deleteSL(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('serviceLevel/get') getSL(@Query('id') id: string) { return { id }; }
  @Get('serviceLevelHistory/list') listSLH(@TenantId() t: string) { return this.svc.listServiceLevelHistories(t); }
  @Post('serviceLevelHistory/update') upsertSLH(@Body() b: Record<string, unknown>) { return { id: 'stub', ...b }; }

  // ── BpmObject / Trigger / AssignmentRule / SegmentFilter ─────────────────
  @Get('bpmObject/list') listBO(@TenantId() t: string) { return this.svc.listBpmObjects(t); }
  @Post('bpmObject/update') upsertBO(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBpmObject(b, a); }
  @Delete('bpmObject/delete') deleteBO(@Query('id') id: string) { return this.svc.deleteBpmObject(id); }
  @Get('bpmObject/get') getBO(@Query('id') id: string) { return { id }; }

  @Get('bpmTrigger/list') listBT(@TenantId() t: string) { return this.svc.listBpmTriggers(t); }
  @Post('bpmTrigger/update') upsertBT(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBpmTrigger(b, a); }
  @Delete('bpmTrigger/delete') deleteBT(@Query('id') id: string) { return this.svc.deleteBpmTrigger(id); }

  @Get('bpmAssignmentRule/list') listBAR(@TenantId() t: string) { return this.svc.listBpmAssignmentRules(t); }
  @Post('bpmAssignmentRule/update') upsertBAR(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBpmAssignmentRule(b, a); }

  @Get('bpmSegmentFilter/list') listBSF(@TenantId() t: string) { return this.svc.listBpmSegmentFilters(t); }
  @Post('bpmSegmentFilter/update') upsertBSF(@Body() b: Record<string, unknown>, @CurrentUser() a: RequestUser) { return this.svc.upsertBpmSegmentFilter(b, a); }
  @Delete('bpmSegmentFilter/delete') deleteBSF(@Query('id') id: string) { return this.svc.deleteBpmSegmentFilter(id); }
  @Get('bpmSegmentFilter/get') getBSF(@Query('id') id: string) { return { id }; }

  // ── FindByCriteria / Rest ─────────────────────────────────────────────────
  @Post('findByCriteria/search') findByCriteria(@TenantId() t: string, @Body() b: Record<string, unknown>) { return this.svc.findByCriteria(t, b); }
  @Post('rest/call') restCall(@Body() b: Record<string, unknown>) { return this.svc.restCall(b); }

  // ── BpmArtifactData / BpmFormData / BpmFormPopup ──────────────────────────
  @Get('bpmArtifactData/list') listBAD(@TenantId() t: string) { return []; }
  @Post('bpmArtifactData/update') upsertBAD(@Body() b: Record<string, unknown>) { return b; }
  @Delete('bpmArtifactData/delete') deleteBAD(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('bpmFormData/list') listBFD(@TenantId() t: string) { return []; }
  @Post('bpmFormData/update') upsertBFD(@Body() b: Record<string, unknown>) { return b; }
  @Get('bpmFormPopup/list') listBFP(@TenantId() t: string) { return []; }
  @Post('bpmFormPopup/update') upsertBFP(@Body() b: Record<string, unknown>) { return b; }
  @Delete('bpmFormPopup/delete') deleteBFP(@Query('id') id: string) { return { message: 'Deleted' }; }
  @Get('bpmFormPopup/get') getBFP(@Query('id') id: string) { return { id }; }

  // ── Upload ────────────────────────────────────────────────────────────────
  @Post('upload/file') uploadFile(@Body() b: Record<string, unknown>) { return { url: `/uploads/file-${Date.now()}` }; }
  
  @Post('documents/upload')
  uploadDocument(@Body() b: Record<string, unknown>) { 
    // Alias for the standard BPM spec
    return { url: `/uploads/document-${Date.now()}` }; 
  }

  @Delete('upload/delete') deleteUpload(@Query('id') id: string) { return { message: 'Deleted' }; }

  // ── BpmParticipantProcesslog ──────────────────────────────────────────────
  @Get('bpmParticipantProcesslog/list') listBPPL(@TenantId() t: string, @Query() q: Record<string, string>) { return this.svc.listProcessedObjects(t, q); }
}
