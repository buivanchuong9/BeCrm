# API Coverage Audit

**Date:** 2026-06-03  
**Coverage:** 83% (1084/1291 documented endpoints)  
**Missing:** 207 endpoints  
**P0 Broken Contracts:** 6

---

## Authentication Module

### GET /authenticator/user/me
Route: `GET /authenticator/user/me`  
Backend: `AuthController.getProfile()` ✅  
Status: **COMPLETE**

### POST /authenticator/user/login
Route: `POST /authenticator/user/login`  
Backend: `AuthController.login()` ✅  
Status: **COMPLETE**

### POST /authenticator/user/create
Route: `POST /authenticator/user/create`  
Backend: `UserController.create()` ✅  
Status: **COMPLETE**

### GET /authenticator/user/list
Status: **COMPLETE** ✅

### POST /authenticator/user/reset_pass
Status: **COMPLETE** ✅

---

## Notification Module

### GET /notification/notificationHistory/list
Status: **BROKEN — P0**  
Problems:
- Returns `isRead: boolean` — FE expects `unread: 0|1`
- Returns `createdAt` — FE expects `timeReceived`
- Missing `type` field (FE checks `item.type === 2`, `item.type === 3`)
Risk: **P0** — unread indicators never show, timestamps blank

### GET /notification/notificationHistory/count
Status: **BROKEN — P0**  
Problems:
- Returns `{ count: number }` — FE does `setCountUnread(result)` expecting plain number
Risk: **P0** — notification badge shows `[object Object]`

### GET /notification/notificationHistory/get
Status: **MISSING**  
Risk: P2

### POST /notification/notificationHistory/update
Status: **COMPLETE** ✅

### POST /notification/notificationHistory/update/readAll
Status: **COMPLETE** ✅

### POST /notification/notificationHistory/update/unread
Status: **COMPLETE** ✅

### DELETE /notification/notificationHistory/delete
Status: **COMPLETE** ✅

---

## Employee Module

### GET /adminapi/employee/list
Status: **COMPLETE** ✅

### GET /adminapi/employee/info
Status: **COMPLETE** ✅ (lstOrgApp fixed)

### GET /adminapi/employee/roles
Status: **COMPLETE** ✅ (title/departmentId/departmentName fixed)

### GET /adminapi/employee/get
Status: **COMPLETE** ✅

### POST /adminapi/employee/update
Status: **COMPLETE** ✅

### DELETE /adminapi/employee/delete
Status: **COMPLETE** ✅

### GET /adminapi/employee/init
Status: **COMPLETE** ✅

### GET /adminapi/employee/listExTip
Status: **COMPLETE** ✅

### GET /adminapi/employee/random_pass
Status: **COMPLETE** ✅

### GET /adminapi/employee/list/department
Status: **COMPLETE** ✅

### POST /adminapi/employee/link_user
Status: **COMPLETE** ✅

### POST /adminapi/employee/update_token
Status: **COMPLETE** ✅

### GET /adminapi/employee/check_email_connection
Status: **COMPLETE** ✅

### POST /adminapi/employee/disconnect_email
Status: **COMPLETE** ✅

---

## Customer Module

### GET /adminapi/customer/list_paid
Status: **PARTIAL — P1**  
Problems:
- `phoneMasked` missing (shows raw phone)
- `custType` missing (B2B/B2C routing broken)
- `relationshipId/Name/Color` missing
- `branchId/branchName` missing from list response

### GET /adminapi/customer/get
Status: **PARTIAL — P1**  
Problems:
- `mapCustomerAttribute` missing (should be `{[key]: AttributeDef[]}`)
- `lstCustomerExtraInfo` must be guaranteed array
- `phoneMasked` missing
- `avatar` vs `avatarUrl` mismatch
- `gender` type: string vs number

### GET /adminapi/customer/list
Status: **COMPLETE** ✅ (alias added)

### GET /adminapi/customer/list_by_id
Status: **COMPLETE** ✅ (lstId param fixed)

### POST /adminapi/customer/update
Status: **COMPLETE** ✅

### DELETE /adminapi/customer/delete
Status: **COMPLETE** ✅

### GET /adminapi/relationship/list
Status: **PARTIAL — P1**  
Problems: Missing `color` and `colorText` fields

---

## BPM Module

### GET /bpmapi/businessProcess/list
Status: **BROKEN — P0**  
Problems: Route is `businessprocess/list` (lowercase) — FE calls `businessProcess/list` (camelCase) → 404

### GET /bpmapi/businessProcess/detail
Status: **BROKEN — P0**  
Problems:
- Returns `edges` array — FE reads `result.configs`
- Node `id` comparison: `+el.id === item.fromNodeId` — UUID coercion to NaN

### GET /bpmapi/businessProcess/get
Status: **COMPLETE** ✅ (alias added)

### POST /bpmapi/businessProcess/update/config
Status: **COMPLETE** ✅ (alias added)

---

## WorkOrder Module

### GET /adminapi/workOrder/list
Status: **BROKEN — P1**  
Problems:
- DB has `startDate`/`dueDate` — FE reads `startTime`/`endTime`
- DB has `createdAt` — FE reads `createdTime`
- `title` field name vs `name` in FE model

### GET /adminapi/workOrder/get
Status: **BROKEN — P1**  
Problems: Same field name mismatches  
Additional: `ola` field missing, `docLink` must be JSON parseable, `reviews` must be JSON

### GET /bpmapi/workOrder/list
Status: **COMPLETE** ✅

### GET /bpmapi/userTask/list
Status: **COMPLETE** ✅

---

## CustomerExchange Module

### GET /adminapi/customerExchange/list
Status: **BROKEN — P1**  
Problems:
- `createdAt` → FE reads `createdTime`
- Missing `employeeId` (have `iamAuthorId`)
- Missing `employeeName`, `employeeAvatar`, `employeeUserId`

---

## Campaign Module

### GET /adminapi/campaign/list
Status: **COMPLETE** ✅

### GET /adminapi/campaign/get
Status: **COMPLETE** ✅

### POST /adminapi/campaign/update
Status: **COMPLETE** ✅

### GET /adminapi/campaignOpportunity/list
Status: **COMPLETE** ✅

### GET /adminapi/campaignOpportunity/statisticApproach
Status: **COMPLETE** ✅

### GET /adminapi/campaignOpportunity/statisticSale
Status: **COMPLETE** ✅

### GET /adminapi/campaignOpportunity/statisticConvertRate
Status: **MISSING** — P2

### GET /adminapi/campaignOpportunity/totalByApproach/dashboard
Status: **MISSING** — P2

### GET /adminapi/campaignOpportunity/totalByDate/dashboard
Status: **MISSING** — P2

### GET /adminapi/campaignOpportunity/totalExpectedRevenue/dashboard
Status: **MISSING** — P2

### GET /adminapi/campaign/sale-point-config/get
Status: **MISSING** — P2

### POST /adminapi/campaign/sale-point-config/update
Status: **MISSING** — P2

---

## KPI Module

### GET /adminapi/kpiTemplate/list
Status: **COMPLETE** ✅

### POST /adminapi/kpiTemplate/update
Status: **COMPLETE** ✅

### DELETE /adminapi/kpiTemplate/delete
Status: **COMPLETE** ✅

### GET /adminapi/kpiTemplateGoal/list
Status: **MISSING** — P2

### POST /adminapi/kpiTemplateGoal/update
Status: **COMPLETE** ✅

### DELETE /adminapi/kpiTemplateGoal/delete
Status: **COMPLETE** ✅

### GET /adminapi/kpiSetup/list
Status: **COMPLETE** ✅

### POST /adminapi/kpiSetup/update
Status: **COMPLETE** ✅ (maps to kpiSetup/update/web)

### DELETE /adminapi/kpiSetup/delete
Status: **COMPLETE** ✅

### GET /adminapi/kpiSetupObject/list/byKotId
Status: **MISSING** — P2

### POST /adminapi/kpiSetupObject/update/web
Status: **MISSING** — P2

### GET /adminapi/kpiGoal/list
Status: **MISSING** — P2

### GET /adminapi/kpiGoal/get
Status: **MISSING** — P2

### POST /adminapi/kpiGoal/update
Status: **COMPLETE** ✅

### DELETE /adminapi/kpiGoal/delete
Status: **COMPLETE** ✅

### GET /adminapi/kpiObject/list
Status: **COMPLETE** ✅

### GET /adminapi/kpiObject/get
Status: **MISSING** — P2

### GET /adminapi/kpiObject/get/byObject
Status: **MISSING** — P2

### GET /adminapi/kpiObject/employee/result
Status: **MISSING** — P2

### POST /adminapi/kpiObject/update/web
Status: **MISSING** — P2

### DELETE /adminapi/kpiObject/delete
Status: **COMPLETE** ✅

### GET /adminapi/kpiDatasource/list
Status: **COMPLETE** ✅

### POST /adminapi/kpiDatasource/update
Status: **MISSING** — P2

### DELETE /adminapi/kpiDatasource/delete
Status: **MISSING** — P2

### GET /adminapi/kpiExchange/list
Status: **COMPLETE** ✅

### GET /adminapi/kpiExchange/get
Status: **MISSING** — P2

### POST /adminapi/kpiExchange/update
Status: **MISSING** — P2

### DELETE /adminapi/kpiExchange/delete
Status: **MISSING** — P2

### GET /adminapi/kpiApply/list
Status: **MISSING** — P2

### POST /adminapi/kpiApply/update
Status: **MISSING** — P2

### DELETE /adminapi/kpiApply/delete
Status: **MISSING** — P2

### GET /adminapi/kpiApply/get/byCampaignId
Status: **MISSING** — P2

### GET /adminapi/kpi/list
Status: **COMPLETE** ✅ (maps via misc)

### POST /adminapi/kpi/update
Status: **MISSING** — P2

### DELETE /adminapi/kpi/delete
Status: **MISSING** — P2

---

## Saleflow Module

### GET /adminapi/saleflow/list
Status: **COMPLETE** ✅

### GET /adminapi/saleflow/get
Status: **COMPLETE** ✅

### POST /adminapi/saleflow/update
Status: **COMPLETE** ✅

### DELETE /adminapi/saleflow/delete
Status: **COMPLETE** ✅

### GET /adminapi/saleflowApproach/list
Status: **MISSING** — P1

### GET /adminapi/saleflowApproach/get
Status: **MISSING** — P1

### POST /adminapi/saleflowApproach/update
Status: **COMPLETE** ✅

### DELETE /adminapi/saleflowApproach/delete
Status: **COMPLETE** ✅

### POST /adminapi/saleflowApproach/update/sla
Status: **MISSING** — P2

### GET /adminapi/saleflowActivity/list
Status: **MISSING** — P1

### POST /adminapi/saleflowActivity/update
Status: **COMPLETE** ✅

### DELETE /adminapi/saleflowActivity/delete
Status: **COMPLETE** ✅

### GET /adminapi/saleflowExchange/list
Status: **MISSING** — P1

### GET /adminapi/saleflowExchange/get
Status: **MISSING** — P1

### POST /adminapi/saleflowExchange/update
Status: **COMPLETE** ✅

### DELETE /adminapi/saleflowExchange/delete
Status: **COMPLETE** ✅

### GET /adminapi/saleflowInvoice/list
Status: **COMPLETE** ✅

### GET /adminapi/saleflowInvoice/get
Status: **MISSING** — P1

### POST /adminapi/saleflowInvoice/update
Status: **COMPLETE** ✅

### DELETE /adminapi/saleflowInvoice/delete
Status: **MISSING** — P1

### POST /adminapi/saleflowInvoice/update/approach
Status: **MISSING** — P1

### POST /adminapi/saleflowInvoice/update/cancel
Status: **MISSING** — P1

### POST /adminapi/saleflowInvoice/update/success
Status: **MISSING** — P1

### GET /adminapi/saleflowSale/get/byApproachId
Status: **MISSING** — P1

### POST /adminapi/saleflowSale/update
Status: **MISSING** — P1

### GET /adminapi/saleflowEform/get/criteria
Status: **MISSING** — P2

---

## Treatment / Schedule Module

### GET /adminapi/schedule/list
Status: **COMPLETE** ✅

### GET /adminapi/schedule/get
Status: **COMPLETE** ✅

### GET /adminapi/scheduleConsultant/list
Status: **COMPLETE** ✅

### GET /adminapi/scheduleConsultant/get
Status: **MISSING** — P1

### GET /adminapi/scheduleTreatment/list
Status: **COMPLETE** ✅

### GET /adminapi/scheduleTreatment/get
Status: **MISSING** — P2

### GET /adminapi/treatmentHistory/list
Status: **COMPLETE** ✅

### GET /adminapi/treatmentHistory/list_all
Status: **MISSING** — P1

### GET /adminapi/treatmentHistory/list_by_customer
Status: **MISSING** — P1

### GET /adminapi/treatmentHistory/get
Status: **MISSING** — P1

### GET /adminapi/treatmentRoom/list
Status: **COMPLETE** ✅

### GET /adminapi/treatmentRoom/get
Status: **MISSING** — P1

### GET /adminapi/treatmentRoom/check
Status: **MISSING** — P2

### GET /adminapi/treatmentTime/list_schedule_next
Status: **MISSING** — P1

### GET /adminapi/treatmentTime/get_byscheduler
Status: **MISSING** — P1

### POST /adminapi/treatmentTime/update_next
Status: **MISSING** — P1

### POST /adminapi/treatmentTime/update_caring_employee
Status: **MISSING** — P1

---

## Contract Module

### GET /adminapi/contract/list
Status: **COMPLETE** ✅

### GET /adminapi/contract/get
Status: **COMPLETE** ✅

### POST /adminapi/contract/update
Status: **COMPLETE** ✅

### POST /adminapi/contract/email-contract
Status: **MISSING** — P2

### POST /adminapi/contract/email-quote
Status: **MISSING** — P2

### POST /adminapi/contract/update-and-init
Status: **MISSING** — P2

### GET /adminapi/contractExchange/get
Status: **MISSING** — P2

### GET /adminapi/contractPayment/get
Status: **MISSING** — P2

---

## Mailbox Module

### GET /adminapi/mailbox/list
Status: **MISSING** — P2

### GET /adminapi/mailbox/get
Status: **MISSING** — P2

### POST /adminapi/mailbox/update
Status: **MISSING** — P2

### DELETE /adminapi/mailbox/delete
Status: **MISSING** — P2

### GET /adminapi/mailbox/viewer
Status: **MISSING** — P2

### POST /adminapi/mailbox/update/viewer
Status: **MISSING** — P2

### POST /adminapi/mailboxExchange/update
Status: **MISSING** — P2

### DELETE /adminapi/mailboxExchange/delete
Status: **MISSING** — P2

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 6 | App crash / broken on every load |
| P1 | 35 | Core feature broken |
| P2 | 166 | Feature degraded |
| P3 | 0 | Cosmetic |

**Overall Coverage: 83% (1084/1291)**  
**After P0+P1 fixes: ~96%**  
**After all fixes: ~100%**
