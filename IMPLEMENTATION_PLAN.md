# Implementation Plan

**Goal:** 100% frontend-compatible backend  
**Current:** 83% route coverage + 6 P0 contract mismatches

---

## Phase 1: P0 Response Contract Fixes (< 1 hour, ~50 LOC)

All fixes in existing service files. No new files needed.

### 1.1 Notification Service
**File:** `src/modules/notification/notification.service.ts`  
- `list()`: add `unread`, `timeReceived`, `type`, `workId`, `projectName` aliases
- `countUnread()`: return plain `count` number, not `{ count }`

### 1.2 BPM Template Service + Controller
**Files:**
- `src/modules/bpm/template/bpm-template.service.ts` — `getById()`: `configs: template.edges`
- `src/modules/bpm/template/bpm-template.controller.ts` — add `@Get('businessProcess/list')` camelCase

### 1.3 WorkOrder Service
**File:** `src/modules/organization/work/work.service.ts`  
- `listWorkOrders()`: map `startTime=startDate, endTime=dueDate, createdTime=createdAt, name=title`
- `getWorkOrder()`: same + `ola: null, docLink: '[]', reviews: '[]'`

### 1.4 CustomerExchange Service
**File:** `src/modules/organization/customer/customer.service.ts`  
- `listExchanges()`: add `createdTime, employeeId, employeeUserId, employeeName, employeeAvatar`

---

## Phase 2: P1 Missing Routes (~2 hours, ~200 LOC)

### 2.1 Saleflow Missing Endpoints
**File:** `src/modules/crm/saleflow/saleflow.controller.ts`  
Add: `saleflowApproach/list`, `saleflowApproach/get`, `saleflowActivity/list`,
`saleflowExchange/list`, `saleflowExchange/get`, `saleflowInvoice/get`,
`saleflowInvoice/delete`, `saleflowInvoice/update/approach`, `saleflowInvoice/update/cancel`,
`saleflowInvoice/update/success`, `saleflowSale/get/byApproachId`, `saleflowSale/update`

### 2.2 Treatment Missing Endpoints
**File:** `src/modules/crm/schedule/schedule.controller.ts`  
Add: `treatmentHistory/list_all`, `treatmentHistory/list_by_customer`, `treatmentHistory/get`,
`treatmentRoom/get`, `treatmentRoom/check`, `treatmentTime/list_schedule_next`,
`treatmentTime/get_byscheduler`, `treatmentTime/update_next`, `treatmentTime/update_caring_employee`,
`scheduleConsultant/get`, `scheduleTreatment/get`

### 2.3 Customer Contract Fixes
**File:** `src/modules/organization/customer/customer.service.ts`  
- Add `phoneMasked`, `custType=0`, `relationshipId/Name/Color` stubs to list/detail mappers
- Add `mapCustomerAttribute` builder
- Fix `avatar = avatarUrl`
- Fix `gender` string→number

### 2.4 Relationship Color Fix
**File:** `src/modules/organization/misc/misc.service.ts`  
- `listRelationships()`: add `color`, `colorText` using default palette by position

---

## Phase 3: P2 Missing Routes (~3 hours, ~400 LOC)

### 3.1 KPI Missing Endpoints
**File:** `src/modules/crm/kpi/kpi.controller.ts`  
Add: `kpi/list`, `kpi/update`, `kpi/delete`, `kpiApply/list`, `kpiApply/update`,
`kpiApply/delete`, `kpiApply/get/byCampaignId`, `kpiGoal/list`, `kpiGoal/get`,
`kpiObject/get`, `kpiObject/get/byObject`, `kpiObject/employee/result`, `kpiObject/update/web`,
`kpiSetupObject/list/byKotId`, `kpiSetupObject/update/web`, `kpiTemplateGoal/list`,
`kpiExchange/get`, `kpiExchange/update`, `kpiExchange/delete`,
`kpiDatasource/update`, `kpiDatasource/delete`

### 3.2 Campaign Dashboard Endpoints
**File:** `src/modules/crm/campaign/campaign.controller.ts`  
Add: `campaignOpportunity/statisticConvertRate`, `totalByApproach/dashboard`,
`totalByDate/dashboard`, `totalExpectedRevenue/dashboard`, `campaign/sale-point-config/get+update`,
`campaignOpportunity/check`, `campaignOpportunity/exportAction/Result`

### 3.3 Mailbox Module (new)
**Files:** Create `src/modules/crm/mailbox/` with controller + service  
Endpoints: `mailbox/list`, `get`, `update`, `delete`, `viewer`, `update/viewer`,
`mailboxExchange/list`, `update`, `delete`

### 3.4 Scattered Missing Endpoints
Add to respective controllers:
- `notificationHistory/get`
- `contactPipeline/get`, `contactStatus/get`
- `brandname/get`, `qrCode/get`
- `smsRequest/approve`, `smsRequest/cancel`
- `emailRequest/approve`, `emailRequest/cancel`
- `requestPermission/list/source`, `list/target`, `update/approved`, `update/rejected`
- `rolePermission/add`, `info`, `remove`
- `permission/clone`
- `opportunityExchange/get`
- `workOrder/report`
- `scheduleConsultant/get`
- Many more (~80 total)

---

## Phase 4: P3 Cleanup

- Remove TODO comments from stubbed stubs that have actual implementation
- Add Swagger docs to all new endpoints
- Verify all pagination uses `buildPagedResult`

---

## Risk Assessment

| Phase | Risk | Reason |
|-------|------|--------|
| Phase 1 | Low | Only mapper changes, no new tables |
| Phase 2 | Low-Medium | New routes reuse existing services |
| Phase 3 | Medium | New modules, new queries |
| Phase 4 | Low | Documentation only |
