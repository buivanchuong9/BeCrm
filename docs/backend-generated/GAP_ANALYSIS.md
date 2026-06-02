# GAP_ANALYSIS.md
## CareFollow Backend — Gap Analysis

**Phase:** 3 — Gap Identification Between Frontend Contracts and Architecture Documents
**Generated:** 2026-06-01
**Sources:**
- `FRONTEND_API_AUDIT.md` (Phase 2 output)
- `ARCHITECTURE_RECONCILIATION.md` (Phase 1 output)
- `ARCHITECTURE_SPECIFICATION.md`, `CONTEXT_MAP.md`, `DDD_MODEL.md`, `MICROSERVICE_EVOLUTION_PLAN.md`
- `DATABASE_STRATEGY.md`, `CRM_DATABASE.md`, `TICKET_DATABASE.md`, `WARRANTY_DATABASE.md`

**Rule:** Only classify gaps observed from CONFIRMED frontend contracts vs architecture documents. No business rules invented. All unresolved items marked as UNKNOWN: `REQUIRES PRODUCT DECISION`.

---

## Table of Contents

1. [BLOCKER Gaps](#1-blocker-gaps)
2. [HIGH Gaps](#2-high-gaps)
3. [MEDIUM Gaps](#3-medium-gaps)
4. [LOW Gaps](#4-low-gaps)
5. [Implementation Readiness by Module](#5-implementation-readiness-by-module)
6. [API Prefix Resolution Plan](#6-api-prefix-resolution-plan)
7. [Pre-Implementation Checklist](#7-pre-implementation-checklist)

---

## 1. BLOCKER Gaps

Gaps in this section **must be resolved before writing any code** for the affected module. Implementation would require invented business rules.

---

### BLOCKER-01: WorkOrder State Machine

**Gap:** `IUpdateStatusRequest` sends `{id, status: number}`. Frontend shows 5 status values (0, 1, 2, 4, and implied 3) with confirmed operations: pause, reject, recall, continue. The exact state transitions are not documented.

**Frontend evidence:**
- `updatePause` → `/workOrder/update/pause`
- `updateReject` → `/adminapi/bpmForm/reject` (cross-prefix — note: reject goes through bpmForm, not workOrder)
- `onWorkRecall` → `/bpmapi/workOrder/recall`
- `confirmWorkRecall` → `/bpmapi/workOrder/recall/confirm`
- `updateStatus` → `/adminapi/workOrder/update/status`

**Missing:**
- What status value does `reject` produce?
- What status value does `recall` produce vs `confirmRecall`?
- Is status 3 "cancelled" reachable from all states or only specific ones?
- Can a Completed (2) WorkOrder be recalled?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** BPM WorkOrder module (RT-02)

---

### BLOCKER-02: Ticket ↔ BPM Coupling

**Gap:** `CONTEXT_MAP.md` explicitly marks this UNKNOWN (dashed arrow). Two distinct process systems exist:
1. `TicketProc` / `TicketStep` (custom support procedure via `/support`, `/ticketStep` APIs) — lives in `ticket` schema
2. BPM `ProcessDefinition` / `WorkOrder` (full BPMN engine via `/bpmapi`) — lives in `bpm` schema

`ITicketRequestModel.processId` field exists on ticket response. `updateAndInit` endpoint (`/ticket/update-and-init`) suggests tickets can trigger a process. But which process engine?

**Frontend evidence:**
- `ticket.updateAndInit` → `/adminapi/ticket/update-and-init` (adminapi, not bpmapi)
- `KanbanWarrantyProcess` component uses `KanbanBpm` component — shared UI between care and BPM kanban
- `processId` on `ITicketResponseModel` — which process? TicketProc or BPM ProcessInstance?

**Missing:**
- Does `ticket/update-and-init` create a BPM ProcessInstance or a TicketProc execution?
- Is `processId` on Ticket a `ticket.ticket_procedures.id` or a `bpm.process_instances.id`?
- Are they mutually exclusive or can a Ticket have both?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** care-ticket module, BPM integration design

---

### BLOCKER-03: Warranty ↔ BPM Coupling

**Gap:** Same problem as BLOCKER-02 but for Warranty. `IWarrantyResponseModel.processId` exists. `warranty/update-and-init` not found in urls.ts but pattern is identical to ticket.

**Frontend evidence:**
- `warranty.warrantyProcess` → `/adminapi/warrantyProcess/update` — separate from BPM process
- `objectType: 2` used in `SupportCommonService` calls from warranty pages — uses separate execution model (support_objects/support_logs)
- But `KanbanWarrantyProcess` uses the same BPM Kanban component

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** care-warranty module

---

### BLOCKER-04: Dual Approval System

**Gap:** Two approval mechanisms identified:
1. **Approval Engine** (`ApprovalService`, `SettingProcess/ApprovalList`) — signer graph with employee node IDs 0/-1/-2
2. **BPM Form type 2/4** — "Phê duyệt" form type inside BPM UserTask node

**Missing:**
- Which domain objects (tickets, warranties, work orders, customer changes?) enter the Approval Engine?
- Which objects use BPM form type 2/4?
- Is the Approval Engine a layer on top of BPM or separate?
- Can an object have both an Approval Engine instance and a BPM task simultaneously?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** approval module, BPM form config

---

### BLOCKER-05: Permission Hydration After SSO

**Gap:** Frontend loads permissions via `GET /adminapi/permission/resource`. The exact mechanism for populating these after SSO authentication is UNKNOWN.

**Frontend evidence:**
- `utils/auth.ts` — reads permissions from local state
- `fetchConfig.ts` — sends `Authorization` bearer + `Selectedrole` header on every request
- `ChooseRole` page — user selects `{departmentId}_{roleId}` which triggers app reload

**Missing:**
- Is SSO external (redirect-based) or internal token exchange?
- Does the backend call an external SSO provider to validate the token?
- Does permission hydration happen on login or on role selection?
- Is the permission catalog cached per session or re-fetched per request?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** identity-access module, all guard implementations

---

### BLOCKER-06: Tenant Model

**Gap:** `bsnId` appears on nearly every model in the legacy system. Architecture documents prescribe `tenant_id UUID` on all tables. The relationship between `bsnId` and `tenant_id` is not specified.

**Frontend evidence:**
- `bsnId: number` on `ICustomerResponse`, `IContactResponse`, `ICampaignResponseModel`, `IWarrantyCategoryResponse`, `ITicketCategoryResponse`, etc.
- `checkSubdomainTNEX`, `checkSubdomainGREENSPA` — suggest tenant-specific feature flags
- `beautySalon.list` + `beautySalon.approve` — suggest multi-branch or multi-tenant clinic model

**Missing:**
- Is `bsnId` a clinic/organization ID (1 clinic = 1 tenant)?
- Are there multiple clinics per `bsnId` (branch vs tenant)?
- Row-level tenancy vs schema-per-tenant?
- Does TNEX subdomain mean different tenant or different feature set on same tenant?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION
**Blocking:** ALL modules (tenant_id on all tables)

---

## 2. HIGH Gaps

Gaps that must be resolved before implementing the specific module, but do not block other modules.

---

### HIGH-01: WorkOrder Dual-Prefix Conflict (CON-01)

**Gap:** WorkOrder APIs exist under both `/adminapi/workOrder/*` and `/bpmapi/workOrder/*`. The `userTask` config uses `/bpmapi` for list/detail and `/adminapi` for updates. This is not a clean design.

**Impact:** Cannot determine which service "owns" WorkOrder writes. If both prefixes go to different services, writes at one prefix might not be visible at the other.

**Action Required:** Choose one authoritative owner. Recommend: `bpmapi` owns WorkOrder (it's a BPM aggregate); `adminapi` proxies read-heavy queries for admin dashboard use. REQUIRES ARCHITECTURE DECISION.

---

### HIGH-02: TicketProc / WarrantyProc Share the Same `/support` API

**Gap:** Both `ticketProc` and `warrantyProc` in `urls.ts` map to `/adminapi/support/list`. Differentiation mechanism (type field?) is UNKNOWN from frontend.

**Frontend evidence:**
- `ticketProc.list: prefixAdmin + "/support/list"` (urls.ts:1661)
- `warrantyProc.list: prefixAdmin + "/support/list"` (urls.ts:1627)
- `WarrantyProcList.tsx` uses `type: 2` filter — CONFIRMED

**Action Required:** Confirm that `type=1` = Ticket procedure, `type=2` = Warranty procedure. Backend must enforce this discriminator at the API layer.

---

### HIGH-03: BPM Form Rejection Uses adminapi Prefix

**Gap:** `workOrder.updateReject` → `prefixAdmin + "/bpmForm/reject"` — reject is a BPM operation but hits the adminapi prefix, not bpmapi.

**Impact:** If admin service and BPM service are separate processes (Phase 3+), rejection requests will fail after extraction.

**Action Required:** Clarify which service handles `bpmForm/reject`. If it belongs to BPM, the correct path is `prefixBpm + "/bpmForm/reject"`. REQUIRES ARCHITECTURE DECISION.

---

### HIGH-04: `processId` on ITicketResponseModel

**Gap:** `processId: number` on `ITicketResponseModel`. This could reference:
1. A `bpm.process_instances.id` (BPM instance)
2. A `ticket.ticket_procedures.id` (local ticket procedure)

**Action Required:** Confirm field semantics. Related to BLOCKER-02.

---

### HIGH-05: WorkInprogress Prefix Split (CON-02)

**Gap:** `workOrder` config uses `/adminapi/workInprogress/*`; `userTask` config uses `/sale/workInprogress/*`. Cannot determine canonical prefix.

**Action Required:** Consolidate under one prefix. Recommend `/adminapi/workInprogress/*`. REQUIRES ARCHITECTURE DECISION.

---

### HIGH-06: `warranty.overview` Endpoint

**Gap:** `GET /adminapi/warranty/get/overview` exists in `urls.ts` but is not used in any service file and has no TypeScript model.

**Action Required:** Determine if this endpoint is needed for the dashboard. UNKNOWN use case — defer until page that uses it is identified.

---

### HIGH-07: `bsmForm.init` vs `bpmForm.activate`

**Gap:** Two similar task execution endpoints:
- `bpmForm/init` — called from `updateHandleTaskInit`
- `bpmForm/activate` — called from `updateHandleTask`

**Missing:** What is the difference? Is `init` a preliminary step before `activate`? Or are they for different task types?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION for BPM task lifecycle.

---

### HIGH-08: PII Masking Strategy

**Gap:** `phoneMasked`/`phoneUnmasked` and `emailMasked` exist on `ICustomerResponse` but the backend policy for when to return masked vs unmasked is not defined.

**Missing:**
- Which roles see unmasked data?
- Is unmasking a separate API call or a permission-based response transformer?

**Action Required:** UNKNOWN — REQUIRES PRODUCT DECISION + security review.

---

## 3. MEDIUM Gaps

Gaps that should be resolved before the module is ready for production but do not block initial development.

---

### MEDIUM-01: Idempotency on Public Forms

**Gap:** Public endpoints `/ticket/send/jssdk` and `/warranty/send/jssdk` have no idempotency strategy visible in frontend contracts.

**Risk:** Duplicate ticket/warranty creation from network retries or double-clicks.

**Action Required:** Implement idempotency key in request header. REQUIRES SECURITY REVIEW.

---

### MEDIUM-02: `stateMapping` Code Semantics

**Gap:** `stateMapping` endpoint exists (`/bpmapi/stateMapping/list`). DDD_MODEL.md notes "locked codes 0–5 (CONFIRMED UI); custom > 5". The meaning of each locked code is UNKNOWN.

**Action Required:** UNKNOWN — REQUIRES BPM PRODUCT DECISION.

---

### MEDIUM-03: BPM `potId` Type

**Gap:** `potId` is used as a string in mock data (`"HS-0001"`) and as a UUID in architecture documents. The actual backend type is UNKNOWN.

**Action Required:** Confirm whether `potId` is a UUID (as per database strategy) or a human-readable code. If both, which is the identifier and which is the display code?

---

### MEDIUM-04: FormDefinition Schema Format

**Gap:** `form_definitions.schema` JSONB — architecture documents don't confirm whether this is Form.io JSON, custom schema, or another standard.

**Frontend evidence:** `bpmForm/activate` sends `formData` — suggests Form.io or similar JSON form submission.

**Action Required:** UNKNOWN — REQUIRES BPM TECHNICAL DECISION.

---

### MEDIUM-05: `node_config` JSONB Shapes

**Gap:** 35+ BPMN node types each have different config shapes. None are confirmed in frontend TypeScript models (all use `any` in service calls).

**Action Required:** Document config shape for each node type before implementing BPM node storage. UNKNOWN — REQUIRES BPM SPECIFICATION.

---

### MEDIUM-06: Customer Financial Fields Ownership

**Gap:** `fee`, `paid`, `debt`, `returnedFee` on `ICustomerResponse` — Finance module owns these but Finance backend is not implemented (mock.local URLs). These fields must be served somehow in Phase 0.

**Options:**
1. CRM temporarily owns these as denormalized fields
2. Reporting projection computes them from invoice data
3. Finance module is partially implemented for Phase 0

**Action Required:** UNKNOWN — REQUIRES PRODUCT + FINANCE DECISION.

---

### MEDIUM-07: `WarrantyCategory.status` Field

**Gap:** `IWarrantyCategoryResponse.status: any` — type is `any`, meaning the shape is genuinely unknown. Status values not documented.

**Action Required:** UNKNOWN — REQUIRES WARRANTY PRODUCT DECISION.

---

### MEDIUM-08: Survey Spam/Auth Rules

**Gap:** Public route `/link_survey` confirmed but no rate limiting or auth requirements visible in frontend.

**Action Required:** REQUIRES SECURITY REVIEW before production.

---

### MEDIUM-09: KPI Calculation Engine

**Gap:** All KPI formula, period, and scoring logic is UNKNOWN. Only CRUD endpoints confirmed.

**Action Required:** UNKNOWN — REQUIRES KPI PRODUCT DECISION. Do not implement calculation logic until specified.

---

### MEDIUM-10: Commission Calculation for Earnings

**Gap:** `EarningsService` confirmed but business rules for earning/commission calculation are UNKNOWN.

**Action Required:** UNKNOWN — REQUIRES FINANCE PRODUCT DECISION.

---

### MEDIUM-11: `purchaseRequest.approve` / `purchaseRequest.draft`

**Gap:** Two endpoints in BPM config: `/bpmapi/purchaseRequest/approve` and `/bpmapi/purchaseRequest/draft`. These suggest a Purchase Request aggregate inside BPM — not documented in any architecture document.

**Action Required:** UNKNOWN — REQUIRES BPM SPECIFICATION. May be a procurement sub-feature inside BPM.

---

## 4. LOW Gaps

Non-blocking gaps that can be addressed during normal development.

---

### LOW-01: `businessProcess.detail` vs `businessProcess.get`

**Gap:** Two endpoints: `GET /bpmapi/businessProcess/get?id=` and `GET /bpmapi/businessProcess/detail?id=`. Difference is UNKNOWN.

**Action Required:** Implement both; return same shape or document difference.

---

### LOW-02: WorkOrder Export APIs (OLA/SLA)

**Gap:** `exportOLA: prefixBpm + "/ola/export"` and `exportSLA: prefixBpm + "/sla/export"`. Response format (CSV/Excel) not specified.

**Action Required:** Implement as file download. Format UNKNOWN.

---

### LOW-03: `bpmReason` APIs

**Gap:** `/bpmapi/bpm/listReason`, `/bpmapi/bpm/updateReason` — what are "reasons" in BPM context?

**Action Required:** UNKNOWN — likely rejection/cancellation reasons for work orders.

---

### LOW-04: `dataSupplySource` Filter Settings

**Gap:** `/adminapi/filter-setting/list` under `dataSupplySource` — purpose UNKNOWN.

**Action Required:** UNKNOWN — likely dashboard filter presets.

---

### LOW-05: `subsystemAdministration` Module Management

**Gap:** `/adminapi/module/list`, `/adminapi/moduleResource/add` — system module admin, scope UNKNOWN.

**Action Required:** Implement as admin-only configuration endpoints. Business rules UNKNOWN.

---

### LOW-06: `qrCode` APIs in SettingTicket

**Gap:** `GET/POST /adminapi/qrCode/*` for QR code management — tied to ticket intake via QR scan.

**Action Required:** Implement as part of `care-ticket` module settings.

---

## 5. Implementation Readiness by Module

| Module | Readiness | Blockers | Can Start? |
|--------|-----------|---------|------------|
| **shared-kernel** | READY | None | ✅ YES |
| **identity-access** | BLOCKED | BLOCKER-05 (SSO) | ⚠️ JWT/permission structure only; SSO integration blocked |
| **organization** | READY (partial) | None for CRUD | ✅ YES — CRUD only; permission clone deferred |
| **crm** | READY | BLOCKER-06 (tenant) affects schema | ⚠️ YES after tenant model decision |
| **care-ticket** | BLOCKED | BLOCKER-02, BLOCKER-06 | ❌ Core ticket CRUD only; process coupling blocked |
| **care-warranty** | BLOCKED | BLOCKER-03, BLOCKER-06 | ❌ Core warranty CRUD only; process coupling blocked |
| **bpm (design-time)** | READY (partial) | BLOCKER-04, MEDIUM-04, MEDIUM-05 | ⚠️ ProcessDefinition + node storage; form schema blocked |
| **bpm (runtime)** | BLOCKED | BLOCKER-01, BLOCKER-02, BLOCKER-03 | ❌ WorkOrder CRUD only; state machine blocked |
| **approval** | BLOCKED | BLOCKER-04 | ❌ Cannot start until dual-approval resolved |
| **notification** | READY | None confirmed | ✅ YES — FCM device registration + history |
| **reporting** | DEFERRED | Depends on events from 4–8 | 🔄 Start projections when source modules ready |
| **kpi** | BLOCKED | MEDIUM-09 | ❌ CRUD only; calculation engine blocked |
| **communication** | READY (partial) | None for channel config | ⚠️ YES — channel CRUD; chat/call adapters need SLA design |
| **integration** | READY | None for CRUD | ✅ YES — Partner + Webhook CRUD |
| **platform-upload** | READY | None | ✅ YES |
| **campaign-survey** | READY (partial) | MEDIUM-08 (spam rules) | ⚠️ YES — CRUD; public survey security review needed |
| **finance** | BLOCKED | MEDIUM-06 | ❌ Cannot implement until financial field ownership resolved |

---

## 6. API Prefix Resolution Plan

Before writing route handlers, the following prefix conflicts must be resolved:

| Conflict | Frontend Evidence | Recommended Resolution |
|----------|------------------|----------------------|
| CON-01: WorkOrder in both `/adminapi` and `/bpmapi` | `urls.ts` workOrder + userTask configs | BPM owns WorkOrder; adminapi proxies list for dashboard. REQUIRES DECISION |
| CON-02: WorkInprogress in `/adminapi` and `/sale` | `urls.ts` workOrder vs userTask | Consolidate under `/adminapi`. `/sale` is legacy. REQUIRES DECISION |
| CON-03: Employee managers/assignees in `/adminapi` and `/system` | `urls.ts` workOrder vs userTask | Consolidate under `/adminapi`. REQUIRES DECISION |
| CON-04: KANBAN_V2 permission shared by Ticket and Warranty | Both use same permission code | Single permission; both care modules check it. INFERRED OK |
| CON-05: ProcessDefinition.status vs stateMapping codes | DDD_MODEL + urls.ts | Separate concerns: `status` = template lifecycle; `stateMapping` = runtime state. INFERRED OK |
| CON-06: Customer financial fields | ICustomerResponse + mock finance URLs | CRM caches finance projection until Finance module built. REQUIRES DECISION |
| CON-07: Commented-out legacy workOrder config | urls.ts lines 1707–1748 | New active config supersedes. Old paths may need backward compat. REQUIRES DECISION |

---

## 7. Pre-Implementation Checklist

### Must resolve BEFORE any module code is written:

- [ ] **BLOCKER-06**: Tenant model — confirm `bsnId` → `tenant_id` mapping, row-level vs schema-per-tenant
- [ ] **CON-01**: WorkOrder prefix ownership — adminapi or bpmapi canonical?
- [ ] **BLOCKER-05**: SSO integration approach — external provider, token exchange, permission hydration flow

### Must resolve BEFORE specific module code:

- [ ] **BLOCKER-02/03**: Ticket/Warranty → BPM coupling (before care-ticket and bpm modules)
- [ ] **BLOCKER-01**: WorkOrder state machine (before bpm runtime module)
- [ ] **BLOCKER-04**: Dual approval system (before approval module)
- [ ] **MEDIUM-04**: BpmForm schema format (before bpm form module)
- [ ] **MEDIUM-06**: Customer financial fields ownership (before finance module)

### Can be deferred to Phase 1 hardening:

- [ ] **MEDIUM-01**: Idempotency on public forms
- [ ] **HIGH-08**: PII masking strategy
- [ ] **MEDIUM-02**: stateMapping code semantics
- [ ] **MEDIUM-03**: potId type (UUID vs string)
- [ ] **MEDIUM-08**: Survey spam/auth rules

### DO NOT implement (await product):

- [ ] KPI calculation formulas (MEDIUM-09)
- [ ] Commission calculation (MEDIUM-10)
- [ ] Purchase request sub-flow in BPM (MEDIUM-11)
- [ ] Finance/Warehouse ERP modules (all latent)
- [ ] AI data scope (MEDIUM-05 equivalent)

---

## Summary Counts

| Severity | Count | Resolved | Blocked |
|----------|-------|---------|---------|
| BLOCKER | 6 | 0 | 6 |
| HIGH | 8 | 0 | 8 |
| MEDIUM | 11 | 0 | 11 |
| LOW | 6 | 0 | 6 |
| **Total** | **31** | **0** | **31** |

**Implementation can begin on:**
- `shared-kernel` ✅
- `platform-upload` ✅
- `notification` (FCM + history only) ✅
- `organization` (CRUD only) ✅ after tenant decision
- `crm` (Customer + Contact CRUD) ✅ after tenant decision
- `integration` (Partner + Webhook CRUD) ✅

**All other modules require at least one BLOCKER resolution.**

---

*End of GAP_ANALYSIS.md v1.0.0*
*Next action: Resolve BLOCKER-06 (tenant model) → BLOCKER-05 (SSO) → then begin shared-kernel implementation*
