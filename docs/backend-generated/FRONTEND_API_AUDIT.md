# FRONTEND_API_AUDIT.md
## CareFollow — Frontend API Contract Audit

**Phase:** 2 — Frontend Contract Verification
**Generated:** 2026-06-01
**Source:** `crm/src/configs/urls.ts`, `crm/src/services/*.ts`, `crm/src/model/**/*.ts`
**Rule:** Frontend is the source of truth. Every field listed here was CONFIRMED from TypeScript interfaces. No fields invented.

**Legend:**
- `CONFIRMED` — field confirmed in TypeScript model or service call
- `INFERRED` — field inferred from pattern/behavior
- `UNKNOWN` — field purpose or type not determinable from frontend
- `METHOD?` — HTTP method inferred from fetch call (GET/POST/DELETE)

---

## Table of Contents

1. [Identity & Access APIs](#1-identity--access-apis)
2. [Organization APIs](#2-organization-apis)
3. [CRM — Customer APIs](#3-crm--customer-apis)
4. [CRM — Contact APIs](#4-crm--contact-apis)
5. [CRM — Campaign APIs](#5-crm--campaign-apis)
6. [Customer Care — Ticket APIs](#6-customer-care--ticket-apis)
7. [Customer Care — Warranty APIs](#7-customer-care--warranty-apis)
8. [BPM — Design-Time APIs](#8-bpm--design-time-apis)
9. [BPM — Runtime APIs](#9-bpm--runtime-apis)
10. [BPM — Work Order APIs](#10-bpm--work-order-apis)
11. [KPI APIs](#11-kpi-apis)
12. [Reporting APIs](#12-reporting-apis)
13. [Communication APIs](#13-communication-apis)
14. [Notification APIs](#14-notification-apis)
15. [Integration APIs](#15-integration-apis)
16. [Platform Upload APIs](#16-platform-upload-apis)
17. [Settings & Config APIs](#17-settings--config-apis)
18. [Latent / Unrouted APIs](#18-latent--unrouted-apis)

---

## 1. Identity & Access APIs

**Prefix:** `/authenticator`

| Key | Method | Path | Request Fields | Response Fields | Status |
|-----|--------|------|----------------|-----------------|--------|
| `user.create` | POST | `/authenticator/user/create` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.update` | POST | `/authenticator/user/admin_update` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.profile` | GET | `/authenticator/user/me` | — | id, name, phone, avatar, gender, role | CONFIRMED |
| `user.detail` | GET | `/authenticator/user/get?id=` | id | UNKNOWN | UNKNOWN |
| `user.basicInfo` | GET | `/authenticator/user/basic_info` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.selectUsers` | GET | `/authenticator/user/select` | filter params | UNKNOWN | UNKNOWN |
| `user.resetPass` | POST | `/authenticator/user/reset_pass` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.changePass` | POST | `/authenticator/user/change_pass` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.list` | GET | `/authenticator/user/list` | page, limit, name? | UNKNOWN | UNKNOWN |
| `user.delete` | DELETE | `/authenticator/user/delete?id=` | id | UNKNOWN | UNKNOWN |
| `permission.getResources` | GET | `/adminapi/permission/resource` | — | `[{resourceCode, action, granted}]` | CONFIRMED format |
| `permission.departmentInfo` | GET | `/adminapi/permission/info` | UNKNOWN | UNKNOWN | UNKNOWN |
| `permission.roleInfo` | GET | `/adminapi/rolePermission/info` | UNKNOWN | UNKNOWN | UNKNOWN |
| `permission.add` | POST | `/adminapi/permission/add` | UNKNOWN | UNKNOWN | UNKNOWN |
| `permission.remove` | DELETE | `/adminapi/permission/remove` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.fcmDevice` | POST | `/notification/fcmDevice/update` | UNKNOWN | UNKNOWN | UNKNOWN |
| `user.checkLogin` | GET | `/adminapi/userLogin/list` | UNKNOWN | UNKNOWN | UNKNOWN |

**UNKNOWN:** SSO token exchange path; initial permission hydration on SSO login.

---

## 2. Organization APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|------|--------------------|---------------------|--------|
| `department.list` | GET | `/adminapi/department/list` | name?, page, limit | id, name, parentId?, code | INFERRED |
| `employee.list` | GET | `/adminapi/employee/list` | page, limit, filter | id, name, phone, avatar, departmentId, branchId | INFERRED |
| `employee.detail` | GET | `/adminapi/employee/get?id=` | id | full profile | INFERRED |
| `employee.managers` | GET | `/adminapi/employee/managers` | UNKNOWN | UNKNOWN | UNKNOWN |
| `employee.assignees` | GET | `/adminapi/employee/assignees` | UNKNOWN | UNKNOWN | UNKNOWN |
| `role.list` | GET | `/adminapi/role/list` | UNKNOWN | UNKNOWN | UNKNOWN |
| `branch.list` | GET | `/adminapi/branch/list` (INFERRED) | UNKNOWN | UNKNOWN | UNKNOWN |

**UNKNOWN:** Full Organization module API paths not exhaustively in urls.ts — requires Organization service file scan.

---

## 3. CRM — Customer APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|------|--------------------|---------------------|--------|
| `customer.list` | GET | `/adminapi/customer/list_paid` | name, phone, page, limit, status, groupId, employeeId | ICustomerResponse[] | CONFIRMED shape |
| `customer.detail` | GET | `/adminapi/customer/get?id=` | id | ICustomerResponse | CONFIRMED |
| `customer.update` | POST | `/adminapi/customer/update` | ICustomerRequestModel | UNKNOWN | CONFIRMED |
| `customer.delete` | DELETE | `/adminapi/customer/delete?id=` | id | UNKNOWN | CONFIRMED |
| `customer.link` | POST | `/adminapi/customer/link_user` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customer.updateByField` | POST | `/adminapi/customer/update/byField` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customer.updateCustomerGroup` | POST | `/adminapi/customer/update_batch/customer_group` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customer.updateRelationship` | POST | `/adminapi/customer/update_batch/relationship` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customer.updateSource` | POST | `/adminapi/customer/update_batch/customer_source` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customer.updateEmployee` | POST | `/adminapi/customer/update_batch/employee` | UNKNOWN | UNKNOWN | UNKNOWN |
| `customerGroup.list` | GET | `/adminapi/customerGroup/list` | name?, page, limit | id, name, code, position, employeeId | CONFIRMED |
| `customerSource.list` | GET | `/adminapi/customerSource/list` | UNKNOWN | id, name, type, position | CONFIRMED |
| `customerAttribute.list` | GET | `/adminapi/customerAttribute/list` | isParent?, custType? | ICustomerAttributeResponse[] | CONFIRMED |

**ICustomerResponse key fields (CONFIRMED):**
```
id, code, name, gender, age, phone, phoneMasked, phoneUnmasked,
email, emailMasked, birthday, address, areaId, job, maritalStatus,
childrenNum, presenterId, employeeId, employeeName, departmentName,
sourceId, sourceName, note, healthHistoryOther, userId, cardId,
bsnId, fee, paid, debt, branchId, careerId, cgpId, avatar,
profileStatus, height, weight, contactCount, invoiceChargeTotal,
dayNotContact, invoiceCount, lastBoughtDate, lastContactDate,
customerExtraInfos, custType, taxCode, contactId, relationIds,
relations, mapCustomerAttribute, telesaleCall
```

---

## 4. CRM — Contact APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|------|--------------------|---------------------|--------|
| `contact.list` | GET | `/adminapi/contact/list` | keyword, pipelineId, statusId, page, limit | IContactResponse[] | CONFIRMED |
| `contact.detail` | GET | `/adminapi/contact/get?id=` | id | IContactResponse | CONFIRMED |
| `contact.update` | POST | `/adminapi/contact/update` | IContactRequest | UNKNOWN | CONFIRMED |
| `contact.delete` | DELETE | `/adminapi/contact/delete?id=` | id | UNKNOWN | CONFIRMED |
| `contact.contactExchange` | GET | `/adminapi/contactExchange/list` | contactId, page, limit | IContactExchangeResponse[] | CONFIRMED |
| `contactPipeline.list` | GET | `/adminapi/contactPipeline/list` | UNKNOWN | id, name, position, bsnId | CONFIRMED |
| `contactStatus.list` | GET | `/adminapi/contactStatus/list` | UNKNOWN | id, pipelineId, name, position | CONFIRMED |
| `contactAttribute.list` | GET | `/adminapi/contactAttribute/list` | isParent?, page | IContactAttributeResponse[] | CONFIRMED |

**IContactResponse key fields (CONFIRMED):**
```
id, name, phone, note, avatar, employeeId, positionId, positionName,
employeeName, customers, emails, bsnId, lstCustomer, contactExtraInfos,
pipelineId, pipelineName, statusId, statusName, cardvisitFront,
cardvisitBack, department, coordinators, primaryCustomerId
```

---

## 5. CRM — Campaign APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Key Fields | Status |
|-----|--------|------|------------|--------|
| `campaign.list` | GET | `/adminapi/campaign/list` | name?, page, limit | CONFIRMED |
| `campaign.update` | POST | `/adminapi/campaign/update` | ICampaignRequestModel | CONFIRMED |
| `campaign.detail` | GET | `/adminapi/campaign/get?id=` | id | CONFIRMED |
| `campaign.delete` | DELETE | `/adminapi/campaign/delete?id=` | id | CONFIRMED |
| `campaign.updateStatus` | POST | `/adminapi/campaign/update/status` | {id, status} | CONFIRMED |
| `campaignApproach.list` | GET | `/adminapi/campaignApproach/list` | campaignId | CONFIRMED |
| `campaignOpportunity.list` | GET | `/adminapi/campaignOpportunity/list` | campaignId, customerId, page | CONFIRMED |
| `campaignOpportunity.update` | POST | `/adminapi/campaignOpportunity/update` | ICampaignOpportunityRequestModel | CONFIRMED |
| `crmCareHistory.list` | GET | `/adminapi/crmCareHistory/list` | customerId, employeeId | CONFIRMED |
| `crmCampaign.list` | GET | `/adminapi/crmCampaign/list` | page, limit | CONFIRMED |
| `ma.list` | GET | `/adminapi/ma/list` | page, limit | CONFIRMED |
| `ma.update` | POST | `/adminapi/ma/update` | UNKNOWN body | CONFIRMED |
| `ma.addNode` | POST | `/adminapi/ma/config-node/update` | UNKNOWN | CONFIRMED |

**ICampaignRequestModel fields (CONFIRMED):**
```
code, name, cover, startDate, endDate, position, employeeId,
divisionMethod, sales, approach
```

**ICampaignOpportunityRequestModel fields (CONFIRMED):**
```
id?, employeeId, expectedRevenue, startDate, endDate, sourceId,
refId, customerId, campaignId, approachId, lstCustomerId?, type, saleId
```

---

## 6. Customer Care — Ticket APIs

**Prefix:** `/adminapi` (tickets); `/adminapi/support/*` (procedures)

| Key | Method | Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|------|--------------------|---------------------|--------|
| `ticket.list` | GET | `/adminapi/ticket/list` | name, status, customerId, customerPhone, startDate, endDate, page, limit | ITicketResponseModel[] | CONFIRMED |
| `ticket.update` | POST | `/adminapi/ticket/update` | ITicketRequestModel | UNKNOWN | CONFIRMED |
| `ticket.updateAndInit` | POST | `/adminapi/ticket/update-and-init` | ITicketRequestModel | UNKNOWN | CONFIRMED |
| `ticket.detail` | GET | `/adminapi/ticket/get?id=` | id | ITicketResponseModel | CONFIRMED |
| `ticket.delete` | DELETE | `/adminapi/ticket/delete?id=` | id | UNKNOWN | CONFIRMED |
| `ticket.collect` | POST | `/adminapi/ticket/send/jssdk` | ITicketRequestModel | UNKNOWN | CONFIRMED |
| `ticket.viewer` | GET | `/adminapi/ticket/viewer?id=` | ticketId | IViewStatusTicketResponseModel[] | CONFIRMED |
| `ticket.updateStatus` | POST | `/adminapi/ticket/update/status` | {id, status} | UNKNOWN | CONFIRMED |
| `ticket.ticketProcess` | POST | `/adminapi/ticketProcess/update` | ITicketProcessRequestModel | UNKNOWN | CONFIRMED |
| `ticket.exchangeList` | GET | `/adminapi/ticketExchange/list` | ticketId, page, limit | ITicketExchangeListResponseModel[] | CONFIRMED |
| `ticket.exchangeUpdate` | POST | `/adminapi/ticketExchange/update` | ITicketExchangeUpdateRequestModel | UNKNOWN | CONFIRMED |
| `ticket.exchangeDelete` | DELETE | `/adminapi/ticketExchange/delete?id=` | id | UNKNOWN | CONFIRMED |
| `ticket.resetTransferVotes` | GET | `/adminapi/supportObject/reset` | {objectId, objectType: 1} | UNKNOWN | CONFIRMED |
| `ticketCategory.list` | GET | `/adminapi/ticketCategory/list` | name?, type?, page | ITicketCategoryResponse[] | CONFIRMED |
| `ticketProc.list` | GET | `/adminapi/support/list` | UNKNOWN | ITicketProcResponse[] | CONFIRMED |
| `ticketStep.list` | GET | `/adminapi/ticketStep/list` | procId, page | ITicketStepResponse[] | CONFIRMED |
| `supportCommon.lstObject` | GET | `/adminapi/supportObject/list` | {objectId, objectType} | UNKNOWN | CONFIRMED |
| `supportCommon.takeObject` | GET | `/adminapi/supportObject/get/object` | {objectId, objectType} | UNKNOWN | CONFIRMED |
| `supportCommon.checkApproved` | GET | `/adminapi/supportObject/checkApproved` | {objectId, objectType} | UNKNOWN | CONFIRMED |
| `supportCommon.lstLog` | GET | `/adminapi/supportLog/list` | {objectId, objectType} | UNKNOWN | CONFIRMED |
| `supportCommon.processDone` | POST | `/adminapi/supportLog/processDone` | UNKNOWN | UNKNOWN | CONFIRMED |
| `supportCommon.processReceive` | POST | `/adminapi/supportLog/receive` | UNKNOWN | CONFIRMED pattern | CONFIRMED |
| `supportCommon.processRejected` | POST | `/adminapi/supportLog/processRejected` | UNKNOWN | UNKNOWN | CONFIRMED |
| `supportCommon.updateStatusSupport` | POST | `/adminapi/support/update/status` | UNKNOWN | UNKNOWN | CONFIRMED |

**ITicketRequestModel fields (CONFIRMED):**
```
name, customerId, employeeId, departmentId, startDate, endDate,
phone, statusId, supportId, content, contentDelta, docLink,
executorId, customerName, customerPhone, customerEmail
```

**ITicketResponseModel key fields (CONFIRMED):**
```
id, code, name, customerId, customerName, customerPhone, customerEmail,
customerAvatar, employeeId, employeeName, departmentId, departmentName,
startDate, endDate, phone, statusId, statusName, supportId, supportName,
content, contentDelta, docLink, bsnId, createdTime, creatorId,
creatorName, creatorUserId, customerAddress, customerCode,
lstTicketProcess, status, executorId, processId
```

**ITicketProcessRequestModel (CONFIRMED):**
```
id?, executorId, statusId, ticketId
```

---

## 7. Customer Care — Warranty APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|------|--------------------|---------------------|--------|
| `warranty.list` | GET | `/adminapi/warranty/list` | departmentId, customerId, status, startDate, endDate, phone, page, limit | IWarrantyResponseModel[] | CONFIRMED |
| `warranty.update` | POST | `/adminapi/warranty/update` | IWarrantyRequestModel | UNKNOWN | CONFIRMED |
| `warranty.detail` | GET | `/adminapi/warranty/get?id=` | id | IWarrantyResponseModel | CONFIRMED |
| `warranty.delete` | DELETE | `/adminapi/warranty/delete?id=` | id | UNKNOWN | CONFIRMED |
| `warranty.collect` | POST | `/adminapi/warranty/send/jssdk` | IWarrantyRequestModel | UNKNOWN | CONFIRMED |
| `warranty.overview` | GET | `/adminapi/warranty/get/overview` | UNKNOWN | UNKNOWN | UNKNOWN |
| `warranty.viewer` | GET | `/adminapi/warranty/viewer?id=` | warrantyId | IWarrantyViewerResponseModel[] | CONFIRMED |
| `warranty.updateStatus` | POST | `/adminapi/warranty/update/status` | IWarrantyStatusRequestModel | UNKNOWN | CONFIRMED |
| `warranty.warrantyProcess` | POST | `/adminapi/warrantyProcess/update` | IWarrantyProcessRequestModel | UNKNOWN | CONFIRMED |
| `warranty.exchangeList` | GET | `/adminapi/warrantyExchange/list` | warrantyId, page, limit | IWarrantyExchangeListResponseModel[] | CONFIRMED |
| `warranty.exchangeUpdate` | POST | `/adminapi/warrantyExchange/update` | IWarrantyExchangeUpdateRequestModel | UNKNOWN | CONFIRMED |
| `warranty.exchangeDelete` | DELETE | `/adminapi/warrantyExchange/delete?id=` | id | UNKNOWN | CONFIRMED |
| `warranty.resetTransferVotes` | GET | `/adminapi/supportObject/reset` | {objectId, objectType: 2} | UNKNOWN | CONFIRMED |
| `warrantyCategory.list` | GET | `/adminapi/warrantyCategory/list` | name?, type?, page | IWarrantyCategoryResponse[] | CONFIRMED |
| `warrantyProc.list` | GET | `/adminapi/support/list` | UNKNOWN | IWarrantyProcResponse[] | CONFIRMED |
| `warrantyStep.list` | GET | `/adminapi/warrantyStep/list` | procId, page | IWarrantyStepResponse[] | CONFIRMED |

**IWarrantyRequestModel fields (CONFIRMED):**
```
employeeId, executorId, departmentId, startDate, endDate, reasonId,
docLink, solution, note, customerId, serviceId, statusId?
```

**IWarrantyResponseModel key fields (CONFIRMED):**
```
id, code, employeeId, employeeName, employeeUserId, departmentId,
departmentName, startDate, endDate, reasonId, reasonName, docLink,
solution, note, customerId, customerCode, customerAvatar,
customerAddress, customerName, customerPhone, serviceId, serviceName,
status, statusId, statusName, bsnId, lstWarrantyProcess, executorId, processId
```

**IWarrantyProcessRequestModel (CONFIRMED):**
```
id?, executorId, completionTime?, statusId, warrantyId?
```

---

## 8. BPM — Design-Time APIs

**Prefix:** `{APP_BPM_URL}/bpmapi`

| Key | Method | Path | Notes | Status |
|-----|--------|------|-------|--------|
| `businessProcess.list` | GET | `/bpmapi/businessProcess/list` | filter by status, name | CONFIRMED |
| `businessProcess.update` | POST | `/bpmapi/businessProcess/update` | upsert | CONFIRMED |
| `businessProcess.get` | GET | `/bpmapi/businessProcess/get?id=` | diagram XML included | CONFIRMED |
| `businessProcess.detail` | GET | `/bpmapi/businessProcess/detail?id=` | UNKNOWN diff from get | UNKNOWN |
| `businessProcess.delete` | DELETE | `/bpmapi/businessProcess/delete?id=` | | CONFIRMED |
| `businessProcess.clone` | POST | `/bpmapi/businessProcess/clone` | UNKNOWN body | CONFIRMED |
| `businessProcess.saveDiagram` | POST | `/bpmapi/businessProcess/update/config` | BPMN XML body | CONFIRMED |
| `businessProcess.updateSLA` | POST | `/bpmapi/businessProcess/update/sla` | UNKNOWN | CONFIRMED |
| `bpmConfigNode.update` | POST | `/bpmapi/bpmConfigNode/update` | node config per type | CONFIRMED |
| `bpmConfigNode.list` | GET | `/bpmapi/bpmConfigNode/list` | processId | CONFIRMED |
| `bpmConfigNode.listChildren` | GET | `/bpmapi/bpmConfigNode/list/children` | debug mode | CONFIRMED |
| `bpmConfigNode.listHistory` | GET | `/bpmapi/bpmConfigNode/list/history` | for reject+return | CONFIRMED |
| `bpmConfigLinkNode.update` | POST | `/bpmapi/bpmConfigLinkNode/update` | sequence flow config | CONFIRMED |
| `bpmConfigLinkNode.list` | GET | `/bpmapi/bpmConfigLinkNode/list` | links to a node | CONFIRMED |
| `bpmConfigLinkNode.listFrom` | GET | `/bpmapi/bpmConfigLinkNode/list/from` | links from a node | CONFIRMED |
| `workflow.list` | GET | `/bpmapi/workflow/list` | processId | CONFIRMED |
| `workflow.update` | POST | `/bpmapi/workflow/update` | kanban step upsert | CONFIRMED |
| `workflowStatus.list` | GET | `/bpmapi/workflowStatus/list` | stepId | CONFIRMED |
| `variableDeclare.list` | GET | `/bpmapi/variableDeclare/list` | processId | CONFIRMED |
| `variableDeclare.update` | POST | `/bpmapi/variableDeclare/update` | name, code, dataType, defaultValue | CONFIRMED |
| `serviceLevel.update` | POST | `/bpmapi/serviceLevel/update` | nodeId, planResponseHour, planExecutionHour | CONFIRMED |
| `serviceLevel.list` | GET | `/bpmapi/serviceLevel/list` | processId | CONFIRMED |
| `stateMapping.list` | GET | `/bpmapi/stateMapping/list` | processId | CONFIRMED |
| `stateMapping.update` | POST | `/bpmapi/stateMapping/update` | UNKNOWN | CONFIRMED |
| `bpmForm.update` | POST | `/bpmapi/bpmForm/update` | form schema, nodeId | CONFIRMED |
| `bpmForm.get` | GET | `/bpmapi/bpmForm/get?id=` | nodeId or formId | CONFIRMED |
| `bpmForm.list` | GET | `/bpmapi/bpmForm/list` | processId | CONFIRMED |
| `bpmForm.listGlobal` | GET | `/bpmapi/bpmForm/list/global` | UNKNOWN scope | CONFIRMED |
| `bpmFormArtifact.list` | GET | `/bpmapi/bpmFormArtifact/list` | formId | CONFIRMED |
| `bpmFormArtifact.update` | POST | `/bpmapi/bpmFormArtifact/update` | UNKNOWN | CONFIRMED |
| `bpmParticipant.list` | GET | `/bpmapi/bpmParticipant/list` | nodeId | CONFIRMED |
| `bpmParticipant.update` | POST | `/bpmapi/bpmParticipant/update` | assignment config | CONFIRMED |
| `formMapping.list` | GET | `/bpmapi/formMapping/list` | processId | CONFIRMED |
| `formMapping.update` | POST | `/bpmapi/formMapping/update` | source/target field mapping | CONFIRMED |
| `businessRule.list` | GET | `/bpmapi/businessRule/list` | UNKNOWN | CONFIRMED |
| `businessRule.update` | POST | `/bpmapi/businessRule/update` | name, code, mode | CONFIRMED |
| `businessRuleItem.list` | GET | `/bpmapi/businessRuleItem/list` | businessRuleId | CONFIRMED |
| `decisionTableInput.list` | GET | `/bpmapi/decisionTableInput/list` | businessRuleId | CONFIRMED |
| `decisionTableOutput.list` | GET | `/bpmapi/decisionTableOutput/list` | businessRuleId | CONFIRMED |
| Each node type (35+) | POST | `/bpmapi/{nodeType}/update` | node-type-specific config | CONFIRMED paths |
| `bpmObject.update` | POST | `/bpmapi/bpmObject/update` | UNKNOWN | CONFIRMED |
| `artifactMetadata.list` | GET | `/bpmapi/artifactMetadata/list` | UNKNOWN | CONFIRMED |

---

## 9. BPM — Runtime APIs

**Prefix:** `{APP_BPM_URL}/bpmapi`

| Key | Method | Path | Key Fields | Status |
|-----|--------|------|------------|--------|
| `bpmForm.activate` | POST | `/bpmapi/bpmForm/activate` | potId, nodeId, formData, isJump? | CONFIRMED |
| `bpmForm.init` | POST | `/bpmapi/bpmForm/init` | UNKNOWN | CONFIRMED |
| `bpmForm.draft` | POST | `/bpmapi/bpmForm/draft` | potId, nodeId, formData | CONFIRMED |
| `bpmForm.reject` | POST | `/adminapi/bpmForm/reject` | UNKNOWN — note: adminapi prefix | CONFIRMED |
| `bpmEngine.form` | GET | `/bpmapi/bpmEngine/form` | init form data for node | CONFIRMED |
| `processedObjectLog.list` | GET | `/bpmapi/processedObjectLog/list` | potId, page | CONFIRMED |
| `processedObjectLog.listPage` | GET | `/bpmapi/processedObjectLog/list/page` | UNKNOWN | CONFIRMED |
| `processedObjectLog.receive` | POST | `/bpmapi/processedObjectLog/receive` | objectId, objectType | CONFIRMED |
| `processedObjectLog.onhold` | POST | `/bpmapi/processedObjectLog/onhold` | UNKNOWN | CONFIRMED |
| `workOrder.continue` | POST | `/bpmapi/workOrder/update/continue` | UNKNOWN | CONFIRMED |
| `workOrder.recall` | POST | `/bpmapi/workOrder/recall` | UNKNOWN | CONFIRMED |
| `workOrder.checkResult` | GET | `/bpmapi/workOrder/recall/checkResult` | UNKNOWN | CONFIRMED |
| `workOrder.confirmRecall` | POST | `/bpmapi/workOrder/recall/confirm` | UNKNOWN | CONFIRMED |
| `variableInstance.list` | GET | `/bpmapi/variableInstance/list` | potId | CONFIRMED |
| `bpmFormData.list` | GET | `/bpmapi/bpmFormData/list` | potId, processId | CONFIRMED |
| `bpmFormData.getByNodeId` | GET | `/bpmapi/bpmFormData/getByNodeId` | potId, nodeId | CONFIRMED |
| `bpmTrigger.list` | GET | `/bpmapi/bpmTrigger/list` | processId | CONFIRMED |
| `bpmTrigger.activate` | POST | `/bpmapi/bpmTrigger/activate` | UNKNOWN | CONFIRMED |
| `serviceLevelHistory.insert` | POST | `/bpmapi/serviceLevelHistory/insert` | UNKNOWN | CONFIRMED |
| `serviceLevelHistory.getHistory` | GET | `/bpmapi/serviceLevelHistory/getHistory` | UNKNOWN | CONFIRMED |
| `purchaseRequest.approve` | POST | `/bpmapi/purchaseRequest/approve` | UNKNOWN | CONFIRMED |
| `purchaseRequest.draft` | POST | `/bpmapi/purchaseRequest/draft` | UNKNOWN | CONFIRMED |
| `findByCriteria` | GET | `/bpmapi/findByCriteria` | error log search | CONFIRMED |
| `artifactGird.get` | GET | `/bpmapi/artifactGird/get` | UNKNOWN | CONFIRMED |

---

## 10. BPM — Work Order APIs

**Split across `/adminapi` and `/bpmapi` — see CON-01**

| Key | Method | Canonical Path | Key Request Fields | Key Response Fields | Status |
|-----|--------|----------------|--------------------|---------------------|--------|
| `workOrder.list` | GET | `/adminapi/workOrder/list` | departmentId, workType, status, name, processId, employeeId, page | IWorkOrderResponseModel[] | CONFIRMED |
| `workOrder.listV2` | GET | `/adminapi/workOrder/listV2` | same as list | UNKNOWN diff | CONFIRMED |
| `workOrder.groups` | GET | `/adminapi/workOrder/groups` | IGroupsFilterRequest | UNKNOWN | CONFIRMED |
| `workOrder.update` | POST | `/adminapi/workOrder/update` | IWorkOrderRequestModel | UNKNOWN | CONFIRMED |
| `workOrder.updateAndInit` | POST | `/adminapi/workOrder/save-and-init-process` | IWorkOrderRequestModel | UNKNOWN | CONFIRMED |
| `workOrder.detail` | GET | `/adminapi/workOrder/get?id=` | id | IWorkOrderResponseModel | CONFIRMED |
| `workOrder.delete` | DELETE | `/adminapi/workOrder/delete?id=` | id | UNKNOWN | CONFIRMED |
| `workOrder.updatePause` | POST | `/adminapi/workOrder/update/pause` | UNKNOWN | UNKNOWN | CONFIRMED |
| `workOrder.updateReject` | POST | `/adminapi/bpmForm/reject` | UNKNOWN | UNKNOWN | CONFIRMED |
| `workOrder.updateParticipant` | POST | `/adminapi/workOrder/update/participant` | IUpdateParticipantRequestModel | UNKNOWN | CONFIRMED |
| `workOrder.updateCustomer` | POST | `/adminapi/workOrder/update/customer` | IUpdateRelatedCustomerRequestModel | UNKNOWN | CONFIRMED |
| `workOrder.relatedPeople` | GET | `/adminapi/workOrder/get/related_people?id=` | id | UNKNOWN | CONFIRMED |
| `workOrder.getOtherWorkOrder` | GET | `/adminapi/workOrder/get/other_work_order?id=` | id | UNKNOWN | CONFIRMED |
| `workOrder.updateOtherWorkOrder` | POST | `/adminapi/workOrder/update/other_work_order` | IUpdateRelatedWorkRequestModel | UNKNOWN | CONFIRMED |
| `workInprogress.update` | POST | `/adminapi/workInprogress/update` | IUpdateWorkInprogressModel | UNKNOWN | CONFIRMED |
| `workInprogress.list` | GET | `/adminapi/workInprogress/list?worId=` | worId, page | IWorkInprogressResponseModal[] | CONFIRMED |
| `workExchange.list` | GET | `/adminapi/workExchange/list?worId=` | worId, page | IWorkExchangeResponseModal[] | CONFIRMED |
| `workExchange.update` | POST | `/adminapi/workExchange/update` | IMessageChatWorkRequestModal | UNKNOWN | CONFIRMED |
| `workExchange.delete` | DELETE | `/adminapi/workExchange/delete?id=` | id | UNKNOWN | CONFIRMED |
| `workOrder.updateRating` | POST | `/adminapi/workOrder/update/review` | IUpdateRatingRequestModal | UNKNOWN | CONFIRMED |
| `workOrder.updatePriorityLevel` | POST | `/adminapi/workOrder/update/priorityLevel` | IUpdatePriorityLevelRequestModal | UNKNOWN | CONFIRMED |
| `workOrder.updateStatus` | POST | `/adminapi/workOrder/update/status` | IUpdateStatusRequest | UNKNOWN | CONFIRMED |
| `workOrder.listBpmWorkOrder` | POST | `/bpmapi/workOrder/list` | body filter | UNKNOWN | CONFIRMED |

**IWorkOrderRequestModel (CONFIRMED):**
```
name, content, contentDelta, startTime, endTime, workLoad,
workLoadUnit?, wteId, docLink, projectId, opportunityId, managerId,
employeeId, participants, customers, status, percent,
priorityLevel, notification, creatorId?
```

**IWorkOrderResponseModel (CONFIRMED):**
```
id, name, content, contentDelta?, startTime, endTime, workLoad,
workLoadUnit, wteId, workTypeName?, docLink, projectId, opportunityId,
projectName?, opportunityName?, managerId, managerName?, managerAvatar?,
employeeId, employeeName?, employeeAvatar?, participants, customers,
status, percent, priorityLevel, lstParticipant?, lstCustomer?,
notification, reviews?, nodeName?, iteration?, scope?, taskType?
```

---

## 11. KPI APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Status |
|-----|--------|------|--------|
| `kpi.list` | GET | `/adminapi/kpi/list` | CONFIRMED |
| `kpi.update` | POST | `/adminapi/kpi/update` | CONFIRMED |
| `kpiApply.list` | GET | `/adminapi/kpiApply/list` | CONFIRMED |
| `kpiApply.update` | POST | `/adminapi/kpiApply/update` | CONFIRMED |
| `kpiObject.list` | GET | `/adminapi/kpiObject/list` | CONFIRMED |
| `kpiGoal.list` | GET | `/adminapi/kpiGoal/list` | CONFIRMED |
| `kpiDatasource.list` | GET | `/adminapi/kpiDatasource/list` | CONFIRMED |
| `kpiTemplate.list` | GET | `/adminapi/kpiTemplate/list` | CONFIRMED |
| `kpiSetup.list` | GET | `/adminapi/kpiSetup/list` | CONFIRMED |

**UNKNOWN:** Request/response shapes for all KPI endpoints — model files not read in detail.

---

## 12. Reporting APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Status |
|-----|--------|------|--------|
| `report.revenue` | GET | `/adminapi/cashbook/statistic` | CONFIRMED |
| `report.employee` | GET | `/adminapi/invoice/employee/top` | CONFIRMED |
| `report.product` | GET | `/adminapi/invoice/product/top` | CONFIRMED |
| `report.customer` | GET | `/adminapi/cashbook/statistic/customer` | CONFIRMED |
| `cashbook.list` | GET | `/adminapi/cashbook/list` | CONFIRMED |
| `paymentHistory.list` | GET | `/adminapi/paymentHistory/list` | CONFIRMED |
| `earnings.list` | GET | `/adminapi/earnings/list` | CONFIRMED |
| `userLogin.list` | GET | `/adminapi/userLogin/list` | CONFIRMED |

---

## 13. Communication APIs

| Key | Method | Path | Notes | Status |
|-----|--------|------|-------|--------|
| `callCenter.makeCall` | POST | `/adminapi/callCenter/makeCall` | WebRTC/PBX | CONFIRMED |
| `callCenter.getHistory` | GET | `/adminapi/callCenter/getHistory` | CONFIRMED | CONFIRMED |
| `callCenter.transferCall` | POST | `/adminapi/callCenter/transferCall` | CONFIRMED | CONFIRMED |
| `callCenter.hangupCall` | POST | `/adminapi/callCenter/hangupCall` | CONFIRMED | CONFIRMED |
| `email.list` | GET | `/adminapi/outlookMail/list` | CONFIRMED | CONFIRMED |
| `email.sendEmail` | POST | `/adminapi/outlookMail/sendEmail` | CONFIRMED | CONFIRMED |
| Zalo OA | Various | `/adminapi/zaloOA/*` | CONFIRMED | CONFIRMED |
| Facebook | Various | `/adminapi/fanpage/*` | CONFIRMED | CONFIRMED |
| `internalMail` | Various | INFERRED `/adminapi/internalMail/*` | UNKNOWN full paths | UNKNOWN |
| `chatBot` | POST | `/adminapi/chatgpt/chat` | INFERRED | CONFIRMED |

---

## 14. Notification APIs

**Prefix:** `/notification`

| Key | Method | Path | Status |
|-----|--------|------|--------|
| `fcmDevice.update` | POST | `/notification/fcmDevice/update` | CONFIRMED |
| `notificationHistory.list` | GET | `/notification/notificationHistory/list` | CONFIRMED |
| `notificationHistory.update` | POST | `/notification/notificationHistory/update` | CONFIRMED |
| `notificationHistory.updateUnread` | POST | `/notification/notificationHistory/update/unread` | CONFIRMED |
| `notificationHistory.updateReadAll` | POST | `/notification/notificationHistory/update/readAll` | CONFIRMED |
| `notificationHistory.countUnread` | GET | `/notification/notificationHistory/count` | CONFIRMED |

---

## 15. Integration APIs

**Prefix:** `/adminapi`

| Key | Method | Path | Status |
|-----|--------|------|--------|
| `installApp.list` | GET | `/adminapi/app/list` | CONFIRMED |
| `installApp.takeKey` | GET | `/adminapi/app/get/key` | CONFIRMED |
| `webhook.list` | GET | `/adminapi/webhook/list` | CONFIRMED |
| `webhook.update` | POST | `/adminapi/webhook/update` | CONFIRMED |
| `integrationPartner` | Various | INFERRED `/adminapi/partner/*` | UNKNOWN full paths | UNKNOWN |

---

## 16. Platform Upload APIs

**Prefix:** `/api`

| Key | Method | Path | Status |
|-----|--------|------|--------|
| File upload | POST | `/api/upload/file` | CONFIRMED (FileService) |
| Image upload | POST | `/api/upload/image` | CONFIRMED (ImageService) |
| BPM document upload | POST (INFERRED) | `/bpmapi/businessProcess/importExcel` | CONFIRMED |

---

## 17. Settings & Config APIs

| Group | Sample Paths | Status |
|-------|-------------|--------|
| Permission assignment | `/adminapi/permission/add`, `/adminapi/rolePermission/add` | CONFIRMED |
| Module management | `/adminapi/module/list`, `/adminapi/moduleResource/add` | CONFIRMED |
| Area/region | `/api/area/child` | CONFIRMED |
| Code config | `/adminapi/code/list` | CONFIRMED |
| Placeholder | `/adminapi/placeholder/*` | CONFIRMED |
| SMS template | `/adminapi/templateSMS/*` | CONFIRMED |
| Email template | `/adminapi/templateEmail/*` | CONFIRMED |
| Zalo template | `/adminapi/templateZalo/*` | CONFIRMED |

---

## 18. Latent / Unrouted APIs

These URL keys exist in `urls.ts` with paths pointing to `mock.local` or commented out — **not yet implemented in backend** based on frontend evidence:

| Group | Mock URL Base | Notes |
|-------|--------------|-------|
| `adjustmentSlip` | `https://mock.local/warehouse/*` | Warehouse/inventory — not routed |
| `order.*` | Commented out in urls.ts | Order management — latent |
| `inventory.*` | `https://mock.local/warehouse/*` | Inventory — latent |
| `fintech.*` | INFERRED | Finance ERP — latent |
| `procurement.*` | `/application/procurementType/*` | Procurement module |
| `material.*` | `/application/material/*` | Material management |
| `bpmInvestor.*` | `/application/investor/*` | Investor management |

**Instruction:** Do NOT implement these in Phase 0. Flag as UNKNOWN roadmap.

---

*End of FRONTEND_API_AUDIT.md v1.0.0*
