# ARCHITECTURE_RECONCILIATION.md
## CareFollow Backend — Knowledge Graph & Architecture Reconciliation

**Phase:** 0 + 1 — Discovery & Knowledge Graph
**Generated:** 2026-06-01
**Sources read:**
- `crm/docs/backend-architecture/ARCHITECTURE_SPECIFICATION.md`
- `crm/docs/backend-architecture/CONTEXT_MAP.md`
- `crm/docs/backend-architecture/DDD_MODEL.md`
- `crm/docs/backend-architecture/MICROSERVICE_EVOLUTION_PLAN.md`
- `be/docs/architecture/DATABASE_STRATEGY.md`
- `be/docs/architecture/CRM_DATABASE.md`
- `be/docs/architecture/TICKET_DATABASE.md`
- `be/docs/architecture/WARRANTY_DATABASE.md`
- `crm/src/configs/urls.ts` (3,348 lines)
- `crm/src/services/*.ts` (all service files)
- `crm/src/model/**/*.ts` (all model files)

---

## Table of Contents

1. [Confirmed Facts](#1-confirmed-facts)
2. [Inferred Facts](#2-inferred-facts)
3. [Unknown Facts](#3-unknown-facts)
4. [Conflicts](#4-conflicts)
5. [Bounded Context Inventory](#5-bounded-context-inventory)
6. [API Prefix Map](#6-api-prefix-map)
7. [Schema Ownership Map](#7-schema-ownership-map)
8. [Domain Event Catalog](#8-domain-event-catalog)
9. [Aggregate Ownership Summary](#9-aggregate-ownership-summary)

---

## 1. Confirmed Facts

### Technology
- `C-01` Frontend is a NestJS-deployed React SPA at basename `/crm/`
- `C-02` API gateway is partitioned by URL prefix: `/authenticator`, `/adminapi`, `{APP_BPM_URL}/bpmapi`, `/notification`, `/api`, `/sale`, `/system`, `/cs`, `/hr`, `/application`
- `C-03` BPM has a **separate base URL** configured via `process.env.APP_BPM_URL` — physical separation is already assumed by the frontend
- `C-04` Firebase FCM used for push notifications (`firebase-config.ts`)
- `C-05` PBX/WebRTC endpoint hardcoded: `wss://pbx-athenaspear-prod.athenafs.io:7443`
- `C-06` JWT bearer token in cookie; `SelectedRole` header = `{departmentId}_{roleId}`

### Security Model
- `C-07` Permission keys follow `{RESOURCE}_{ACTION}` format (e.g. `CUSTOMER_VIEW`, `TICKET_ADD`)
- `C-08` Menu visibility gated by `{code}_VIEW` permission
- `C-09` Actions: VIEW, ADD, UPDATE, DELETE, IMPORT, EXPORT
- `C-10` Subdomain flags: `checkSubdomainTNEX` hides dashboard, BPM, reports; `checkSubdomainGREENSPA` etc.
- `C-11` Role selection after login (`ChooseRole`) reloads the app with new `SelectedRole` context

### CRM Context
- `C-12` Customer fields confirmed: id, code, name, gender, age, phone (masked), email (masked), birthday, address, sourceId, employeeId, branchId, profileStatus, fee, paid, debt, avatar
- `C-13` CustomerRelation: `relations[]`, `relationIds[]` — confirmed on ICustomerResponse
- `C-14` Customer dynamic extra attributes via `customerExtraInfos`
- `C-15` Contact has pipeline + status configuration (`contactPipelineId`, `contactStatusId`)

### Ticket Context
- `C-16` Ticket fields: name, customerId, employeeId, departmentId, startDate, endDate, statusId, supportId, content, contentDelta, docLink, executorId, processId
- `C-17` Ticket status integers: 0=Chưa thực hiện, 1=Đang thực hiện, 2=Đã hoàn thành, 4=Tạm dừng (UI CONFIRMED); 3=Đã hủy (inferred from "error" variant)
- `C-18` Ticket public intake: `POST /adminapi/ticket/send/jssdk`
- `C-19` TicketProc = `/support/list` endpoint (shared with warranty, differentiated by type)
- `C-20` SupportObject `objectType: 1` = Ticket; `objectType: 2` = Warranty (confirmed from page source)

### Warranty Context
- `C-21` Warranty fields: employeeId, executorId, departmentId, startDate, endDate, reasonId, docLink, solution, note, customerId, serviceId, statusId
- `C-22` WarrantyCategory type=1 = Kanban columns; type=2 = Reasons (confirmed from AddWarrantyModal source)
- `C-23` Warranty status integers: 0/1/2/4 (same pattern as Ticket); labels CONFIRMED in UI
- `C-24` SupportLog actions: 1=receive, 2=done, 3=rejected (confirmed UI labels)
- `C-25` Warranty public intake: `POST /adminapi/warranty/send/jssdk`

### BPM Context
- `C-26` BPMN 2.0 node types all confirmed from `BpmModals.tsx` (35+ types)
- `C-27` WorkOrder status 0–4 labels confirmed: 0=Not started, 1=In progress, 2=Completed, 4=Paused
- `C-28` WorkflowColumn status: 0=start, 1=in-step, 2=success (confirmed UI)
- `C-29` BpmTrigger statuses: 0,1,2,4,5 (confirmed UI labels)
- `C-30` EngineFlags: isReceived, isProcessed, isPaused, hasJumpOptions, pausedId (confirmed UI gates)
- `C-31` `potId` = external process object identifier — UUID string confirmed in activate body
- `C-32` Form activation: `POST /bpmapi/bpmForm/activate`; draft: `POST /bpmapi/bpmForm/draft`
- `C-33` Task operations: receive, pause (`onhold`), continue, recall (`recall/confirm`), reject
- `C-34` BusinessRule has two modes: `advance` (decision table) and `complex` (bpmAssignmentRule) — confirmed from URL config

### Organization Context
- `C-35` SelectedRole = `{departmentId}_{roleId}` — confirmed format
- `C-36` Permission actions: VIEW, ADD, UPDATE, DELETE, IMPORT, EXPORT — confirmed in UI
- `C-37` Clinic/org settings: `ClinicInfo`, `ClinicCalendar` pages confirmed

### Approval Context
- `C-38` Approval signer graph: employeeId=0 (start), employeeId=-1 (success), employeeId=-2 (failure) — confirmed from ProcedureSupport page
- `C-39` ApprovalStatus: 0=not approved, 1=approved — confirmed from `checkApproved` API

### Infrastructure
- `C-40` Architecture documents prescribe: PostgreSQL multi-schema, UUID PKs, no cross-schema FKs, tenant_id on all tables, soft delete via `deleted_at`, optimistic locking via `row_version`
- `C-41` Deployment topology: Modular Monolith Phase 0 → BPM separate Phase 3
- `C-42` Event bus: EventEmitter in-process Phase 0 → Kafka/RabbitMQ Phase 2

---

## 2. Inferred Facts

### Architecture
- `I-01` The `/adminapi` prefix covers the majority of CRM, Care, Org, KPI, Communication, Reporting — suggests a single "admin service" or reverse-proxy splitting requests by path
- `I-02` The `/sale`, `/system`, `/cs`, `/hr`, `/application` prefixes seen in `urls.ts` suggest additional microservices or path groups beyond the documented `/adminapi`; these may be legacy or partially implemented
- `I-03` The `prefixWarehouse = "https://mock.local/warehouse"` and `prefixFinance = "https://mock.local/finance"` suggest Finance and Warehouse are not yet implemented — mock URLs only
- `I-04` WorkOrder exists in both `/adminapi` and `/bpmapi` with overlapping endpoints — suggests a dual-write or proxy pattern that needs explicit design
- `I-05` The `workCategory`, `material`, `businessCategory`, `supplier`, `procurement` entities use `/application` prefix — suggest a Project/Procurement module beyond core CRM

### Multi-tenancy
- `I-06` `bsnId` appears throughout models as the tenant identifier in the legacy system; maps to `tenant_id` (UUID) in the new design
- `I-07` Subdomain flags (`checkSubdomainTNEX`, `checkSubdomainGREENSPA`) suggest feature toggling per tenant, not separate deployments

### BPM
- `I-08` `stateMapping` with codes 0–5 locked + custom codes > 5 suggests a numeric state machine with reserved system codes
- `I-09` `JumpOption` (`isJump`) allows skipping to non-linear workflow steps — compensation or override mechanism
- `I-10` `serviceLevelHistory` API suggests OLA breach history is tracked separately from the SLA definition

### Finance
- `I-11` `fee`, `paid`, `debt` on `ICustomerResponse` are computed fields from Finance context, projected onto Customer read model — Finance owns the source, CRM displays a cached projection

---

## 3. Unknown Facts

### Critical (must resolve before implementation)

| ID | Unknown | Context | Blocking |
|----|---------|---------|---------|
| `U-01` | Full WorkOrder state machine — what statuses does reject/recall produce? | BPM | WorkOrder lifecycle |
| `U-02` | Ticket/Warranty ↔ BPM coupling — do they share the same process engine or run separate kanban? | Care + BPM | Process design |
| `U-03` | Dual approval systems — BPM form type 2/4 vs separate Approval Engine — which objects use which? | Approval + BPM | Approval routing |
| `U-04` | Permission hydration after SSO — how does the backend populate permission grants for a user? | Identity | Auth implementation |
| `U-05` | ProcessDefinition `status` value set and full state machine | BPM | Process lifecycle |
| `U-06` | ProcessInstance `status` value set and transitions | BPM | Instance lifecycle |
| `U-07` | Tenant isolation model — row-level (tenant_id filter) or schema-per-tenant? | All | Database design |
| `U-08` | Multi-tenancy: is `bsnId` in legacy == one tenant? Or are there tenant hierarchies? | All | Tenant model |

### High Priority

| ID | Unknown | Context |
|----|---------|---------|
| `U-09` | `TicketStatusId` enum — what values does `statusId` take on Ticket? | Ticket |
| `U-10` | `WarrantyStatusId` enum | Warranty |
| `U-11` | KPI calculation formulas and period definitions | KPI |
| `U-12` | Commission/earnings calculation rules | Finance |
| `U-13` | PII masking policy — which fields, which roles see unmasked? | CRM, Identity |
| `U-14` | `stateMapping` server-side numeric code semantics (0–5 reserved) | BPM |
| `U-15` | `objectType` discriminator catalog for ApprovalInstance (which domain objects) | Approval |
| `U-16` | Idempotency requirements on `bpmForm/activate` and public collect forms | BPM, Care |
| `U-17` | `scope` and `taskType` fields on WorkOrder | BPM |
| `U-18` | `iteration` counter max and loop detection strategy in BPM | BPM |

### Medium Priority

| ID | Unknown | Context |
|----|---------|---------|
| `U-19` | Survey auth/spam rules for `/link_survey` (public) | Campaign |
| `U-20` | Data scope of ChatGPT proxy — what customer data is allowed? | AI Assistant |
| `U-21` | Internal mail volume — extract Communication or keep in monolith? | Communication |
| `U-22` | Webhook delivery failure domain — retries, dead letter? | Integration |
| `U-23` | Form.io vs custom JSON schema for BpmForm.schema field | BPM |
| `U-24` | `node_config` JSONB shape per BPMN node type (35+ types) | BPM |
| `U-25` | Whether FormDefinition can be reused across multiple process nodes | BPM |
| `U-26` | `WarrantyCategory.status` field meaning (active/inactive?) | Warranty |
| `U-27` | `WarrantyProcedure.status` value set | Warranty |

---

## 4. Conflicts

| ID | Conflict | Sources | Resolution Owner |
|----|----------|---------|----------------|
| `CON-01` | WorkOrder exists in both `/adminapi/workOrder/*` and `/bpmapi/workOrder/*` with overlapping paths. Which is authoritative? `userTask` config in `urls.ts` uses `/bpmapi` for list/detail and `/adminapi` for updates. | urls.ts lines 1749–1877 | BPM + Admin API team |
| `CON-02` | `workInprogress` endpoints split across `/adminapi` (workOrder config) and `/sale` (userTask config). Unclear which prefix is canonical. | urls.ts | API design team |
| `CON-03` | `employeeManagers` and `employeeAssignees` appear under both `/adminapi/employee/` (workOrder) and `/system/employee/` (userTask). Same resource, different prefixes. | urls.ts | Organization module |
| `CON-04` | Ticket `statusId` references a numeric ID; Warranty uses same pattern. But `KANBAN_V2` permission appears on both Ticket process and Warranty process views — unclear if they share a status catalog or each owns theirs. | CONTEXT_MAP.md C5 | Care + Product |
| `CON-05` | `DDD_MODEL.md §7` says ProcessTemplate `status === 1` = "approved" (CONFIRMED); but `stateMapping` in BPM uses numeric 0–5. Two overlapping status models in one context. | DDD_MODEL.md, urls.ts | BPM |
| `CON-06` | `fee`, `paid`, `debt` on `ICustomerResponse` — Finance context or CRM projection? Architecture spec says Finance is "partial/latent". Mock URLs `https://mock.local/finance` suggest Finance backend not implemented. If Finance is unimplemented, CRM must own these fields temporarily. | ARCHITECTURE_SPECIFICATION.md §3.16 | Finance + CRM |
| `CON-07` | Two `workOrder` config blocks in `urls.ts`: old commented-out block and new active block — legacy migration in progress. Commented endpoints may need to be implemented for backward compatibility. | urls.ts lines 1707–1748 | API team |

---

## 5. Bounded Context Inventory

| # | Context | Schema | Module Path | Phase |
|---|---------|--------|------------|-------|
| 1 | Identity & Access | `identity` | `src/modules/identity-access/` | 0 |
| 2 | Organization & Administration | `org` | `src/modules/organization/` | 0 |
| 3 | CRM — Customer & Contact | `crm` | `src/modules/crm/` | 0 |
| 4 | Case / Project Management | `case` | `src/modules/case-management/` | 0 |
| 5 | Customer Care — Ticket | `ticket` | `src/modules/care-ticket/` | 0 |
| 6 | Customer Care — Warranty | `warranty` | `src/modules/care-warranty/` | 0 |
| 7 | BPM Engine | `bpm` | `src/modules/bpm/` | 0 (separate module) |
| 8 | Approval Engine | `approval` | `src/modules/approval/` | 0 |
| 9 | KPI | `kpi` | `src/modules/kpi/` | 0 |
| 10 | Reporting & Analytics | `reporting` | `src/modules/reporting/` | 0 (read models) |
| 11 | Communication Hub | `communication` | `src/modules/communication/` | 2 (extract) |
| 12 | Notification | `notification` | `src/modules/notification/` | 2 (extract) |
| 13 | Integration Hub | `integration` | `src/modules/integration/` | 0 |
| 14 | AI Assistant | `ai` | `src/modules/ai-assistant/` | 0 (ACL only) |
| 15 | Campaign / CXM / Survey | `campaign` | `src/modules/campaign-survey/` | 0 |
| 16 | Finance (partial) | `finance` | `src/modules/finance/` | 0 (minimal) |
| 17 | Platform Upload | `files` | `src/modules/platform-upload/` | 0 |

---

## 6. API Prefix Map

| Prefix | Canonical Module | Notes |
|--------|----------------|-------|
| `/authenticator` | identity-access | Session, user profile, password |
| `/adminapi` | org, crm, care-ticket, care-warranty, kpi, reporting, integration, ai-assistant, campaign | Majority of non-BPM APIs |
| `{APP_BPM_URL}/bpmapi` | bpm | Separate deployable target; process engine |
| `/notification` | notification | FCM device, notification history |
| `/api` | platform-upload, shared utilities | File upload, support list |
| `/sale` | UNKNOWN-prefixed | WorkInprogress, WorkExchange under sale prefix — conflict CON-02 |
| `/system` | UNKNOWN | Employee managers/assignees — conflict CON-03 |
| `/cs` | UNKNOWN | Customer service sub-prefix |
| `/hr` | organization (HR sub) | Timekeeping, HR integration |
| `/application` | bpm (project/procurement) | WorkCategory, Material, Supplier, ProjectCatalog |

---

## 7. Schema Ownership Map

Per `MICROSERVICE_EVOLUTION_PLAN.md §4` and database documents:

| Schema | Owner Module | Key Tables |
|--------|-------------|-----------|
| `identity` | identity-access | users, sessions, permission_grants, org_role_selections |
| `org` | organization | branches, departments, employees, roles |
| `crm` | crm | customers, contacts, contact_pipelines, customer_attributes, care_categories, marketing_sources, marketing_automations |
| `case` | case-management | cases, work_logs |
| `ticket` | care-ticket | tickets, ticket_categories, ticket_procedures, ticket_procedure_steps, support_objects, support_logs, ticket_exchanges |
| `warranty` | care-warranty | warranties, warranty_categories, warranty_procedures, warranty_procedure_steps, warranty_support_objects, warranty_support_logs, warranty_exchanges |
| `bpm` | bpm | process_definitions, process_nodes, process_links, process_instances, work_orders, form_definitions, business_rules, variable_decls |
| `approval` | approval | approval_definitions, approval_instances, approval_logs |
| `kpi` | kpi | kpi_frameworks, kpi_applies, kpi_objects, kpi_templates |
| `reporting` | reporting | (projections only — no source writes) |
| `communication` | communication | conversations, messages, channel_configs |
| `notification` | notification | device_tokens, notification_history |
| `integration` | integration | partners, webhooks, installed_apps |
| `campaign` | campaign-survey | campaigns, surveys, survey_responses |
| `finance` | finance | cashbook_entries, payment_records, earnings |
| `files` | platform-upload | file_assets |
| `outbox` | infrastructure (shared) | events, dead_letter_events |

---

## 8. Domain Event Catalog

### Confirmed domain events (from DDD_MODEL.md + frontend evidence)

| Event | Producer | Priority | Status |
|-------|---------|---------|--------|
| `identity.UserAuthenticated.v1` | identity-access | P1 | CONFIRMED producer |
| `identity.OrgRoleSelected.v1` | identity-access | P1 | CONFIRMED |
| `identity.PermissionGrantChanged.v1` | identity-access | P1 | CONFIRMED — triggers authZ cache invalidation |
| `org.EmployeeCreated.v1` | organization | P1 | CONFIRMED |
| `org.DepartmentUpdated.v1` | organization | P2 | CONFIRMED |
| `crm.CustomerCreated.v1` | crm | P1 | CONFIRMED — consumed by Reporting, Care |
| `crm.CustomerUpdated.v1` | crm | P1 | CONFIRMED — consumed by Care, Communication |
| `crm.ContactCreated.v1` | crm | P2 | CONFIRMED |
| `ticket.TicketCreated.v1` | care-ticket | P0 | CONFIRMED — notification consumers UNKNOWN |
| `ticket.TicketSubmittedViaPublicForm.v1` | care-ticket | P0 | CONFIRMED |
| `ticket.TicketStatusChanged.v1` | care-ticket | P1 | CONFIRMED — Reporting consumer UNKNOWN |
| `warranty.WarrantyCreated.v1` | care-warranty | P0 | CONFIRMED |
| `warranty.WarrantySubmittedViaPublicForm.v1` | care-warranty | P0 | CONFIRMED |
| `bpm.ProcessInstanceStarted.v1` | bpm | P0 | CONFIRMED |
| `bpm.TaskCompleted.v1` | bpm | P0 | CONFIRMED — `bpmForm/activate` |
| `bpm.TaskPaused.v1` | bpm | P1 | CONFIRMED — `onhold` |
| `bpm.TaskRecalled.v1` | bpm | P1 | CONFIRMED — `recall/confirm` |
| `bpm.WorkOrderCreated.v1` | bpm | P1 | CONFIRMED |
| `bpm.ProcessTriggerActivated.v1` | bpm | P2 | CONFIRMED |
| `bpm.ProcessTriggerFailed.v1` | bpm | P2 | CONFIRMED — status 4/5 |
| `approval.ApprovalCompleted.v1` | approval | P1 | CONFIRMED |
| `notification.PushNotificationRequested.v1` | notification | P0 | CONFIRMED |
| `files.FileUploaded.v1` | platform-upload | P2 | CONFIRMED |

### Events with UNKNOWN consumers

- `bpm.SLAWarning.v1` → consumers UNKNOWN
- `ticket.TicketAssigned.v1` → notification consumer UNKNOWN
- `warranty.WarrantyViewerAssigned.v1` → consumers UNKNOWN
- `kpi.KpiAssigned.v1` → consumers UNKNOWN

---

## 9. Aggregate Ownership Summary

### Implementation Priority Order (from MICROSERVICE_EVOLUTION_PLAN.md §4 + gap analysis)

```
Phase 0 — Implement in order:

1. shared-kernel          (IDs, Result, Pagination, AuditFields, SoftDelete, OptimisticLock)
2. identity-access        (JWT, Permission, SelectedRole)
3. organization           (Branch, Department, Employee, Role)
4. crm                    (Customer, Contact, ContactPipeline, CustomerAttribute)
5. care-ticket            (Ticket, TicketProcess, TicketExchange, TicketProcedure)
6. care-warranty          (Warranty, WarrantyProcess, WarrantyExchange, WarrantyProcedure)
7. bpm                    (ProcessDefinition, WorkOrder, ProcessInstance, BusinessRule, FormDefinition)
8. approval               (after U-03 resolved)
9. notification           (FcmDevice, NotificationHistory)
10. reporting             (projections only — after events from 4–8 confirmed)
11. communication         (SMS/Email/Zalo/FB adapters)
12. kpi                   (after U-11 resolved)
13. campaign-survey
14. finance               (partial — after U-12 resolved)
15. integration
16. ai-assistant          (ACL only — after U-20 resolved)
17. platform-upload
```

---

*End of ARCHITECTURE_RECONCILIATION.md v1.0.0*
*Next: FRONTEND_API_AUDIT.md — per-endpoint contract verification*
