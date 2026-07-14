# Backend Implementation Specification

> **BE Team Handoff:** Full backend rebuild based on the current Frontend behavior, domain services, seed relationships and mock data.

## 1. Executive Summary

This is the formal handoff contract for the Backend team to rebuild the DermaHealth backend from zero so that the current Frontend can stop using browser repositories and mock data. It is not a discovery note and it is not permission to redesign the product independently of the current UI. The delivered backend must support the current routes, screens, actions, roles, states and mock relationships described here, while correcting the security, normalization and consistency defects that cannot safely be preserved.

The confirmed product is a role-aware clinic workflow application covering patient profiles and consent, appointments, QR check-in, physical queues, encounters, symptom intake and AI preliminary assessment, doctor decisions, clinical orders/results, versioned workflow execution, medical records/prescriptions/documents, post-visit CRM, notifications, audit, integration monitoring, progress media/reporting, preferences, and support requests.

The frontend is not an API client today. It is a React 19/Vite application whose `src/domain/repositories.ts` stores a coherent seed world in `localStorage`; pages call synchronous services directly. Authentication is simulated by selecting a seeded user ID. The backend must therefore be a modular monolith with explicit command endpoints and server-enforced tenant/relationship authorization, not a mechanical exposure of repository `upsert` operations.

Primary implementation stack: Node.js 22 LTS, TypeScript, NestJS, PostgreSQL 16, Prisma, Redis/BullMQ, S3-compatible storage, OpenAPI, Jest/Supertest, and Docker Compose. PostgreSQL is authoritative; Redis is used only for queues, throttling, and short-lived idempotency/session support. Payments, true chat, and video-provider integration are not currently evidenced as implemented features and are excluded from MVP except for safe extension points.

Classification vocabulary used throughout: **CONFIRMED** means direct source evidence; **INFERRED** means strongly implied; **PROPOSED** is a production recommendation; **UNKNOWN** is a product decision that cannot be resolved from this repository.

### Instructions to the Backend team

1. Implement P0 modules first and expose versioned `/api/v1` contracts before asking the Frontend team to remove mocks.
2. Do not copy `localStorage`, client-generated actor IDs, raw mock IDs, formatted dates, display labels, role checks or generic repository `upsert` behavior into the backend.
3. Do not silently change a confirmed field, status or user action. If a contract must differ for security or normalization, record it in the OpenAPI changelog and the migration map in section 38.
4. When a product decision remains UNKNOWN, use the safe default explicitly stated in this document and create a tracked decision item; do not block unrelated modules.
5. A module is not delivered until its migration, seed, OpenAPI contract, authorization policy, unit/integration tests and FE-consumable example response are complete.
6. The Frontend repository remains the product evidence during the rebuild. The backend becomes authoritative only after the corresponding FE module has passed contract and end-to-end acceptance tests.

### Source-of-truth precedence

When repository evidence conflicts, the Backend team must resolve it in this order:

1. **Business commands and guards:** `src/domain/services/*`, `src/domain/guards.ts`, state-transition maps.
2. **Canonical domain vocabulary:** `src/domain/core/entities.ts`, `src/domain/core/enums.ts`, `src/domain/core/ids.ts`.
3. **Actual routed UI behavior:** `src/App.tsx`, pages, forms, buttons, filters and role-gated menus.
4. **Relational examples:** `src/domain/seed.ts`, after applying the corrections in section 45.
5. **Legacy/display mock content:** `src/data/mockData.ts` and inline arrays in pages. These are examples for seed/projections, not canonical schemas.
6. **Safe defaults in this specification:** only where the repository is incomplete or unsafe.

If two higher-priority sources still conflict, do not guess silently: implement the safest backward-compatible contract, add the item to the API changelog, and escalate it through section 47's decision log.

### Required handoff artifacts from Backend

The Backend team must deliver one runnable backend repository/workspace containing: source modules; reviewed database migrations; idempotent development seed; Docker Compose; `.env.example` without secrets; generated OpenAPI JSON/YAML; API usage examples or an imported collection generated from OpenAPI; unit, integration, E2E and security tests; architecture/operations README; migration/rollback runbook; and a FE integration changelog mapping every removed mock to its endpoint. A database dump alone or CRUD endpoints without workflow commands do not satisfy this specification.

## 2. Repository Analysis Metadata

| Item | Value |
|---|---|
| Analysis date | 2026-07-14, Asia/Ho_Chi_Minh |
| Repository root | `/Users/chuong/Documents/CareFollow/User` |
| Source files inspected | 90 relevant files: 80 `.ts`/`.tsx` and 10 manifests/configuration/CI/readme files |
| Excluded | `.git`, `node_modules`, generated `dist`, raster/SVG assets, and style-only Sass/CSS modules |
| Unread relevant files | 0 |
| Existing backend | None in this repository |
| Evidence convention | Repository-relative path plus symbol or stable line where useful |

Method: all routes, pages, components, layouts, state, domain types, enums, services, repositories, seeds, inline arrays, forms, uploads, role checks, status transitions, TODO-like placeholders, package/build configuration, and deployment workflow were searched and inspected. Static visual assets and styling were classified as presentation-only and excluded from the source count.

Evidence path legend: abbreviated symbols in tables always refer to these repository-relative roots: `entities.ts` = `src/domain/core/entities.ts`; `core/enums.ts` = `src/domain/core/enums.ts`; `seed.ts` = `src/domain/seed.ts`; `repositories.ts` = `src/domain/repositories.ts`; `store.ts` = `src/domain/store.ts`; a service filename = `src/domain/services/<filename>`; a page filename = `src/pages/<filename>` (or `src/pages/workflows/<filename>` for workflow pages). These aliases are used only to keep wide tables readable; every cited file exists in the inspected inventory.

## 3. Repository Coverage and Unread Files

| Category | Inspected evidence | Result |
|---|---|---|
| Root/configuration | `package.json`, `package-lock.json`, `README.md`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `test-run.mjs`, `.github/workflows/deploy.yml` | Complete |
| Routing/layout/auth gates | `src/App.tsx`, `src/layouts/*`, `src/components/feedback/AccessDenied.tsx`, `src/layouts/Sidebar.tsx`, `src/layouts/TopHeader.tsx` | Complete |
| Pages | All 31 files under `src/pages`, including three workflow pages | Complete |
| Domain model | All files under `src/domain/core`, plus `carePlan.ts`, journey/layout helpers, guards and identity helper | Complete |
| Persistence/services | `src/domain/store.ts`, `repositories.ts`, all 13 service/index files | Complete |
| State | All files under `src/state` | Complete |
| Mock/seed data | `src/data/mockData.ts`, `src/domain/seed.ts`, and inline constants in pages | Complete |
| Shared components | All TS/TSX under `src/components` | Complete; QR regeneration and feedback behavior noted |
| Generated/dependencies | `.git`, `node_modules`, `dist` | Intentionally skipped; irrelevant generated/dependency content |
| Binary/style assets | `src/assets`, `public`, `logo.jpeg`, `.scss`/`.module.scss` | Skipped as backend-irrelevant presentation assets; paths inventoried |

No relevant file was unreadable, corrupted, binary-only, or truncated during final evidence synthesis. “Complete” does not mean that missing product policy was invented; unresolved behavior is recorded in section 47.

## 4. Detected Technology Stack

| Concern | Detected | Evidence | Classification |
|---|---|---|---|
| Framework | React 19.2, Vite 8, TypeScript 6 | `package.json`, `vite.config.ts` | CONFIRMED |
| UI/styling | Ant Design 6, Sass | `package.json`, `src/theme/antdTheme.ts`, `src/styles` | CONFIRMED |
| Routing | React Router 7, lazy route components | `src/App.tsx` | CONFIRMED |
| State/persistence | Context plus `useSyncExternalStore`; typed localStorage entity stores | `src/state/*`, `src/domain/store.ts` | CONFIRMED |
| Data fetching | None: no Fetch/Axios/React Query/SWR/Apollo | repository-wide dependency/search analysis | CONFIRMED |
| Forms/validation | Mostly local `useState`; Ant `Form` only on login; handwritten validation | `Login.tsx`, `AIAnalysis.tsx`, services | CONFIRMED |
| Authentication | Fake current-user ID in localStorage; login navigates without credential validation | `AppStateContext.tsx`, `Login.tsx` | CONFIRMED |
| Mocking | Seeded localStorage repositories plus inline hard-coded arrays | `seed.ts`, `repositories.ts`, `mockData.ts`, pages | CONFIRMED |
| Testing | No test framework or test script; Puppeteer helper only | `package.json`, `test-run.mjs` | CONFIRMED |
| Deployment | Static Vite build copied to Nginx on pushes to `main` | `.github/workflows/deploy.yml` | CONFIRMED |
| Environment config | No `.env.example`; only `import.meta.env.BASE_URL` | repository search | CONFIRMED |

## 5. Frontend Architecture Summary

`AppStateProvider` selects `currentUserId` from `dermahealth:v1:session:currentUserId`, defaulting to patient `U-0001`. All entity collections are initialized from `createSeedWorld()` and individually persisted under `dermahealth:v1:*`. Domain services synchronously mutate repositories and write partial audit events. Pages subscribe directly to repositories. There is no network boundary, DTO layer, schema validation, tenant model, session authority, or concurrency control.

The production frontend should add one typed API client and query/mutation cache. TanStack Query is PROPOSED because the app has many independently invalidated list/detail views. Keep UI component state local; replace entity repository subscription with API queries. The backend must return canonical UTC ISO-8601 timestamps and UUIDs while optionally retaining human-readable `code` fields.

## 6. Business Module Inventory

| Module | Purpose and actors | Main evidence | Backend dependency | Class |
|---|---|---|---|---|
| Identity/session | Authenticate 13 represented roles and manage sessions | `core/enums.ts`, `Login.tsx`, `AppStateContext.tsx` | users, roles, memberships, sessions | CONFIRMED (role model); real auth PROPOSED |
| Patient/profile/consent | Patient demographics, primary doctor, consent toggles | `entities.ts` `Patient`, `Profile.tsx`, `SettingsPage.tsx` | identity, organizations | CONFIRMED |
| Appointment/scheduling | Search doctors, choose date/time, book, view QR | `Appointments.tsx`, `appointmentService.ts` | patients, practitioners, locations | CONFIRMED |
| QR check-in | Issue/reissue/revoke and redeem time-bound token | `checkInService.ts`, `KioskCheckIn.tsx`, `AppointmentQRCode.tsx` | appointments, queue | CONFIRMED |
| Clinic queue/stations | Prioritized ticket calling and service routing | `QueueTicket`, `queueService.ts`, queue/reception pages | check-in, encounters | CONFIRMED |
| Encounters/journey | Long-running clinical visit state and events | `MedicalEncounter`, `encounterService.ts`, `Journey.tsx` | all clinical modules | CONFIRMED |
| Symptom intake/AI | Intake, red flags, versioned preliminary assessment | `aiAssessmentService.ts`, `AIAnalysis.tsx` | encounter, files, model adapter | CONFIRMED |
| Doctor decision | Review AI, record/revise diagnosis, approve plan | `doctorDecisionService.ts`, `DoctorReview.tsx` | AI, encounter, EMR | CONFIRMED |
| Clinical orders/results | Lab/imaging/consultation orders and results | `clinicalOrderService.ts`, `Records.tsx` | encounter, workflow, documents | CONFIRMED |
| Workflow design/runtime | Versioned DAG, activation, task queue and execution | `workflowService.ts`, workflow pages, `WorkQueue.tsx` | users, encounters, notifications | CONFIRMED |
| EMR/prescription/documents | Draft/sign/amend/reopen record, medication and attachments | `medicalRecordService.ts`, `Records.tsx`, `Prescriptions.tsx` | clinical data, files, audit | CONFIRMED |
| CRM/follow-up | Care activities, automation, alerts, encounter requests | `crmService.ts`, `Care.tsx` | closed encounters, notifications | CONFIRMED |
| Notifications | In-app/SMS/email/push delivery state, read/retry | `Notification`, `notificationService.ts`, `TopHeader.tsx` | outbox/queue/providers | CONFIRMED |
| Audit | Immutable sensitive-operation history and viewer | `AuditEvent`, `auditService.ts`, `AuditViewer.tsx` | every module | CONFIRMED |
| Integration operations | Connection/message health, retry/DLQ reset | `Integrations.tsx`, integration entities | admin, background jobs | CONFIRMED as simulated operations |
| Progress/photos/reports | Upload serial images, AI scores, longitudinal reports/PDF | `Progress.tsx`, `Reports.tsx`, `mockData.ts` | files, AI, encounters | CONFIRMED UI; persistence INFERRED |
| Preferences | Notification/privacy/language/device settings | `SettingsPage.tsx` | users, consent | CONFIRMED UI; persistence INFERRED |
| Support | FAQ/channels and support request form | `Support.tsx` | users, notification | CONFIRMED UI; ticket persistence INFERRED |

Payment: only a static `500.000đ`, cancellation copy, billing support topic, and workflow executor/preset exist. No payment entity or transaction exists. Chat/video: buttons and appointment `mode` exist, but no conversation, message, room, or provider API exists. These are not confirmed backend modules for MVP.

### Delivery scope agreed from current Frontend

| Priority | Modules | Delivery rule |
|---|---|---|
| P0 — required for core FE migration | identity/session, organization/clinic scope, patients/consents, practitioners/availability, appointments, QR check-in, queue/stations, encounters/journey, symptom intake/AI boundary, doctor decisions, clinical orders/results, workflow design/runtime/work queue, EMR/prescriptions/documents, files, audit | Must be production-shaped and completed before the corresponding browser repository is removed. No mock fallback is allowed after module acceptance. |
| P1 — required to remove remaining domain mocks | care plans/follow-up/alerts, notifications, progress/photos, reports/PDF, preferences, support tickets, integration operations | Implement after P0 foundations; these may temporarily remain behind an explicit FE migration flag, but not after final acceptance. |
| Out of current rebuild scope | payment processing/refunds, real chat, video-provider rooms, guardian/minor workflows, FHIR/HL7 exchange | Do not implement from placeholder UI. Create extension boundaries only; product approval requires a separate specification/change request. |

“Rebuild the whole backend” means all P0 and P1 rows, not only authentication plus CRUD. Out-of-scope rows are intentionally excluded because the present Frontend has no implementable workflow or canonical mock model for them.

## 7. Route and Screen Inventory

| Route(s) | Screen | Actors currently shown | Data/actions and required backend | Evidence |
|---|---|---|---|---|
| `/`, `/login` | Login | Public | login, session creation, remember-me; `/` redirects | `App.tsx`, `Login.tsx` |
| `/kiosk/check-in`, `/kiosk/check-in/result` | Kiosk | Public device / receptionist variant | redeem QR, return ticket; device registration/rate limiting | `KioskCheckIn.tsx`, `checkInService.ts` |
| `/display/queue`, `/queue-display/:locationId`, `/queue-display/station/:stationId` | Public board | Public display | privacy-safe called/waiting numbers, realtime updates | `ClinicQueue.tsx` |
| `/app/dashboard` | Role dashboard | Any selected user | role-scoped aggregates, alerts, tasks, notifications, integration health | `Dashboard.tsx` |
| `/app/appointments`, `/:appointmentId`, `/:appointmentId/consultation` | Booking/detail | Patient, receptionist; consultation also doctor | availability, booking, owned/scoped detail, QR, preparation | appointment pages, `App.tsx` |
| `/app/ai-analysis` | AI intake | Patient | upload image, submit/reassess intake, red-flag response, assessment/report download | `AIAnalysis.tsx` |
| `/app/doctor-review` | Clinical decision | Doctor | assigned encounter list, review AI, diagnosis, plan, order | `DoctorReview.tsx` |
| `/app/journey`, `/app/patient-journey/:encounterId` | Journey | Unrestricted in route today | scoped encounter timeline, tasks/orders/results/queue | journey pages; authorization defect |
| `/app/records` | EMR + treatment plan | Route unrestricted; internal patient/doctor/admin or break-glass | record/read/sign/addendum/reopen/upload; treatment task CRUD | `Records.tsx` |
| `/app/profile` | Profile | Patient | own profile, health summary | `Profile.tsx` |
| `/app/prescriptions` | Prescriptions | Patient | own prescriptions/reminders/adherence | `Prescriptions.tsx`, `mockData.ts` |
| `/app/progress` | Progress | Patient | list/upload photos, scores, compare | `Progress.tsx` |
| `/app/care` | Post-visit care | Patient/coordinator/customer care/medical admin | activities, automation, alerts, encounter requests | `Care.tsx` |
| `/app/reports` | Reports | Patient | own aggregates and PDF export | `Reports.tsx` |
| `/app/workflows/templates*` | Workflow design/editor | Designer, medical admin | draft/edit graph/publish/archive/deploy | workflow template pages |
| `/app/workflows/instances/:id*`, `/app/encounters/:encounterId/workflow` | Workflow runtime | Staff queue roles | view/accept/start/complete/redo/reject/escalate/skip/reassign/suspend/resume/cancel | workflow instance pages |
| `/app/work-queue` | Work queue | Staff queue roles | filter role/priority/urgency/status; task commands | `WorkQueue.tsx` |
| `/app/audit` | Audit | Medical/system admin | paginated filtered audit read/export (export PROPOSED) | `AuditViewer.tsx` |
| `/app/integrations` | Integrations | Medical/system admin | health, retry failures, DLQ action | `Integrations.tsx` |
| `/app/reception*` | Reception | Receptionist, medical admin | appointment lookup, check-in, queue dashboard | reception pages |
| `/app/queue*`, `/app/clinic-queue`, `/app/queue/stations` | Queue control | Doctor/nurse/receptionist/medical admin | queue commands/stations/display links | queue pages |
| `/app/settings` | Settings | Unrestricted route | own preferences/consents/logout/demo reset | `SettingsPage.tsx` |
| `/app/support` | Support | Unrestricted route | content and ticket submission | `Support.tsx` |

All `/app` routes require authentication in the backend even where the frontend omits `RoleProtectedRoute`. Route hiding is never authority.

## 8. Mock Data Inventory

| Source / symbol | Shape / approx count | Consumers | Candidate entity | Problems / class |
|---|---:|---|---|---|
| `seed.ts:createSeedWorld` | 30 collections; ~70 records | all repository-backed pages | canonical prototype entities | duplicate user IDs, bad FK, mixed timestamps; CONFIRMED |
| `mockData.ts:mockPatient` | 1 denormalized object | legacy/profile-derived UI | patient + metrics + diagnosis | duplicates seeded patient; formatted/derived fields |
| `mockAppointments` | 4 | currently no direct import found | appointment projection | `APP-*` IDs and split dates conflict with `Appointment` |
| `mockProgressData` | 8 weekly rows | progress/reports | progress assessment | no patient/encounter/time IDs |
| `mockPrescriptions` | 2 + 5 items | prescriptions | prescription/items | duration/remaining are display strings; conflicts with domain Medication |
| `mockMedicineReminders` | 3 | prescriptions | medication reminder/adherence | numeric IDs; no patient/time zone/date |
| `mockProgressPhotos` | 6 | progress | progress media | null URLs and display dates; no storage metadata |
| `Appointments.tsx:DOCTORS/TIMES_*` | 3 doctors, 12 slots | booking | practitioner/availability | numeric IDs map manually to wrong IDs; slots never conflict-checked |
| `Dashboard.tsx:WEEKS/SCORES/APPTS/RECORDS/QUICK` | several projections | dashboard | aggregates/navigation | hard-coded metrics mixed with repository data |
| `Records.tsx:INIT/COLS` | 7 local tasks | treatment plan Kanban | follow-up activity | numeric IDs, volatile state, overlaps CRM |
| `Profile.tsx:HEALTH/TIMELINE/CURRENT_RX` | 3 arrays | profile | derived clinical projections | duplicated medical data |
| `Reports.tsx:*_HISTORY/IMPROVEMENT_BREAKDOWN` | 4–5 rows each | reports | derived report snapshots | static clinical claims and scores |
| `Progress.tsx` modal/metrics | static metrics and fake upload | progress | progress assessment/file | upload does not accept/persist a file |
| `Support.tsx:FAQS/CHANNELS` | 5 FAQs, 3 channels | support | content config | presentation content; support submit discards data |
| `WorkflowTemplateEditor.tsx` presets/locations | types/locations | editor | reference configuration | should be admin-managed or versioned seed config |
| `notificationService.ts` | random simulated delivery | header/dashboard | notification delivery | nondeterministic client delivery; no provider truth |
| `medicalRecordService.uploadDocument` | fake hash/file name | records | clinical document | no bytes, MIME, scan, object ACL |
| localStorage repositories | 30 browser stores | entire app | fake persistence | client can alter roles/PHI/statuses/audit |

## 9. Canonical Data Dictionary

The following is the implementation-driving dictionary. Detailed SQL columns appear in section 21.

| Entity / field group | FE type/example | Meaning | Persistence/security | Evidence / class |
|---|---|---|---|---|
| User `id,name,role,department,specialty,online` | string/literals | actor and display assignment | UUID + profile; role via membership, `online` derived presence | `entities.ts:User`; CONFIRMED |
| Patient `code,name,profile,primaryDoctorId` | nested strings | administrative profile | normalized patient/person/contact; PHI; doctor relation nullable | `Patient`; CONFIRMED |
| PatientProfile dates/contact | `15/03/1995`, free gender | DOB/contact/blood group | DATE, normalized enums; encrypted/search-token where justified | `PatientProfile`; CONFIRMED |
| Appointment core | date/time strings, mode/status | scheduled service | `starts_at/ends_at` timestamptz; mode/status enums; server owner | `Appointment`; CONFIRMED |
| booking `name,phone,reason` | local state | booking form | name/phone from patient; reason becomes confidential appointment reason | `Appointments.tsx`; CONFIRMED UI, persistence INFERRED |
| QR token raw/hash/window/status | strings | one-time check-in credential | store hash only; raw shown only at issuance; timestamps UTC | `AppointmentCheckInToken`; CONFIRMED |
| Queue ticket counts/estimate | numeric | operational queue | core status/times persisted; people-ahead/estimate derived | `QueueTicket`; CONFIRMED |
| Encounter relations arrays | ID arrays | visit aggregate links | normalized FKs; never persist arrays as authority | `MedicalEncounter`; CONFIRMED |
| Encounter queue projections/events | numbers/event array | journey display | ticket-derived; event table append-only | same |
| Symptom intake | complaint, severity, duration, arrays, images | patient clinical intake | versioned snapshot; health data; images via file relation | `SymptomIntake`; CONFIRMED |
| AI assessment | candidates/red flag/model/input snapshot | advisory output | immutable versioned result; JSONB for evidence arrays is acceptable | `AIPreliminaryAssessment`; CONFIRMED |
| Doctor review/diagnosis/plan | review action, diagnosis lifecycle, plan summary | human decision | versioned clinical facts, doctor-attributed; no AI authority | corresponding interfaces/services; CONFIRMED |
| Order/result | type/status/role/result | diagnostic work | normalized order/result; result version/late-result handling | `ClinicalOrder`, `ClinicalResult`; CONFIRMED |
| Workflow template/version/steps | graph and role/rules | process definition | template metadata + immutable version + normalized steps/dependencies; positions JSONB UI-only | workflow interfaces; CONFIRMED |
| Workflow instance/task | pinned version/status/assignment/SLA | runtime process | server-generated tasks; optimistic version | workflow interfaces; CONFIRMED |
| Clinical document | filename/hash/version/review/signature | attachment metadata | private object key, MIME/size/checksum/scan; URL derived | `ClinicalDocument`; CONFIRMED + PROPOSED controls |
| Prescription/Medication | name/dose/duration | issued medication order | prescription + line items; dosage text retained until terminology decision | interfaces and mocks; CONFIRMED |
| Medical record | status/diagnosis/prescription/discharge/follow-up/addenda | visit record | normalized, signed snapshot/hash; addenda append-only | `MedicalRecord`; CONFIRMED |
| Care plan/activity/alert/request | statuses/due/priority/escalation | post-visit operations | normalized; automation runs and decisions separately audited | CRM entities/service; CONFIRMED |
| Notification | channel/status/message/relations/read | delivery projection | template+minimal payload, delivery attempts, read time; health content minimized | `Notification`; CONFIRMED |
| Consent | type/granted/timestamps | patient grant/withdrawal | append-only consent events + current projection | `Consent`; CONFIRMED |
| Audit event | actor/action/resource/context/states | immutable trace | append-only, partition/retention; no full PHI values | `AuditEvent`; CONFIRMED + expanded PROPOSED |
| Integration connection/message | health/correlation/idempotency/status | interoperability ops | connection config secrets external; messages store safe metadata/payload pointer | integration entities; CONFIRMED |
| Progress assessment/photo | scores/week/note/file | longitudinal tracking | timestamped assessment + private file; week/changes derived | `mockData.ts`, `Progress.tsx`; INFERRED persistence |
| Preferences/support ticket | toggles/topic/message | account/support operations | user settings JSON or columns; ticket table | settings/support pages; INFERRED |

Never trust client-supplied actor IDs, role, patient ownership, calculated wait counts, status labels, score changes, notification delivery state, `signedBy`, model version, file hash, audit actor, price, or workflow integrity hash.

## 10. Actors and Roles

All 13 `UserRole` values are confirmed in `core/enums.ts`; seeded users cover most roles. `super_administrator` is a prototype-wide override. Production scope must be organization membership, with a separately controlled break-glass capability rather than unconditional data access.

| Role | Confirmed screens/functions | Required scope |
|---|---|---|
| patient | appointments, AI, profile, prescriptions, progress, care, reports, own records/journey | self only; guardian UNKNOWN |
| doctor | review/diagnose/plan/order, assigned workflow, queue, sign/addendum | assigned encounter/care-team + clinic membership |
| nurse | work/clinic queues, workflow tasks | clinic/department and assigned tasks |
| receptionist | appointment, check-in, reception/queue | clinic; administrative fields only |
| lab/imaging technician | work queue and result tasks | assigned order/task; minimum patient context |
| pharmacist | work queue/pharmacy task | assigned prescription/task; no unrelated notes |
| care coordinator | post-visit care/work queue | assigned care plan/clinic |
| customer care employee | care view | administrative follow-up only; exclude clinical notes |
| medical administrator | workflow publish, clinical operations, audit/integration, reopen records | organization/clinic; high-risk commands audited |
| system administrator | audit/integration | system metadata; no routine clinical content |
| clinical process designer | workflow draft/edit | organization templates; cannot publish alone |
| super administrator | prototype override | PROPOSED platform config only; PHI requires break-glass approval |

Authentication method is UNKNOWN in product terms. Implement email/password initially, invitation-only for staff, optional patient self-registration behind configuration, MFA required for privileged/admin roles and recommended for clinicians.

## 11. Authorization Matrix

| Resource/action | Roles | Scope/preconditions/field restrictions | Policy / evidence / class |
|---|---|---|---|
| Patient view/update | patient; assigned clinical staff; receptionist admin subset | self or active appointment/encounter/care-team in same org; receptionist cannot read clinical notes | `CanViewPatient`; pages/entities; INFERRED scope |
| Appointment list/book/view | patient, receptionist | self or clinic; doctor detail for assigned appointment | `CanManageAppointment`; routes; CONFIRMED |
| QR issue/revoke | receptionist, medical admin; system at booking | same clinic/appointment active | `CanManageCheckInToken`; QR component/service |
| QR redeem | registered kiosk/reception device | correct clinic/time/appointment; token secret | `CanRedeemCheckIn`; check-in service |
| Queue view/control | public board gets redacted projection; clinical queue roles control | location/station/department membership; valid transition | `CanControlQueue`; routes |
| Encounter/journey view | patient self; assigned staff; medical admin | relation + org; break-glass separately | `CanViewEncounter`; currently missing route guard |
| AI intake | patient self; authorized clinician | encounter open and related; AI cannot diagnose/sign | `CanSubmitIntake`; service boundary |
| AI review/diagnosis/plan/order | doctor | assigned/covering doctor at clinic; appropriate encounter status | `CanWriteClinicalEncounter`; doctor service |
| Result create | matching technician/doctor | assigned order role, same org, valid order state | `CanRecordResult`; INFERRED from `assignedRole` |
| Workflow design | designer, medical admin | same organization; publish medical admin only | `CanDesignWorkflow`; workflow service |
| Task commands | responsible role/assignee; admin reassignment | active instance, dependencies/status, clinic scope | `CanExecuteWorkflowTask`; workflow pages |
| Record view | patient, related doctor, medical admin | patient sees patient-visible fields; access audited | `CanViewMedicalRecord`; Records |
| Record sign/addendum | doctor | assigned encounter, completion requirements; signed immutable | `CanSignClinicalRecord`; medical record service |
| Record reopen | medical admin | reason + dual approval PROPOSED; never erase signature history | `CanReopenClinicalRecord` |
| Documents upload/download | task/order participant, doctor, patient if visible | related resource; MIME/scan; download audited | `CanAccessMedicalAttachment` |
| Care activities | patient self; coordinator/customer care/admin | assigned plan; clinical alerts only doctor/admin/coordinator close | `CanManageCarePlan`; CRM service |
| Encounter request decide | doctor, medical admin | same clinic; pending request | `CanDecideEncounterRequest` |
| Audit read/export | medical/system admin | org-scoped; system admin metadata redaction; export separately privileged | `CanReadAudit` |
| Integration retry/DLQ | system/medical admin | org/connection; payload PHI redacted | `CanOperateIntegration` |

Denial returns `403 AUTHZ_*`; existence-sensitive lookups may return `404 RESOURCE_NOT_FOUND` to reduce IDOR enumeration. Every query must apply organization and relationship scope in the database query, not filter after retrieval.

## 12. Business Workflows

1. **Appointment to queue (CONFIRMED):** patient/receptionist selects practitioner and slot; backend transaction books appointment and planned encounter, issues check-in token, writes audit/outbox. Token redemption validates hash/status/window/location/patient, idempotently creates one active queue ticket, marks token used, transitions encounter toward checked-in when allowed, and publishes queue update. Evidence: `appointmentService.ts`, `checkInService.ts`.
2. **Clinical intake to decision (CONFIRMED):** patient submits complaint/severity/duration/symptoms/media; backend snapshots input, evaluates red flag, invokes AI adapter, stores immutable assessment, and escalates or queues doctor review. AI may not create final diagnosis, prescription, signed record, or close visit. Evidence: `aiAssessmentService.ts` comments and commands.
3. **Doctor decision (CONFIRMED):** assigned doctor accepts/partially accepts/rejects an assessment with rationale, creates provisional/confirmed diagnosis, may revise (linked revision), approves plan, and orders lab/imaging/consultation. Evidence: `doctorDecisionService.ts`, `DoctorReview.tsx`.
4. **Workflow execution (CONFIRMED):** medical admin publishes immutable version; doctor/admin activates it only after plan approval; tasks copy from pinned version, unlock by prerequisites, are claimed/executed/reworked/escalated; completion moves encounter to results/final review but does not close it. Evidence: `workflowService.ts`.
5. **Record closure (CONFIRMED):** draft record collects confirmed diagnosis, prescription/documents/discharge/follow-up; doctor signs after completion; encounter closes only when record is signed. Signed content is immutable; doctor appends addendum; admin can reopen with reason. Evidence: `medicalRecordService.ts`, `encounterService.ts`.
6. **Post-visit CRM (CONFIRMED):** care plan schedules automatic/patient/human activities; automation sends notifications; triggers raise alerts; alerts may request a follow-up encounter; doctor/admin decides request; CRM itself may not diagnose/prescribe/close alerts without authorized review. Evidence: `crmService.ts`.

## 13. State Machines

### Encounter

The exact confirmed graph from `ENCOUNTER_TRANSITIONS` is:

```text
registered -> intake_in_progress -> intake_complete -> ai_assessed|under_doctor_review
ai_assessed -> routed|escalated|under_doctor_review
routed -> checked_in|escalated -> under_doctor_review
under_doctor_review -> awaiting_results|diagnosed|escalated
awaiting_results -> under_doctor_review|diagnosed
diagnosed -> plan_approved -> workflow_active -> in_progress
in_progress -> results_complete|final_review -> final_review
final_review -> discharge_ready|awaiting_results -> record_signed -> closed
closed -> post_visit_monitoring -> escalated|closed
escalated -> routed|post_visit_monitoring|follow_up_linked|under_doctor_review
follow_up_linked -> terminal
```

Each command uses row lock plus `version` optimistic check, writes an encounter event/audit/outbox atomically, and rejects arbitrary `PATCH status`.

| Entity | Initial | Commands/terminal rules | Evidence |
|---|---|---|---|
| Appointment | upcoming | cancel, reschedule, check-in; done/cancelled/missed terminal; exact transition policy UNKNOWN | `Appointment`/service |
| QR token | active | use, revoke, replace, expire; one active version/appointment | check-in service |
| Queue ticket | waiting | call→acknowledge→in_service→routed/completed; skip; prototype lacks guarded graph | queue service |
| AI assessment | generated | completed/insufficient_data/failed; immutable, superseded link | AI service |
| Diagnosis | none/provisional/differential | confirmed→revised/signed; revisions append, no overwrite | enums/doctor service |
| Clinical order | requested | in_progress, invalid_sample, result_ready/completed, cancelled; exact graph PROPOSED from enum | order service |
| Template version | draft | in_review→published→deprecated→archived; prototype publishes draft directly | workflow service/enums |
| Workflow instance | created | active↔suspended; completed/cancelled terminal | workflow service |
| Workflow task | pending/ready | use exact `ALLOWED_TASK_TRANSITIONS` from service; skip only nonmandatory; redo increments count | workflow service |
| Medical record | draft | in_review/awaiting_completion/awaiting_signature→signed→amended; controlled reopen/addendum | record service |
| Follow-up activity | scheduled | due→completed/escalated/cancelled; confirmed graph in CRM service | CRM service |
| Alert | open | acknowledged→encounter_requested→resolved; resolve authorized | CRM entities/service |
| Encounter request | requested | rejected or encounter_created; `approved` exists but is not persisted by current approval path | CRM service defect |
| Notification | queued | sent/delivered or failed↔retrying | notification service |

## 14. Appointment and Scheduling Rules

Confirmed UI uses 30-minute hard-coded slots, onsite booking despite labels saying online/video, clinic `CS-HCM-01`, and cancellation copy “free before 2 hours.” Doctor schedules, working hours, leave, capacity, service duration, holidays, overbooking, and pricing authority are UNKNOWN.

MVP safe model: `practitioner_schedules` with local recurring availability, exceptions, clinic/service, duration and capacity=1. Resolve slots server-side in `Asia/Ho_Chi_Minh`; store UTC instants plus clinic timezone. Booking accepts `slotId`, patient, mode, reason, and idempotency key—not arbitrary doctor/date/time.

Prevent double booking in one PostgreSQL transaction using a GiST exclusion constraint on practitioner and `tstzrange(starts_at, ends_at, '[)')` for live statuses; also prevent overlapping patient bookings. Insert appointment, planned encounter, token, audit and outbox together. On exclusion violation return `APPOINTMENT_SLOT_UNAVAILABLE`. Use `SELECT ... FOR UPDATE` only for a pre-created capacity slot; no Redis lock is needed for capacity one. Reschedule creates history, checks a new range, replaces QR token and notifies. Cancellation deadline and fee are UNKNOWN; default: allow cancellation, return `APPOINTMENT_CANCELLATION_POLICY_REQUIRED` if policy is configured but unresolved. Receptionist override requires reason/audit.

## 15. Medical and Clinical Data Rules

- Administrative profile is separate from encounters and health records. Contact updates do not rewrite historical encounter snapshots.
- Symptom intake and AI inputs/outputs are versioned. AI output is advisory, shows model/version/input snapshot, and never authorizes diagnosis, prescription, signature, or closure.
- Doctor reviews, diagnoses, plans, orders and results retain author, timestamps and revisions. Confirmed/signed clinical facts are amended, never overwritten or hard-deleted.
- Clinical results arriving after signature generate a late-result alert and audit; they do not silently mutate the signed record.
- Record signing stores a canonical snapshot hash, signature record, signer and timestamp in the same transaction. Addenda are append-only and separately signed/attributed. Reopen preserves prior signature and requires reason.
- Patient visibility must be explicit on note/result/document records. Default safe value is staff-only until reviewed/released. The frontend currently lacks this field (PROPOSED).
- All reads of a medical record, result, or attachment create an access audit asynchronously from a transactional outbox, with request and patient context.
- Hard delete is prohibited for signed records, diagnoses, results, prescriptions, audit and consent events. Retention length requires legal review.

## 16. Payment Rules

Not currently evidenced by the Frontend repository as an implemented workflow. Evidence is limited to a static `500.000đ` estimate and cancellation text in `Appointments.tsx`, a billing support topic, and `cashier/payment` workflow presets. Do not build payments in MVP or treat that display value as authoritative.

If product enables payment later: add service price/currency, payment intent/transaction/refund/reconciliation models; calculate amounts server-side in integer VND minor units (VND has zero decimal minor unit in usual display); accept success only from verified provider webhooks; make webhook/provider references unique and idempotent; restrict refunds and audit them. Provider, taxes, discounts, cancellation fee, invoices and refund rules are UNKNOWN.

## 17. File and Media Rules

| Category | Evidence | MIME/size default | Access/storage lifecycle |
|---|---|---|---|
| symptom/AI skin image | `AIAnalysis.tsx`, `SymptomIntake.images` | JPEG/PNG/WebP, 10 MiB | patient + assigned clinician/AI worker; private S3; retain per clinical policy |
| progress photo | `Progress.tsx`, `mockProgressPhotos` | JPEG/PNG/WebP, 10 MiB | patient/care team; private; version/assessment link |
| clinical document/report | `Records.tsx`, `ClinicalDocument` | PDF/JPEG/PNG; 25 MiB default | encounter/task/order relationship; private; no hard delete after signature |
| generated report PDF | `Reports.tsx` | server-generated PDF | short-lived authorized download |
| avatar | camera UI in `Profile.tsx` | JPEG/PNG/WebP, 5 MiB | personal data; may use transformed private/public policy after decision |

Flow: request upload intent → create `file_objects` row (`pending`) → issue 10-minute presigned PUT → verify object size/MIME magic bytes/checksum → malware scan → `available` or `quarantined` → attach using authorized command. Object keys are random UUID paths, never original names or patient identifiers. Downloads use 1–5 minute presigned GET after policy check and audit. No permanent public health-file URL. Client-supplied hash/MIME is untrusted. Orphan pending uploads expire after 24 hours; deletion is tombstoned and governed by record retention.

## 18. Chat, Realtime, and Video Rules

Queue displays benefit from realtime updates; implement authenticated SSE for staff and a redacted public-display SSE channel scoped to a registered display token/location. Events contain ticket number/status/station only, not names or diagnoses.

True chat and video consultation are not currently evidenced: `Support.tsx` has inert chat/phone/email buttons and appointment mode includes `video`, but there are no conversation/message/participant/room entities or provider calls. Do not invent these in MVP. When added, room/token issuance must verify appointment participant, time window, status and organization; short-lived provider tokens must never be issued solely from a room ID.

## 19. Proposed Backend Architecture

Use a modular NestJS monolith. It matches the TypeScript frontend and the transactional coupling among appointment/check-in/queue/encounter/EMR better than microservices. PostgreSQL is required immediately. Redis/BullMQ is required for notification/outbox delivery, throttling and integration retry; MinIO/S3 is required when real uploads are enabled. An AI adapter may initially wrap the deterministic algorithm for parity but must be isolated and versioned. OpenAPI is generated from DTOs.

Trade-offs: Prisma accelerates implementation and typed migrations but GiST exclusion constraints, partial indexes, RLS-like query patterns and immutable audit triggers require SQL migrations. A modular monolith requires strict module boundaries but avoids distributed transactions. Use an outbox rather than emitting jobs before commit.

## 20. Backend Module Design

```text
backend/
  src/
    common/{auth,authorization,errors,validation,pagination,logging,idempotency}
    infrastructure/{database,redis,queue,storage,mail,sms,ai,integrations}
    modules/
      identity/ organizations/ patients/ practitioners/ preferences/
      scheduling/ appointments/ check-in/ clinic-queue/
      encounters/ symptom-intake/ ai-assessments/ clinical-decisions/
      clinical-orders/ workflows/ medical-records/ prescriptions/ files/
      care-plans/ notifications/ audit/ integration-ops/ progress/ reports/ support/
  prisma/{schema.prisma,migrations,seed/}
  test/{integration,e2e,security,fixtures}
```

Every module has controller, DTO, application command/query handlers, domain policies, repository adapter, mapper, events/jobs and tests. Controllers only authenticate/validate/dispatch. Repository code persists/query-scopes; it does not decide permission. Authorization policies receive actor, membership, resource relation and requested action. Cross-module writes use application orchestration and one DB transaction.

Key dependencies: identity/organizations → patients/practitioners → scheduling/appointments → check-in/queue/encounters → clinical modules/workflows → records → care plans/reports. Audit/outbox are foundation dependencies; notifications consume domain events and must not own clinical transitions.

## 21. Database Design

All identifiers are UUID (`gen_random_uuid()`); expose stable human codes separately. All timestamps are `timestamptz`; DOB is `date`; status columns use PostgreSQL enums or checked text controlled by migrations. Every mutable aggregate has `version int` and timestamps. Tables with `organization_id` are indexed with it first for scope queries.

| Table | Important columns / PostgreSQL types | Constraints, indexes, security | Evidence / class |
|---|---|---|---|
| organizations, clinic_locations, departments | id, code, name, timezone, address_json | unique `(organization_id,code)`; no PHI | clinic fields/routes; INFERRED normalization |
| users | id, email `citext`, password_hash, display_name, status, mfa fields | unique email; password Argon2id; secrets excluded from DTO | User/Login; auth PROPOSED |
| roles, user_memberships | user_id, organization_id, clinic_id?, role, department_id? | unique scoped role; indexes for auth | roles; CONFIRMED/normalized |
| patients | id, org_id, code, user_id?, name, dob, gender, blood_type, phone/email/address encrypted fields | unique `(org_id,code)`; search tokens; soft archive | Patient; CONFIRMED |
| patient_care_team | patient_id, user_id, relationship, starts/ends | interval check; authorization index | primaryDoctor/relationship; INFERRED |
| consents, consent_events | patient,type,current state; event grant/withdraw/time/version | unique current; append-only event | Consent; CONFIRMED |
| practitioner_profiles, schedules, schedule_exceptions | user, specialty; local recurrence; exception range | clinic/specialty indexes | booking UI; INFERRED |
| appointments | id, code, org/clinic, patient, practitioner, starts_at, ends_at, mode, status, reason, service_code, version | FKs; GiST overlap exclusion for live statuses; patient/time index | Appointment; CONFIRMED |
| appointment_status_history | appointment, from/to, actor, reason, at | append-only | status actions; PROPOSED |
| check_in_tokens | appointment, patient, clinic, token_hash, version, valid_from/expires_at, status, used/device/revocation | unique token hash; partial unique active appointment | token interface; CONFIRMED |
| kiosk_devices | clinic, device_key_hash, name, status, last_seen | unique key; device authorization | check-in input deviceId; INFERRED |
| queue_tickets | appointment, encounter, patient, clinic, department, station, number, priority,status,times,next_station,version | one nonterminal/appointment; `(clinic,status,priority,issued_at)` | QueueTicket; CONFIRMED |
| queue_stations | clinic, code,name,department,room,status | unique clinic code | QueueStations; INFERRED |
| encounters | code, org/clinic, patient, appointment?,parent?,type,origin,status,department,room,current_doctor,blocking_condition,version,times | unique appointment where nonnull; patient/time, doctor/status indexes | MedicalEncounter; CONFIRMED |
| encounter_events | encounter, sequence, event_type,label,kind,actor,at | unique encounter sequence; append-only | EncounterEvent; CONFIRMED |
| symptom_intakes | encounter,version,complaint,severity,duration_days,symptoms/history/meds jsonb,submitted_by/at | checks severity 1..5, duration>=0; immutable versions | intake; CONFIRMED |
| ai_assessments | encounter,intake,status,red_flag jsonb,specialty,model_version,input_snapshot_hash,generated_at,supersedes? | immutable; index encounter/time | AI interface; CONFIRMED |
| ai_candidates | assessment,rank,code,name,band,score,evidence/rationale jsonb | score 0..100, unique rank | CandidateCondition; CONFIRMED |
| doctor_reviews | encounter,assessment?,doctor,action,accepted_code,rationale,reviewed_at | relation/author indexes | DoctorReview; CONFIRMED |
| diagnoses | encounter,doctor,status,code,name,rationale,assessment?,revision_of?,recorded_at | no hard delete; revision self-FK | DoctorDiagnosis; CONFIRMED |
| clinical_plans | encounter,doctor,diagnosis,summary,approved_at,version | diagnosis same encounter enforced service/trigger | ClinicalPlan; CONFIRMED |
| clinical_orders | encounter,type,ordered_by,justification,status,assigned_role,assignee?,version | encounter/status/role indexes | ClinicalOrder; CONFIRMED |
| clinical_results | order,version,summary,abnormal,recorded_by/at,revises? | immutable versions; unique current version | ClinicalResult; CONFIRMED |
| workflow_templates | org,name,specialty,description,created_by,latest_published_version | org/specialty index | WorkflowTemplate; CONFIRMED |
| workflow_template_versions | template,version,status,created/published,definition_hash,node_positions jsonb | unique template/version; published immutable | version; CONFIRMED |
| workflow_steps | version,code,name,executor,responsible_role,department,rules,durations,mandatory,output,sort | unique `(version,code)`; nonnegative times | step definition; CONFIRMED |
| workflow_step_dependencies | version,source_step,target_step | unique edge; DAG validated before publish | prerequisites; CONFIRMED |
| workflow_instances | code,org,patient,encounter,template,version,status,activated_by/at,completed,suspended_reason,identity_version | unique encounter active; pinned version; patient/encounter FK consistency | instance; CONFIRMED |
| workflow_tasks | instance,encounter,step,status,role,department,assignee,SLA,priority,urgency,times,rework_count,warning,version | instance/status/role and assignee indexes | task; CONFIRMED |
| medical_records | encounter,status,diagnosis?,prescription?,discharge/followup jsonb,signed_by/at,snapshot_hash,reopen_reason,version | unique encounter; immutable signed snapshot | MedicalRecord; CONFIRMED |
| record_signatures, record_addenda | record, signer/hash/time; addendum text/author/time/signature | append-only | signature/addendum; CONFIRMED |
| prescriptions, prescription_items | encounter,doctor,status,issued_at,note; medication name/dose/duration/route | encounter/issued index; no client actor | interfaces/mocks; CONFIRMED |
| file_objects, clinical_documents | object key,bucket,MIME,size,checksum,scan/status; encounter/task/order,type,name,version,visibility,review/signature | unique object key/checksum policy; private | ClinicalDocument/uploads; CONFIRMED/PROPOSED |
| care_plans | org,patient,encounter,status,created_at | patient/status index | CRMCarePlan; CONFIRMED |
| follow_up_activities | plan,type,title,description,due_at,priority,status,automation fields,version | plan/status/due index | FollowUpActivity; CONFIRMED |
| clinical_alerts | plan,patient,encounter?,trigger,severity,actor/deadline,status,note,times | open severity/deadline index | ClinicalAlert; CONFIRMED |
| encounter_creation_requests | patient,alert?,requester role/reason,status,times,decider,created_encounter | unique active request per alert | request; CONFIRMED |
| notifications, notification_deliveries | recipient,template,event,channel,status,minimal payload,relations,read_at; attempts/provider refs | recipient/read/time index; provider ref unique | Notification; CONFIRMED |
| integration_connections/messages | org,name,status,health counters; correlation,idempotency,status,timestamps,payload_ref | unique `(connection,idempotency_key)` | entities; CONFIRMED |
| progress_assessments | patient,encounter?,captured_at,scores jsonb,model/version,note,file_id | patient/time index | progress mocks; INFERRED |
| user_preferences, support_tickets | user,locale/timezone/notification prefs; topic/message/status | unique user; ticket user/time index | settings/support; INFERRED |
| audit_events | at,actor/role/action,resource/patient/org/clinic,request/ip/user-agent,result,reason,changed_fields,before/after redacted | append-only, monthly partition, org/at and patient/at indexes | AuditEvent; CONFIRMED + expanded PROPOSED |
| idempotency_records, outbox_events, refresh_sessions | scoped key/fingerprint/status/response/expiry; aggregate/event/payload; session token hash/family/device/revocation | unique scoped keys; retention jobs | production correctness; PROPOSED |

Key SQL invariant:

```sql
ALTER TABLE appointments ADD CONSTRAINT no_practitioner_overlap
EXCLUDE USING gist (
  practitioner_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('upcoming','confirmed','checked_in'));
```

Use `ON DELETE RESTRICT` for clinical/audit relations, `SET NULL` only for optional actor references after account deactivation, and cascade only true owned drafts (for example unpublished step edges when deleting an unused draft). “Soft delete” is archive/status, not a generic `deleted_at` applied to immutable clinical facts.

## 22. Entity Relationship Diagrams

```mermaid
erDiagram
  ORGANIZATION ||--o{ USER_MEMBERSHIP : scopes
  USER ||--o{ USER_MEMBERSHIP : has
  ORGANIZATION ||--o{ CLINIC_LOCATION : owns
  ORGANIZATION ||--o{ PATIENT : registers
  PATIENT ||--o{ PATIENT_CARE_TEAM : has
  USER ||--o{ PATIENT_CARE_TEAM : participates
  PATIENT ||--o{ APPOINTMENT : books
  USER ||--o{ APPOINTMENT : practitioner
  APPOINTMENT ||--o| ENCOUNTER : plans
  APPOINTMENT ||--o{ CHECK_IN_TOKEN : issues
  APPOINTMENT ||--o| QUEUE_TICKET : creates
  PATIENT ||--o{ ENCOUNTER : receives
  ENCOUNTER ||--o{ SYMPTOM_INTAKE : versions
  SYMPTOM_INTAKE ||--o{ AI_ASSESSMENT : assessed
  AI_ASSESSMENT ||--o{ AI_CANDIDATE : contains
  ENCOUNTER ||--o{ DOCTOR_REVIEW : reviewed
  ENCOUNTER ||--o{ DIAGNOSIS : diagnoses
  DIAGNOSIS ||--o{ CLINICAL_PLAN : supports
  ENCOUNTER ||--o{ CLINICAL_ORDER : orders
  CLINICAL_ORDER ||--o{ CLINICAL_RESULT : results
  ENCOUNTER ||--o| WORKFLOW_INSTANCE : runs
  WORKFLOW_TEMPLATE ||--o{ WORKFLOW_TEMPLATE_VERSION : versions
  WORKFLOW_TEMPLATE_VERSION ||--o{ WORKFLOW_STEP : defines
  WORKFLOW_INSTANCE ||--o{ WORKFLOW_TASK : contains
  ENCOUNTER ||--o| MEDICAL_RECORD : documents
  MEDICAL_RECORD ||--o{ RECORD_SIGNATURE : signed
  MEDICAL_RECORD ||--o{ RECORD_ADDENDUM : amends
  ENCOUNTER ||--o{ CLINICAL_DOCUMENT : attaches
  FILE_OBJECT ||--o| CLINICAL_DOCUMENT : stores
  ENCOUNTER ||--o| PRESCRIPTION : issues
  PRESCRIPTION ||--o{ PRESCRIPTION_ITEM : contains
  PATIENT ||--o{ CARE_PLAN : follows
  CARE_PLAN ||--o{ FOLLOW_UP_ACTIVITY : schedules
  CARE_PLAN ||--o{ CLINICAL_ALERT : raises
  CLINICAL_ALERT ||--o| ENCOUNTER_CREATION_REQUEST : requests
  USER ||--o{ NOTIFICATION : receives
  PATIENT ||--o{ PROGRESS_ASSESSMENT : tracks
  USER ||--o{ AUDIT_EVENT : acts
```

## 23. Mock-to-Database Mapping

| Mock source/field | Example | Backend mapping/transformation | Validation / persisted vs derived |
|---|---|---|---|
| all `id` strings | `ENC-1001` | UUID `id`; preserve as unique `code` in seed | server-generated |
| patient `profile.dob` | `15/03/1995` | `patients.dob date` | parse DD/MM/YYYY once; reject ambiguous API dates |
| `name/phone/reason` booking locals | strings | patient snapshot/contact and `appointments.reason` | reason length; server owns patient relation |
| appointment date/time | `15/10/2023`, `09:00` | zoned local input → UTC `starts_at/ends_at` | slot must exist; derived display |
| `clinicName/department` | labels | FKs to location/department | labels returned projections |
| appointment price string | `500.000đ` | no mapping in MVP | UI placeholder, not authoritative |
| nested doctor | name/spec/rating | practitioner/user relations; rating future aggregate | IDs persisted, labels derived |
| token `token` and `tokenHash` | `DH1...` | return raw once; persist SHA-256/HMAC hash only | secret, expiry/status server-owned |
| queue `peopleAhead/estimatedWait` | numbers | query/estimator | derived, not trusted |
| encounter arrays of IDs/events | arrays | child tables/FKs/event rows | normalized |
| AI candidates arrays | top 3 | `ai_candidates` rows + JSONB evidence | immutable model output |
| workflow step arrays/prerequisites | codes | steps + edge table | DAG/unique code validation |
| `nodePositions` | `{code:{x,y}}` | version JSONB | UI-only persisted layout |
| medication `duration`/`remaining` | `3 tháng`, `65 ngày` | duration days/instructions; remaining derived from start/end | display strings not stored |
| fake file hash/URL | `sha256:mock-*`, null | file object checksum/private key | calculated server-side |
| progress `week` | `T1` | captured timestamp; week derived | require patient/file/model |
| notification counters/read boolean | values | delivery attempts and `read_at` | status provider/server-owned |
| audit actorName/role | strings | actor FK plus immutable role/name snapshot | server-derived |

## 24. API Design Conventions

Base path `/api/v1`; JSON UTF-8; IDs UUID; timestamps RFC 3339 UTC; local scheduling request includes IANA timezone only when needed. Success: `{"data":...,"meta":...,"requestId":"uuid"}`. Error: `{"error":{"code":"...","message":"safe localized fallback","details":[{"field":"...","code":"..."}],"requestId":"uuid"}}`. Never expose stack/SQL/provider secrets.

### Mandatory API naming rules

The endpoint vocabulary must use the same English domain nouns already present in the Frontend types. Paths use lower-case plural `kebab-case`; JSON fields use `camelCase`; database columns use `snake_case`. Do not translate API resource names into Vietnamese and do not expose database table names directly.

The public API deliberately uses `doctor`, `doctorId`, `/doctors` and `DoctorResponse` because those names match the current FE (`UserRole='doctor'`, `Appointment.doctorId`, `DOCTORS`). The backend may keep the broader internal/database concept `practitioner_profile`, but it must not leak that rename into the FE contract during this rebuild.

| FE/domain name | API collection noun | TypeScript DTO prefix | Database table |
|---|---|---|---|
| User | `users` | `User` | `users` |
| Patient | `patients` | `Patient` | `patients` |
| Consent | `consents` | `Consent` | `consents`, `consent_events` |
| Doctor (backend practitioner profile) | `doctors` | `Doctor` | `practitioner_profiles` |
| Appointment | `appointments` | `Appointment` | `appointments` |
| AppointmentCheckInToken | `check-in-tokens` | `CheckInToken` | `check_in_tokens` |
| QueueTicket | `queue-tickets` | `QueueTicket` | `queue_tickets` |
| QueueStation | `queue-stations` | `QueueStation` | `queue_stations` |
| MedicalEncounter | `encounters` | `Encounter` | `encounters` |
| SymptomIntake | `symptom-intakes` | `SymptomIntake` | `symptom_intakes` |
| AIPreliminaryAssessment | `ai-assessments` | `AiAssessment` | `ai_assessments` |
| DoctorReview | `doctor-reviews` | `DoctorReview` | `doctor_reviews` |
| DoctorDiagnosis | `diagnoses` | `Diagnosis` | `diagnoses` |
| ClinicalPlan | `clinical-plans` | `ClinicalPlan` | `clinical_plans` |
| ClinicalOrder | `clinical-orders` | `ClinicalOrder` | `clinical_orders` |
| ClinicalResult | `clinical-results` | `ClinicalResult` | `clinical_results` |
| WorkflowTemplate | `workflow-templates` | `WorkflowTemplate` | `workflow_templates` |
| WorkflowTemplateVersion | `workflow-template-versions` | `WorkflowTemplateVersion` | `workflow_template_versions` |
| WorkflowInstance | `workflow-instances` | `WorkflowInstance` | `workflow_instances` |
| WorkflowTask | `workflow-tasks` | `WorkflowTask` | `workflow_tasks` |
| MedicalRecord | `medical-records` | `MedicalRecord` | `medical_records` |
| Prescription | `prescriptions` | `Prescription` | `prescriptions` |
| ClinicalDocument | `clinical-documents` | `ClinicalDocument` | `clinical_documents` |
| FileObject | `files` | `File` | `file_objects` |
| CRMCarePlan | `care-plans` | `CarePlan` | `care_plans` |
| FollowUpActivity | `follow-up-activities` | `FollowUpActivity` | `follow_up_activities` |
| ClinicalAlert | `clinical-alerts` | `ClinicalAlert` | `clinical_alerts` |
| EncounterCreationRequest | `encounter-creation-requests` | `EncounterCreationRequest` | `encounter_creation_requests` |
| Notification | `notifications` | `Notification` | `notifications` |
| AuditEvent | `audit-events` | `AuditEvent` | `audit_events` |
| IntegrationConnection | `integration-connections` | `IntegrationConnection` | `integration_connections` |
| IntegrationMessage | `integration-messages` | `IntegrationMessage` | `integration_messages` |
| ProgressAssessment | `progress-assessments` | `ProgressAssessment` | `progress_assessments` |
| SupportTicket | `support-tickets` | `SupportTicket` | `support_tickets` |

Action-like business operations are modeled as noun subresources, not RPC verbs in the URL. Examples: create an appointment cancellation with `POST /appointments/{id}/cancellations`, create a record signature with `POST /medical-records/{id}/signatures`, create a task completion with `POST /workflow-tasks/{id}/completions`. The command body carries `reason`, `version`, `targetStatus` or output fields. Do not implement paths such as `/doCancel`, `/updateStatus`, `/process`, `/handle`, `/saveData` or generic `PATCH {status:any}`.

| URL suffix | Meaning | Minimum body |
|---|---|---|
| `/cancellations` | cancel an appointment/order/workflow instance | `{ reason, version }` |
| `/reschedules` | move an appointment to another server-issued slot | `{ slotId, reason?, version }` |
| `/status-transitions` | guarded transition where several canonical next states are valid | `{ targetStatus, reason?, version }` |
| `/check-in-tokens` | issue/replace a QR check-in credential | `{ reason?, replaceCurrent }` |
| `/check-in-token-revocations` | revoke the current credential | `{ reason, version }` |
| `/calls` | call a waiting queue ticket | `{ stationId, room?, version }` |
| `/acknowledgements` | confirm the called patient/device acknowledged | `{ version }` |
| `/service-starts` | begin queue/order/task service | `{ version, ...resourceSpecificFields }` |
| `/completions` | complete queue/workflow resources | `{ version, output? }` |
| `/routes` | route a queue ticket to its next station | `{ nextStationId, preparationInstructions?, version }` |
| `/revisions` | append a new diagnosis/result version | revised content + `{ reason/rationale, version }` |
| `/publications` | publish an immutable workflow version | `{ note?, version }` |
| `/archives` | archive a workflow version | `{ reason, version }` |
| `/suspensions`, `/resumptions` | suspend/resume runtime workflow | `{ reason, version }` or `{ version }` |
| `/acceptances`, `/rejections`, `/skips`, `/escalations` | workflow task decisions | `{ reason?, version }` plus documented output |
| `/assignments` | assign/reassign a workflow task | `{ assigneeId, reason?, version }` |
| `/signatures` | sign and freeze a medical record snapshot | `{ attestation, version }` |
| `/addenda` | append a signed-record correction/note | `{ text, version }` |
| `/reopenings` | reopen a signed record through privileged review | `{ reason, version }` |
| `/reviews` | create a human review of AI/document content | review-specific outcome/action, rationale and version if mutable |
| `/confirmations` | patient confirms a follow-up activity | `{ note?, version }` |
| `/acknowledgements`, `/resolutions` | acknowledge/resolve a clinical alert | `{ note?, version }` or `{ resolutionNote, version }` |
| `/decisions` | approve/reject an encounter creation request | `{ decision, reason?, departmentId?, version }` |
| `/read-receipts` | mark one notification read | `{ readAt? }` |
| `/retry-requests`, `/retry-runs` | request an asynchronous retry | `{ reason?, ...scope }` with Idempotency-Key |
| `/upload-completions` | tell backend object upload finished | `{ checksumSha256 }` |
| `/download-sessions` | issue short-lived authorized download URL | `{ purpose? }` |

### DTO suffix and envelope rules

| Use | Required name | Shape rule |
|---|---|---|
| Create request body | `Create<Resource>Request` | Client-writable fields only; no `id`, actor, role, timestamps or server status |
| Update request body | `Update<Resource>Request` | Explicit optional allow-list plus mandatory `version` |
| Command request body | `<Action><Resource>Request` | Business inputs, `reason` where needed, mandatory `version` for mutable aggregates |
| Single response | `<Resource>Response` | Canonical resource projection inside `{ data }` |
| List response | `<Resource>ListResponse` | `{ data: ResourceResponse[], meta: PageMeta, requestId }` |
| Detail response | `<Resource>DetailResponse` | May include named nested read projections; never arbitrary entity graphs |
| Query object | `List<Resource>Query` | Whitelisted filters/sort/pagination only |
| Identifier | `<resource>Id` | UUID string in API; human-readable value uses separate `code` |

Use suffixes consistently: `Id` for foreign keys, `At` for instants, `Date` for calendar dates, `Minutes`/`Days` for durations, `Count` for totals, `Url` only for short-lived derived URLs, `Status` for canonical enums, `Code` for human/business codes, and `Version` for optimistic locking. Boolean names start with `is`, `has`, `can`, `requires` or a past-tense state such as `read` only when matching the confirmed FE field. Never return formatted fields such as `dateText`, `priceLabel`, `doctorNameText`, `remainingText` as authority; return raw values and optionally a named `display` projection.

### Common query parameters and response metadata

| Parameter | Type/default | Used by | Rule |
|---|---|---|---|
| `page` | integer, default 1 | stable small admin lists | minimum 1 |
| `limit` | integer, default 20 | all lists | 1–100 |
| `cursor` | opaque string | feeds/audit/tasks/notifications | cannot be combined with `page` |
| `search` | string | patients/doctors/appointments/templates | trim; 2–100 chars |
| `status` | repeatable enum or comma-separated documented enum | stateful lists | reject unknown values |
| `from`, `to` | RFC 3339 instant or ISO date as documented | appointment/audit/report ranges | `from <= to` |
| `sortBy` | endpoint-specific enum | lists | never raw DB column |
| `sortOrder` | `asc` or `desc` | lists | default documented per endpoint |

Offset metadata is `{"page":1,"limit":20,"total":125,"totalPages":7}`. Cursor metadata is `{"nextCursor":"opaque-or-null","hasNextPage":true,"limit":20}`. Empty lists return HTTP 200 with `data: []`, never HTTP 404.

Use cursor pagination (`cursor`, `limit` max 100) for audit, notification, task/event feeds; offset (`page`, `limit` max 100) for small admin/reference lists and appointment search. Common filters: `search` max 100, enum `status`, `from`, `to`, scoped IDs. Each endpoint whitelists `sortBy`; never accept database column names. `If-Match`/`version` is required for mutable workflow/queue/record commands where stale UI is dangerous. `Idempotency-Key` is required as defined in section 32.

Generate OpenAPI from NestJS DTOs including cookie/bearer auth, enums, filters, multipart/presign flows, all errors, examples, webhook signatures, deprecations and `/api/v1`. CI fails on undocumented controllers or breaking schema drift.

### FE–BE contract governance

- Backend owns OpenAPI and publishes a versioned artifact on every CI build; Frontend generates or validates its API types from that artifact.
- After a module passes its delivery gate, removing/renaming a field, enum or endpoint requires an explicit breaking-change review. Additive optional fields are allowed within `/api/v1`; breaking changes require a migration window or `/api/v2`.
- Every list response must define its pagination and sort whitelist. Every mutation must document cache invalidations or affected resources for the FE integration owner.
- The API returns canonical codes and raw values, never Vietnamese display labels as authority. FE owns localized labels such as `ROLE_LABEL`, `ENCOUNTER_STATUS_LABEL` and `TASK_STATUS_LABEL`.
- During incremental migration, one FE module may use either its mock repository or the real API, never merge both as authoritative data in the same screen. Seed codes may be used for demo deep links, but UUIDs are the API identifiers.
- Contract fixtures must include at least one success, empty result, forbidden result, validation error, conflict and stale-version response for each high-risk module.

### Recommended shared FE endpoint constants

The FE may generate this client from OpenAPI; if handwritten temporarily, use one route module and these names rather than scattering URL strings across pages:

```ts
const API = {
  sessions: '/api/v1/auth/sessions',
  sessionRefreshes: '/api/v1/auth/session-refreshes',
  currentSession: '/api/v1/auth/sessions/current',
  me: '/api/v1/me',
  preferences: '/api/v1/me/preferences',
  patients: '/api/v1/patients',
  patient: (id: string) => `/api/v1/patients/${id}`,
  patientConsents: (id: string) => `/api/v1/patients/${id}/consents`,
  doctors: '/api/v1/doctors',
  doctorAvailabilitySlots: (id: string) => `/api/v1/doctors/${id}/availability-slots`,
  appointments: '/api/v1/appointments',
  appointment: (id: string) => `/api/v1/appointments/${id}`,
  appointmentCancellations: (id: string) => `/api/v1/appointments/${id}/cancellations`,
  appointmentReschedules: (id: string) => `/api/v1/appointments/${id}/reschedules`,
  appointmentCheckInTokens: (id: string) => `/api/v1/appointments/${id}/check-in-tokens`,
  checkIns: '/api/v1/check-ins',
  queueTickets: '/api/v1/queue-tickets',
  queueTicket: (id: string) => `/api/v1/queue-tickets/${id}`,
  queueStations: '/api/v1/queue-stations',
  encounters: '/api/v1/encounters',
  encounter: (id: string) => `/api/v1/encounters/${id}`,
  encounterEvents: (id: string) => `/api/v1/encounters/${id}/events`,
  symptomIntakes: (id: string) => `/api/v1/encounters/${id}/symptom-intakes`,
  aiAssessmentRequests: (id: string) => `/api/v1/encounters/${id}/ai-assessment-requests`,
  aiAssessment: (id: string) => `/api/v1/ai-assessments/${id}`,
  diagnoses: (id: string) => `/api/v1/encounters/${id}/diagnoses`,
  clinicalPlans: (id: string) => `/api/v1/encounters/${id}/clinical-plans`,
  clinicalOrders: '/api/v1/clinical-orders',
  encounterClinicalOrders: (id: string) => `/api/v1/encounters/${id}/clinical-orders`,
  workflowTemplates: '/api/v1/workflow-templates',
  workflowTemplateVersion: (id: string) => `/api/v1/workflow-template-versions/${id}`,
  workflowInstances: '/api/v1/workflow-instances',
  workflowTasks: '/api/v1/workflow-tasks',
  medicalRecord: (encounterId: string) => `/api/v1/encounters/${encounterId}/medical-record`,
  medicalRecords: (encounterId: string) => `/api/v1/encounters/${encounterId}/medical-records`,
  prescriptions: '/api/v1/prescriptions',
  encounterPrescriptions: (id: string) => `/api/v1/encounters/${id}/prescriptions`,
  fileUploadIntents: '/api/v1/file-upload-intents',
  clinicalDocuments: (id: string) => `/api/v1/encounters/${id}/clinical-documents`,
  carePlans: '/api/v1/care-plans',
  followUpActivities: '/api/v1/follow-up-activities',
  clinicalAlerts: '/api/v1/clinical-alerts',
  encounterCreationRequests: '/api/v1/encounter-creation-requests',
  notifications: '/api/v1/notifications',
  auditEvents: '/api/v1/audit-events',
  integrationConnections: '/api/v1/integration-connections',
  integrationMessages: '/api/v1/integration-messages',
  progressAssessments: '/api/v1/progress-assessments',
  supportTickets: '/api/v1/support-tickets',
} as const;
```

## 25. Complete API Endpoint Catalog

Every path below is literal. A row never represents several hidden endpoints joined by `|`. Unless marked public/device, endpoints require an authenticated user and organization context. `Idempotency-Key` means the HTTP header is mandatory.

### Identity, current user, patients and consent

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/sessions` | `CreateSessionRequest { email, password, rememberMe, mfaCode? }` | `SessionResponse` + refresh cookie | Public; login |
| POST | `/api/v1/auth/session-refreshes` | No JSON body; refresh cookie | `SessionResponse` + rotated cookie | Public with valid refresh session |
| DELETE | `/api/v1/auth/sessions/current` | No body | `204` | Authenticated logout |
| DELETE | `/api/v1/auth/sessions` | `{ password? }` | `204` | Revoke all own sessions |
| POST | `/api/v1/password-reset-requests` | `{ email }` | `202` empty data | Public; non-enumerating response |
| POST | `/api/v1/password-resets` | `{ token, newPassword }` | `204` | Public with single-use token |
| GET | `/api/v1/me` | None | `CurrentUserResponse` | Header, app bootstrap |
| PATCH | `/api/v1/me` | `UpdateCurrentUserRequest { name?, phone?, avatarFileId?, version }` | `CurrentUserResponse` | Own account only |
| GET | `/api/v1/me/preferences` | None | `UserPreferenceResponse` | Settings |
| PUT | `/api/v1/me/preferences` | `UpsertUserPreferenceRequest` | `UserPreferenceResponse` | Settings; full preference document |
| GET | `/api/v1/users` | `page,limit,search,role,status,clinicId,sortBy,sortOrder` | `UserListResponse` | Medical/system admin |
| GET | `/api/v1/users/{userId}` | None | `UserResponse` | Scoped admin/staff lookup |
| GET | `/api/v1/patients` | `page,limit,search,clinicId,primaryDoctorId,sortBy,sortOrder` | `PatientListResponse` | Authorized staff only |
| GET | `/api/v1/patients/{patientId}` | None | `PatientDetailResponse` | Self or relationship policy; audited |
| PATCH | `/api/v1/patients/{patientId}` | `UpdatePatientRequest { name?, dob?, gender?, phone?, email?, address?, bloodType?, primaryDoctorId?, version }` | `PatientResponse` | Field-level policy |
| GET | `/api/v1/patients/{patientId}/consents` | `page,limit,type` | `ConsentListResponse` | Patient self/authorized admin |
| POST | `/api/v1/patients/{patientId}/consent-grants` | `CreateConsentGrantRequest { type, policyVersion, grantedAt? }` | `ConsentResponse` | Idempotency-Key |
| POST | `/api/v1/patients/{patientId}/consent-withdrawals` | `CreateConsentWithdrawalRequest { type, reason?, version }` | `ConsentResponse` | Idempotency-Key |

### Clinics, doctors and scheduling

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/organizations` | `page,limit,search` | `OrganizationListResponse` | Platform/admin scope |
| GET | `/api/v1/clinic-locations` | `organizationId,search,status` | `ClinicLocationListResponse` | Authenticated reference data |
| GET | `/api/v1/departments` | `clinicLocationId,search,status` | `DepartmentListResponse` | Authenticated reference data |
| GET | `/api/v1/doctors` | `page,limit,search,specialty,clinicLocationId,online,sortBy` | `DoctorListResponse` | Appointment doctor search |
| GET | `/api/v1/doctors/{doctorId}` | None | `DoctorDetailResponse` | Authenticated |
| GET | `/api/v1/doctors/{doctorId}/availability-slots` | `clinicLocationId,fromDate,toDate,mode,serviceCode` | `AvailabilitySlotListResponse` | Dates are `YYYY-MM-DD`; max range 31 days |
| GET | `/api/v1/doctor-schedules` | `doctorId,clinicLocationId,fromDate,toDate` | `DoctorScheduleListResponse` | Doctor/admin |
| POST | `/api/v1/doctor-schedules` | `CreateDoctorScheduleRequest` | `DoctorScheduleResponse` | Admin/doctor; Idempotency-Key |
| PATCH | `/api/v1/doctor-schedules/{scheduleId}` | `UpdateDoctorScheduleRequest` | `DoctorScheduleResponse` | Version required |
| POST | `/api/v1/doctor-schedules/{scheduleId}/exceptions` | `CreateScheduleExceptionRequest { startsAt, endsAt, type, reason? }` | `ScheduleExceptionResponse` | Leave/closure/override |

### Appointments, QR check-in and clinic queue

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/appointments` | `page,limit,search,status,patientId,doctorId,clinicLocationId,from,to,mode,sortBy,sortOrder` | `AppointmentListResponse` | Patient list is forced to self; staff scoped |
| POST | `/api/v1/appointments` | `CreateAppointmentRequest { slotId, patientId, mode, reason?, contactPhone? }` | `AppointmentDetailResponse` | Patient/receptionist; Idempotency-Key |
| GET | `/api/v1/appointments/{appointmentId}` | None | `AppointmentDetailResponse` | Patient owner or related staff |
| POST | `/api/v1/appointments/{appointmentId}/cancellations` | `CreateAppointmentCancellationRequest { reason, version }` | `AppointmentResponse` | Patient/receptionist; Idempotency-Key |
| POST | `/api/v1/appointments/{appointmentId}/reschedules` | `CreateAppointmentRescheduleRequest { slotId, reason?, version }` | `AppointmentDetailResponse` | Idempotency-Key |
| POST | `/api/v1/appointments/{appointmentId}/missed-records` | `CreateAppointmentMissedRecordRequest { reason?, version }` | `AppointmentResponse` | Receptionist/clinician |
| GET | `/api/v1/appointments/{appointmentId}/check-in-tokens/current` | None | `CheckInTokenDisplayResponse` | Returns raw token only to authorized owner/staff while active |
| POST | `/api/v1/appointments/{appointmentId}/check-in-tokens` | `CreateCheckInTokenRequest { reason?, replaceCurrent }` | `CheckInTokenDisplayResponse` | Receptionist/admin or booking service; Idempotency-Key |
| POST | `/api/v1/appointments/{appointmentId}/check-in-token-revocations` | `CreateCheckInTokenRevocationRequest { reason, version }` | `CheckInTokenResponse` | Receptionist/admin |
| POST | `/api/v1/check-ins` | `CreateCheckInRequest { token, clinicLocationId, deviceId, patientCode? }` | `CheckInResponse { ticket, repeated }` | Registered kiosk/reception device; Idempotency-Key |
| GET | `/api/v1/queue-tickets` | `cursor,limit,status,clinicLocationId,departmentId,stationId,priority,patientId,appointmentId` | `QueueTicketListResponse` | Staff scoped |
| GET | `/api/v1/queue-tickets/{queueTicketId}` | None | `QueueTicketDetailResponse` | Patient owner/related staff |
| POST | `/api/v1/queue-tickets/{queueTicketId}/calls` | `{ stationId, room?, version }` | `QueueTicketResponse` | Queue controller; Idempotency-Key |
| POST | `/api/v1/queue-tickets/{queueTicketId}/acknowledgements` | `{ version }` | `QueueTicketResponse` | Queue controller/device |
| POST | `/api/v1/queue-tickets/{queueTicketId}/service-starts` | `{ stationId, room?, version }` | `QueueTicketResponse` | Queue controller |
| POST | `/api/v1/queue-tickets/{queueTicketId}/skips` | `{ reason, version }` | `QueueTicketResponse` | Queue controller |
| POST | `/api/v1/queue-tickets/{queueTicketId}/completions` | `{ version }` | `QueueTicketResponse` | Queue controller |
| POST | `/api/v1/queue-tickets/{queueTicketId}/routes` | `{ nextStationId, preparationInstructions?, version }` | `QueueTicketResponse` | Queue controller |
| GET | `/api/v1/queue-stations` | `clinicLocationId,departmentId,status` | `QueueStationListResponse` | Staff/reference |
| POST | `/api/v1/queue-display-sessions` | `{ clinicLocationId, stationId? }` | `{ token, expiresAt, streamUrl }` | Admin/device enrollment |
| GET | `/api/v1/queue-display-events` | `displayToken` | SSE stream | Public display; redacted payload |

### Encounters, symptom intake, AI and doctor decisions

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/encounters` | `page,limit,status,patientId,appointmentId,currentDoctorId,departmentId,from,to,sortBy` | `EncounterListResponse` | Relationship scoped |
| POST | `/api/v1/encounters` | `CreateEncounterRequest { patientId, type, origin, departmentId, appointmentId?, parentEncounterId? }` | `EncounterDetailResponse` | Staff or approved CRM flow; Idempotency-Key |
| GET | `/api/v1/encounters/{encounterId}` | `include=events,queueSummary,workflowSummary` whitelist | `EncounterDetailResponse` | Audited clinical read |
| GET | `/api/v1/encounters/{encounterId}/events` | `cursor,limit` | `EncounterEventListResponse` | Related actor |
| POST | `/api/v1/encounters/{encounterId}/status-transitions` | `CreateEncounterStatusTransitionRequest { targetStatus, reason?, blockingCondition?, version }` | `EncounterResponse` | Internal/authorized command; Idempotency-Key |
| GET | `/api/v1/encounters/{encounterId}/symptom-intakes` | `page,limit` | `SymptomIntakeListResponse` | Patient/related clinician |
| POST | `/api/v1/encounters/{encounterId}/symptom-intakes` | `CreateSymptomIntakeRequest` | `SymptomIntakeResponse` | Patient/clinician; Idempotency-Key |
| GET | `/api/v1/symptom-intakes/{symptomIntakeId}` | None | `SymptomIntakeDetailResponse` | Related actor |
| GET | `/api/v1/encounters/{encounterId}/ai-assessments` | `page,limit,status` | `AiAssessmentListResponse` | Patient-safe or clinician projection |
| POST | `/api/v1/encounters/{encounterId}/ai-assessment-requests` | `{ symptomIntakeId, supersedesAssessmentId? }` | `AiAssessmentJobResponse` | Patient/clinician; Idempotency-Key; may return 202 |
| GET | `/api/v1/ai-assessments/{aiAssessmentId}` | None | `AiAssessmentDetailResponse` | Related actor |
| POST | `/api/v1/ai-assessments/{aiAssessmentId}/doctor-reviews` | `CreateDoctorReviewRequest { action, acceptedConditionCode?, rationale? }` | `DoctorReviewResponse` | Assigned doctor; Idempotency-Key |
| GET | `/api/v1/encounters/{encounterId}/doctor-reviews` | `page,limit` | `DoctorReviewListResponse` | Clinician/admin; patient projection optional |
| GET | `/api/v1/encounters/{encounterId}/diagnoses` | `page,limit,status` | `DiagnosisListResponse` | Related actor; release policy applies |
| POST | `/api/v1/encounters/{encounterId}/diagnoses` | `CreateDiagnosisRequest` | `DiagnosisResponse` | Assigned doctor; Idempotency-Key |
| POST | `/api/v1/diagnoses/{diagnosisId}/revisions` | `CreateDiagnosisRevisionRequest { conditionCode?, conditionName, rationale, status, version }` | `DiagnosisResponse` | Assigned doctor; append-only |
| GET | `/api/v1/encounters/{encounterId}/clinical-plans` | None | `ClinicalPlanListResponse` | Related actor |
| POST | `/api/v1/encounters/{encounterId}/clinical-plans` | `CreateClinicalPlanRequest { diagnosisId, summary }` | `ClinicalPlanResponse` | Assigned doctor; Idempotency-Key |

### Clinical orders and results

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/clinical-orders` | `page,limit,status,type,encounterId,patientId,assignedRole,assigneeId,from,to` | `ClinicalOrderListResponse` | Role/task scoped |
| POST | `/api/v1/encounters/{encounterId}/clinical-orders` | `CreateClinicalOrderRequest { type, justification, assignedRole, assigneeId? }` | `ClinicalOrderResponse` | Assigned doctor; Idempotency-Key |
| GET | `/api/v1/clinical-orders/{clinicalOrderId}` | None | `ClinicalOrderDetailResponse` | Related actor |
| POST | `/api/v1/clinical-orders/{clinicalOrderId}/service-starts` | `{ version }` | `ClinicalOrderResponse` | Assigned technician |
| POST | `/api/v1/clinical-orders/{clinicalOrderId}/invalid-samples` | `{ reason, version }` | `ClinicalOrderResponse` | Lab technician; Idempotency-Key |
| POST | `/api/v1/clinical-orders/{clinicalOrderId}/cancellations` | `{ reason, version }` | `ClinicalOrderResponse` | Doctor/admin |
| GET | `/api/v1/clinical-orders/{clinicalOrderId}/clinical-results` | `page,limit` | `ClinicalResultListResponse` | Related actor |
| POST | `/api/v1/clinical-orders/{clinicalOrderId}/clinical-results` | `CreateClinicalResultRequest { summary, abnormal, fileIds?, version }` | `ClinicalResultResponse` | Assigned technician/doctor; Idempotency-Key |
| POST | `/api/v1/clinical-results/{clinicalResultId}/revisions` | `CreateClinicalResultRevisionRequest { summary, abnormal, reason, fileIds?, version }` | `ClinicalResultResponse` | Authorized clinician; append-only |

### Workflow templates, versions, instances and tasks

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/workflow-templates` | `page,limit,search,specialty,status,sortBy` | `WorkflowTemplateListResponse` | Designer/admin/staff read |
| POST | `/api/v1/workflow-templates` | `CreateWorkflowTemplateRequest { name, specialty, description }` | `WorkflowTemplateDetailResponse` | Designer/admin; creates draft v1 |
| GET | `/api/v1/workflow-templates/{workflowTemplateId}` | None | `WorkflowTemplateDetailResponse` | Authorized staff |
| PATCH | `/api/v1/workflow-templates/{workflowTemplateId}` | `UpdateWorkflowTemplateRequest { name?, specialty?, description?, version }` | `WorkflowTemplateResponse` | Designer/admin |
| GET | `/api/v1/workflow-templates/{workflowTemplateId}/versions` | `page,limit,status` | `WorkflowTemplateVersionListResponse` | Authorized staff |
| POST | `/api/v1/workflow-templates/{workflowTemplateId}/versions` | `{ sourceVersionId? }` | `WorkflowTemplateVersionDetailResponse` | Creates new draft from published/base |
| GET | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}` | None | `WorkflowTemplateVersionDetailResponse` | Authorized staff |
| PATCH | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/layout` | `{ nodePositions, version }` | `WorkflowTemplateVersionResponse` | Draft only |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/steps` | `CreateWorkflowStepRequest` | `WorkflowStepResponse` | Draft only |
| PATCH | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/steps/{stepCode}` | `UpdateWorkflowStepRequest` | `WorkflowStepResponse` | Draft only |
| DELETE | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/steps/{stepCode}` | `If-Match` version header; optional reason query | `204` | Draft/nonmandatory only |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/dependencies` | `{ sourceStepCode, targetStepCode, version }` | `WorkflowTemplateVersionResponse` | Reject cycles |
| DELETE | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/dependencies/{sourceStepCode}/{targetStepCode}` | `If-Match` | `204` | Draft only |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/validation-runs` | `{ version }` | `WorkflowValidationResponse` | Read-only validation result resource |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/review-submissions` | `{ note?, version }` | `WorkflowTemplateVersionResponse` | Designer/admin |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/publications` | `{ note?, version }` | `WorkflowTemplateVersionResponse` | Medical admin; Idempotency-Key |
| POST | `/api/v1/workflow-template-versions/{workflowTemplateVersionId}/archives` | `{ reason, version }` | `WorkflowTemplateVersionResponse` | Medical admin |
| GET | `/api/v1/workflow-instances` | `page,limit,status,patientId,encounterId,templateId,from,to` | `WorkflowInstanceListResponse` | Staff scoped |
| POST | `/api/v1/encounters/{encounterId}/workflow-instances` | `{ workflowTemplateId }` | `WorkflowInstanceDetailResponse` | Doctor/admin; Idempotency-Key |
| GET | `/api/v1/workflow-instances/{workflowInstanceId}` | `include=tasks,templateVersion` whitelist | `WorkflowInstanceDetailResponse` | Related staff/patient-safe projection |
| POST | `/api/v1/workflow-instances/{workflowInstanceId}/suspensions` | `{ reason, version }` | `WorkflowInstanceResponse` | Authorized staff |
| POST | `/api/v1/workflow-instances/{workflowInstanceId}/resumptions` | `{ version }` | `WorkflowInstanceResponse` | Authorized staff |
| POST | `/api/v1/workflow-instances/{workflowInstanceId}/cancellations` | `{ reason, version }` | `WorkflowInstanceResponse` | Doctor/admin |
| POST | `/api/v1/workflow-instances/{workflowInstanceId}/completions` | `{ version }` | `WorkflowInstanceResponse` | Mandatory task check |
| GET | `/api/v1/workflow-tasks` | `cursor,limit,status,responsibleRole,departmentId,assigneeId,priority,urgency,encounterId,instanceId,sortBy` | `WorkflowTaskListResponse` | WorkQueue; server forces role/scope |
| GET | `/api/v1/workflow-tasks/{workflowTaskId}` | None | `WorkflowTaskDetailResponse` | Related staff |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/acceptances` | `{ version }` | `WorkflowTaskResponse` | Responsible actor; Idempotency-Key |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/service-starts` | `{ version }` | `WorkflowTaskResponse` | Assignee |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/completions` | `{ output?, version }` | `WorkflowTaskResponse` | Assignee; required output validation |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/redo-requests` | `{ reason, version }` | `WorkflowTaskResponse` | Authorized reviewer |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/rejections` | `{ reason, version }` | `WorkflowTaskResponse` | Authorized reviewer |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/escalations` | `{ reason, urgency?, version }` | `WorkflowTaskResponse` | Staff |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/skips` | `{ reason, version }` | `WorkflowTaskResponse` | `skipPermission` enforced |
| POST | `/api/v1/workflow-tasks/{workflowTaskId}/assignments` | `{ assigneeId, reason?, version }` | `WorkflowTaskResponse` | Coordinator/admin |

### Medical records, prescriptions, files and clinical documents

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/encounters/{encounterId}/medical-record` | None | `MedicalRecordDetailResponse` | Audited read; returns 404 when no draft exists |
| POST | `/api/v1/encounters/{encounterId}/medical-records` | `{}` | `MedicalRecordDetailResponse` | Ensure one draft; Idempotency-Key |
| PATCH | `/api/v1/medical-records/{medicalRecordId}` | `UpdateMedicalRecordRequest { diagnosisId?, discharge?, followUp?, version }` | `MedicalRecordDetailResponse` | Mutable states only |
| POST | `/api/v1/medical-records/{medicalRecordId}/signatures` | `CreateMedicalRecordSignatureRequest { attestation, version }` | `MedicalRecordDetailResponse` | Assigned doctor; Idempotency-Key |
| POST | `/api/v1/medical-records/{medicalRecordId}/addenda` | `CreateMedicalRecordAddendumRequest { text, version }` | `MedicalRecordAddendumResponse` | Doctor; signed/amended only |
| POST | `/api/v1/medical-records/{medicalRecordId}/reopenings` | `CreateMedicalRecordReopeningRequest { reason, version }` | `MedicalRecordDetailResponse` | Medical admin; Idempotency-Key |
| GET | `/api/v1/prescriptions` | `page,limit,patientId,encounterId,doctorId,status,from,to` | `PrescriptionListResponse` | Patient self/related staff |
| POST | `/api/v1/encounters/{encounterId}/prescriptions` | `CreatePrescriptionRequest { medications, note? }` | `PrescriptionDetailResponse` | Assigned doctor; Idempotency-Key |
| GET | `/api/v1/prescriptions/{prescriptionId}` | None | `PrescriptionDetailResponse` | Related actor |
| POST | `/api/v1/prescriptions/{prescriptionId}/discontinuations` | `{ reason, version }` | `PrescriptionResponse` | Prescribing/covering doctor; PROPOSED safe command |
| POST | `/api/v1/file-upload-intents` | `CreateFileUploadIntentRequest { category, fileName, mimeType, sizeBytes, checksumSha256 }` | `FileUploadIntentResponse` | Idempotency-Key; private upload |
| POST | `/api/v1/files/{fileId}/upload-completions` | `{ checksumSha256 }` | `FileResponse` | Starts verification/scan; Idempotency-Key |
| GET | `/api/v1/files/{fileId}` | None | `FileResponse` | Metadata only; policy scoped |
| POST | `/api/v1/files/{fileId}/download-sessions` | `{ purpose }` | `FileDownloadSessionResponse { url, expiresAt }` | Audited; only available clean files |
| GET | `/api/v1/encounters/{encounterId}/clinical-documents` | `page,limit,type,reviewStatus,signatureStatus` | `ClinicalDocumentListResponse` | Related actor |
| POST | `/api/v1/encounters/{encounterId}/clinical-documents` | `CreateClinicalDocumentRequest { fileId, type, workflowTaskId?, clinicalOrderId?, patientVisible? }` | `ClinicalDocumentResponse` | Authorized uploader; Idempotency-Key |
| GET | `/api/v1/clinical-documents/{clinicalDocumentId}` | None | `ClinicalDocumentDetailResponse` | Audited if content metadata sensitive |
| POST | `/api/v1/clinical-documents/{clinicalDocumentId}/reviews` | `{ outcome, note?, version }` | `ClinicalDocumentResponse` | Doctor/reviewer |
| POST | `/api/v1/clinical-documents/{clinicalDocumentId}/incorrect-link-reports` | `{ reason, version }` | `ClinicalDocumentResponse` | Related staff; critical audit |

### Care plans, alerts and encounter creation requests

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/care-plans` | `page,limit,patientId,encounterId,status` | `CarePlanListResponse` | Patient self/assigned care team |
| POST | `/api/v1/patients/{patientId}/care-plans` | `{ encounterId, status? }` | `CarePlanDetailResponse` | Coordinator/system; Idempotency-Key |
| GET | `/api/v1/care-plans/{carePlanId}` | `include=activities,alerts` whitelist | `CarePlanDetailResponse` | Scoped |
| GET | `/api/v1/follow-up-activities` | `page,limit,carePlanId,patientId,status,type,priority,dueFrom,dueTo` | `FollowUpActivityListResponse` | Scoped |
| POST | `/api/v1/care-plans/{carePlanId}/follow-up-activities` | `CreateFollowUpActivityRequest` | `FollowUpActivityResponse` | Coordinator/system |
| POST | `/api/v1/follow-up-activities/{activityId}/confirmations` | `{ note?, version }` | `FollowUpActivityResponse` | Patient owner; Idempotency-Key |
| POST | `/api/v1/follow-up-activities/{activityId}/status-transitions` | `{ targetStatus, reason?, version }` | `FollowUpActivityResponse` | Assigned care staff/system |
| POST | `/api/v1/care-plans/{carePlanId}/automation-runs` | `{ dueAt? }` | `CareAutomationRunResponse` | Coordinator/admin/system; Idempotency-Key |
| GET | `/api/v1/clinical-alerts` | `page,limit,patientId,carePlanId,status,severity,from,to` | `ClinicalAlertListResponse` | Coordinator/doctor/admin |
| POST | `/api/v1/care-plans/{carePlanId}/clinical-alerts` | `CreateClinicalAlertRequest { trigger, note, encounterId? }` | `ClinicalAlertResponse` | Patient/coordinator/system; Idempotency-Key |
| GET | `/api/v1/clinical-alerts/{clinicalAlertId}` | None | `ClinicalAlertDetailResponse` | Scoped |
| POST | `/api/v1/clinical-alerts/{clinicalAlertId}/acknowledgements` | `{ note?, version }` | `ClinicalAlertResponse` | Coordinator/doctor/admin |
| POST | `/api/v1/clinical-alerts/{clinicalAlertId}/resolutions` | `{ resolutionNote, version }` | `ClinicalAlertResponse` | Doctor/admin/coordinator |
| GET | `/api/v1/encounter-creation-requests` | `page,limit,status,patientId,sourceAlertId,from,to` | `EncounterCreationRequestListResponse` | Doctor/admin/coordinator read |
| POST | `/api/v1/patients/{patientId}/encounter-creation-requests` | `{ sourceAlertId?, reason }` | `EncounterCreationRequestResponse` | Care flow; Idempotency-Key |
| POST | `/api/v1/encounter-creation-requests/{requestId}/decisions` | `{ decision, reason?, departmentId?, version }` | `EncounterCreationRequestDetailResponse` | Doctor/admin; `decision=approve|reject` |

### Notifications, audit, integrations, progress, reports and support

| Method | Exact path | Query / request DTO | Response DTO | Actor / notes |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | `cursor,limit,status,channel,read,from,to` | `NotificationListResponse` | Current user only |
| POST | `/api/v1/notifications/{notificationId}/read-receipts` | `{ readAt? }` | `NotificationResponse` | Current recipient |
| POST | `/api/v1/notification-read-batches` | `{ notificationIds? , allUnread? }` | `NotificationReadBatchResponse` | Current recipient |
| POST | `/api/v1/notifications/{notificationId}/retry-requests` | `{ reason? }` | `NotificationResponse` | Recipient/admin according to channel |
| GET | `/api/v1/audit-events` | `cursor,limit,actorId,action,entityType,entityId,patientId,encounterId,severity,result,from,to,sortOrder` | `AuditEventListResponse` | Medical/system admin; audited query |
| GET | `/api/v1/integration-connections` | `page,limit,status,search` | `IntegrationConnectionListResponse` | Medical/system admin |
| GET | `/api/v1/integration-connections/{connectionId}` | None | `IntegrationConnectionDetailResponse` | Admin |
| GET | `/api/v1/integration-messages` | `cursor,limit,connectionId,status,correlationId,from,to` | `IntegrationMessageListResponse` | Admin; safe metadata |
| POST | `/api/v1/integration-connections/{connectionId}/retry-runs` | `{ messageIds?, includeAllFailed?, reason }` | `IntegrationRetryRunResponse` | Admin; Idempotency-Key |
| POST | `/api/v1/integration-connections/{connectionId}/dead-letter-resets` | `{ messageIds?, reason }` | `IntegrationConnectionResponse` | System admin; Idempotency-Key |
| GET | `/api/v1/progress-assessments` | `page,limit,patientId,encounterId,from,to,sortOrder` | `ProgressAssessmentListResponse` | Patient self/care team |
| POST | `/api/v1/patients/{patientId}/progress-assessments` | `CreateProgressAssessmentRequest { capturedAt?, note?, fileIds }` | `ProgressAssessmentJobResponse` | Patient/care team; Idempotency-Key |
| GET | `/api/v1/progress-assessments/{progressAssessmentId}` | None | `ProgressAssessmentDetailResponse` | Scoped |
| GET | `/api/v1/patients/{patientId}/report-summaries` | `from,to,encounterId?` | `PatientReportSummaryResponse` | Patient/care team |
| POST | `/api/v1/patients/{patientId}/report-generation-jobs` | `{ type, from?, to?, encounterId?, locale? }` | `ReportGenerationJobResponse` | Idempotency-Key; async PDF |
| GET | `/api/v1/report-generation-jobs/{jobId}` | None | `ReportGenerationJobResponse` | Owner/related staff |
| POST | `/api/v1/report-generation-jobs/{jobId}/download-sessions` | `{}` | `FileDownloadSessionResponse` | Completed jobs only |
| POST | `/api/v1/support-tickets` | `CreateSupportTicketRequest { topic, subject?, message, attachmentFileIds? }` | `SupportTicketResponse` | Authenticated; Idempotency-Key |
| GET | `/api/v1/support-tickets` | `page,limit,status,topic,requesterId,from,to` | `SupportTicketListResponse` | Support/admin; patient forced to own tickets |
| GET | `/api/v1/support-tickets/{supportTicketId}` | None | `SupportTicketDetailResponse` | Requester/support/admin |
| GET | `/api/v1/health/live` | None | `HealthResponse` | Infrastructure/public; no dependency detail |
| GET | `/api/v1/health/ready` | None | `HealthResponse` | Infrastructure; safe dependency status |

Delete endpoints are deliberately absent for appointments, encounters, clinical decisions/results, records, prescriptions, care alerts, consent events and audit events. Only unused draft workflow steps/dependencies and revocable sessions use `DELETE`. Every other lifecycle change creates a named noun subresource so the action remains auditable and idempotent.

## 26. Detailed API Contracts

The TypeScript-style contracts below are normative JSON schemas. Backend DTO/OpenAPI names and fields must match them unless a reviewed contract change is recorded. `UUID` and `DateTime` are strings; `LocalDate` is `YYYY-MM-DD`. Properties marked `?` may be omitted. Nullable properties explicitly use `| null`; omission and `null` are not interchangeable.

### Common types and envelopes

```ts
type UUID = string;
type DateTime = string;   // RFC 3339 UTC, e.g. 2026-07-20T02:00:00Z
type LocalDate = string;  // YYYY-MM-DD
type SortOrder = 'asc' | 'desc';

interface OffsetPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CursorPageMeta {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

interface SuccessResponse<T, M = Record<string, never>> {
  data: T;
  meta: M;
  requestId: UUID;
}

interface FieldErrorDetail {
  field?: string;
  code: string;
  message?: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: FieldErrorDetail[];
    requestId: UUID;
  };
}

interface ReferenceResponse {
  id: UUID;
  code?: string;
  name: string;
}
```

HTTP rules: create returns `201`; async job creation returns `202`; reads/updates/commands return `200`; successful deletion/revocation with no representation returns `204`; validation `422`; unauthenticated `401`; forbidden `403`; hidden unauthorized resource may be `404`; state/unique/idempotency conflict `409`; stale `version`/`If-Match` `412`; rate limit `429`.

### Identity, patient and preference DTOs

```ts
interface CreateSessionRequest {
  email: string;
  password: string;
  rememberMe: boolean;
  mfaCode?: string;
}

interface SessionResponse {
  accessToken?: string;      // omitted when access-token cookie/BFF mode is selected
  accessTokenExpiresAt: DateTime;
  user: CurrentUserResponse;
}

interface CurrentUserResponse {
  id: UUID;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;  // short-lived or transformed URL
  status: 'invited' | 'active' | 'locked' | 'disabled';
  activeOrganizationId: UUID;
  memberships: UserMembershipResponse[];
  version: number;
}

interface UserMembershipResponse {
  organizationId: UUID;
  clinicLocationId: UUID | null;
  departmentId: UUID | null;
  role: UserRole;
}

type UserRole =
  | 'super_administrator' | 'patient' | 'doctor' | 'nurse' | 'receptionist'
  | 'lab_technician' | 'imaging_technician' | 'pharmacist' | 'care_coordinator'
  | 'customer_care_employee' | 'medical_administrator' | 'system_administrator'
  | 'clinical_process_designer';

interface PatientResponse {
  id: UUID;
  code: string;
  userId: UUID | null;
  organizationId: UUID;
  name: string;
  dob: LocalDate;
  gender: 'male' | 'female' | 'other' | 'unknown';
  phone: string;
  email: string | null;
  address: string | null;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  primaryDoctor: ReferenceResponse | null;
  version: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface PatientDetailResponse extends PatientResponse {
  activeAppointmentCount: number;
  activeEncounterId: UUID | null;
  activeCarePlanId: UUID | null;
  consentSummary: Array<{ type: string; granted: boolean; policyVersion: string }>;
}

interface UpdatePatientRequest {
  name?: string;
  dob?: LocalDate;
  gender?: PatientResponse['gender'];
  phone?: string;
  email?: string | null;
  address?: string | null;
  bloodType?: PatientResponse['bloodType'];
  primaryDoctorId?: UUID | null;
  version: number;
}

interface ConsentResponse {
  id: UUID;
  patientId: UUID;
  type: string;
  policyVersion: string;
  granted: boolean;
  grantedAt: DateTime | null;
  withdrawnAt: DateTime | null;
  version: number;
}

interface UpsertUserPreferenceRequest {
  locale: 'vi-VN' | 'en-US';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  theme: 'light' | 'dark' | 'system';
  notificationChannels: { inApp: boolean; email: boolean; sms: boolean; push: boolean };
  deviceSettings: { biometricLogin: boolean; mobileNotifications: boolean };
  version: number;
}
```

### Doctor, schedule, appointment, token and queue DTOs

```ts
interface DoctorResponse {
  id: UUID;
  userId: UUID;
  code: string;
  name: string;
  specialty: string;
  department: ReferenceResponse | null;
  clinicLocations: ReferenceResponse[];
  online: boolean;
  rating: number | null;
  reviewCount: number;
}

interface AvailabilitySlotResponse {
  id: UUID;                 // opaque server-issued slot identifier
  doctorId: UUID;
  clinicLocationId: UUID;
  serviceCode: string;
  mode: 'video' | 'in_person';
  startsAt: DateTime;
  endsAt: DateTime;
  availableCapacity: number;
  timezone: string;
}

interface CreateDoctorScheduleRequest {
  doctorId: UUID;
  clinicLocationId: UUID;
  serviceCode: string;
  timezone: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  localStartTime: string;   // HH:mm
  localEndTime: string;     // HH:mm
  slotDurationMinutes: number;
  capacity: number;
  effectiveFrom: LocalDate;
  effectiveTo?: LocalDate | null;
}

type AppointmentStatus = 'upcoming' | 'confirmed' | 'checked_in' | 'done' | 'cancelled' | 'missed';

interface CreateAppointmentRequest {
  slotId: UUID;
  patientId: UUID;
  mode: 'video' | 'in_person';
  reason?: string;
  contactPhone?: string;
}

interface AppointmentResponse {
  id: UUID;
  code: string;
  patientId: UUID;
  doctor: ReferenceResponse;
  clinicLocation: ReferenceResponse;
  department: ReferenceResponse | null;
  encounterId: UUID | null;
  startsAt: DateTime;
  endsAt: DateTime;
  timezone: string;
  mode: 'video' | 'in_person';
  status: AppointmentStatus;
  reason: string | null;
  consultationType: string | null;
  version: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface AppointmentDetailResponse extends AppointmentResponse {
  patient: { id: UUID; code: string; name: string; phone?: string };
  checkInToken: CheckInTokenResponse | null;
  queueTicket: QueueTicketResponse | null;
  preparationInstructions: string[];
  allowedActions: Array<'cancel' | 'reschedule' | 'issue_check_in_token' | 'revoke_check_in_token' | 'view_consultation'>;
}

interface CheckInTokenResponse {
  id: UUID;
  appointmentId: UUID;
  clinicLocationId: UUID;
  version: number;
  validFrom: DateTime;
  expiresAt: DateTime;
  status: 'active' | 'used' | 'expired' | 'revoked' | 'replaced';
  usedAt: DateTime | null;
}

interface CheckInTokenDisplayResponse extends CheckInTokenResponse {
  token: string;            // only this authorized response exposes the raw token
  qrPayload: string;
}

interface CreateCheckInRequest {
  token: string;
  clinicLocationId: UUID;
  deviceId: UUID;
  patientCode?: string;
}

type QueueTicketStatus = 'waiting' | 'called' | 'acknowledged' | 'in_service' | 'skipped' | 'completed' | 'routed';

interface QueueTicketResponse {
  id: UUID;
  code: string;
  appointmentId: UUID;
  patientId: UUID;
  encounterId: UUID;
  clinicLocationId: UUID;
  department: ReferenceResponse;
  serviceStation: ReferenceResponse | null;
  room: string | null;
  waitingArea: string;
  priority: 'normal' | 'priority' | 'urgent';
  status: QueueTicketStatus;
  issuedAt: DateTime;
  calledAt: DateTime | null;
  acknowledgedAt: DateTime | null;
  serviceStartedAt: DateTime | null;
  completedAt: DateTime | null;
  nextStation: ReferenceResponse | null;
  peopleAhead: number;              // derived
  estimatedWaitMinutes: number;     // derived
  preparationInstructions: string[];
  version: number;
}

interface CheckInResponse {
  ticket: QueueTicketResponse;
  repeated: boolean;
}
```

### Encounter, intake, AI and clinical decision DTOs

```ts
type EncounterStatus =
  | 'registered' | 'intake_in_progress' | 'intake_complete' | 'ai_assessed' | 'routed'
  | 'checked_in' | 'under_doctor_review' | 'awaiting_results' | 'diagnosed'
  | 'plan_approved' | 'workflow_active' | 'in_progress' | 'results_complete'
  | 'final_review' | 'discharge_ready' | 'record_signed' | 'closed'
  | 'post_visit_monitoring' | 'escalated' | 'follow_up_linked';

interface EncounterResponse {
  id: UUID;
  code: string;
  patientId: UUID;
  appointmentId: UUID | null;
  parentEncounterId: UUID | null;
  type: 'standard' | 'emergency' | 'follow_up' | 'remote';
  origin: 'appointment' | 'walk_in' | 'follow_up_request';
  status: EncounterStatus;
  department: ReferenceResponse;
  room: string | null;
  currentDoctor: ReferenceResponse | null;
  workflowInstanceId: UUID | null;
  medicalRecordId: UUID | null;
  blockingCondition: string | null;
  version: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface EncounterDetailResponse extends EncounterResponse {
  patient: { id: UUID; code: string; name: string };
  queueSummary: QueueTicketResponse | null;
  latestAiAssessment: AiAssessmentResponse | null;
  latestDiagnosis: DiagnosisResponse | null;
  clinicalPlan: ClinicalPlanResponse | null;
  orderSummary: { total: number; pending: number; abnormal: number };
  workflowSummary: { id: UUID; code: string; status: string; progressPercent: number } | null;
  recordSummary: { id: UUID; status: string; signedAt: DateTime | null } | null;
  allowedActions: string[];
}

interface CreateSymptomIntakeRequest {
  chiefComplaint: string;
  severity: 1 | 2 | 3 | 4 | 5;
  durationDays: number;
  symptoms: Array<'itching' | 'pain' | 'pus' | 'fever' | 'rapid_spreading' | 'bleeding' | 'scaling'>;
  history: string[];
  currentMedication: string[];
  fileIds: UUID[];
}

interface SymptomIntakeResponse extends CreateSymptomIntakeRequest {
  id: UUID;
  encounterId: UUID;
  intakeVersion: number;
  submittedBy: UUID;
  submittedAt: DateTime;
}

interface AiCandidateResponse {
  rank: number;
  code: string;
  name: string;
  confidenceBand: 'low' | 'moderate' | 'high';
  confidenceScore: number;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  rationale: string;
}

interface AiAssessmentResponse {
  id: UUID;
  encounterId: UUID;
  symptomIntakeId: UUID;
  status: 'queued' | 'processing' | 'completed' | 'insufficient_data' | 'failed';
  candidates: AiCandidateResponse[];
  redFlag: { triggered: boolean; urgency: 'routine' | 'urgent' | 'emergency'; reasons: string[] };
  suggestedSpecialty: string | null;
  suggestedNextActions: string[];
  modelVersion: string;
  inputSnapshotId: string;
  missingDataHints: string[];
  supersededByAssessmentId: UUID | null;
  generatedAt: DateTime | null;
}

interface AiAssessmentJobResponse {
  jobId: UUID;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assessment: AiAssessmentResponse | null;
  statusUrl: string;
}

interface CreateDoctorReviewRequest {
  action: 'accepted' | 'partial' | 'rejected';
  acceptedConditionCode?: string;
  rationale?: string;
}

interface DoctorReviewResponse {
  id: UUID;
  encounterId: UUID;
  aiAssessmentId: UUID;
  doctor: ReferenceResponse;
  action: 'accepted' | 'partial' | 'rejected';
  acceptedConditionCode: string | null;
  rationale: string | null;
  reviewedAt: DateTime;
}

interface CreateDiagnosisRequest {
  status: 'provisional' | 'differential' | 'confirmed';
  conditionName: string;
  conditionCode?: string;
  aiAssessmentId?: UUID;
  isAdditionalToAi: boolean;
  rationale?: string;
}

interface DiagnosisResponse {
  id: UUID;
  encounterId: UUID;
  doctor: ReferenceResponse;
  status: 'provisional' | 'differential' | 'confirmed' | 'revised' | 'signed';
  conditionName: string;
  conditionCode: string | null;
  aiAssessmentId: UUID | null;
  isAdditionalToAi: boolean;
  rationale: string | null;
  revisionOfDiagnosisId: UUID | null;
  recordedAt: DateTime;
  version: number;
}

interface ClinicalPlanResponse {
  id: UUID;
  encounterId: UUID;
  doctor: ReferenceResponse;
  diagnosisId: UUID;
  summary: string;
  approvedAt: DateTime;
  version: number;
}
```

### Clinical order and result DTOs

```ts
interface CreateClinicalOrderRequest {
  type: 'laboratory' | 'imaging' | 'consultation';
  justification: string;
  assignedRole: 'lab_technician' | 'imaging_technician' | 'doctor';
  assigneeId?: UUID;
}

interface ClinicalOrderResponse {
  id: UUID;
  code: string;
  encounterId: UUID;
  type: 'laboratory' | 'imaging' | 'consultation';
  orderedBy: ReferenceResponse;
  justification: string;
  status: 'requested' | 'in_progress' | 'invalid_sample' | 'result_ready' | 'completed' | 'cancelled';
  assignedRole: UserRole;
  assignee: ReferenceResponse | null;
  latestResultId: UUID | null;
  version: number;
  createdAt: DateTime;
}

interface CreateClinicalResultRequest {
  summary: string;
  abnormal: boolean;
  fileIds?: UUID[];
  version: number;  // clinical order version
}

interface ClinicalResultResponse {
  id: UUID;
  clinicalOrderId: UUID;
  resultVersion: number;
  summary: string;
  abnormal: boolean;
  fileIds: UUID[];
  recordedBy: ReferenceResponse;
  recordedAt: DateTime;
  revisesResultId: UUID | null;
}
```

### Workflow DTOs

```ts
interface CreateWorkflowTemplateRequest {
  name: string;
  specialty: string;
  description: string;
}

interface CreateWorkflowStepRequest {
  code: string;
  name: string;
  description: string;
  icon?: 'robot' | 'doctor' | 'nurse' | 'reception' | 'laboratory' | 'imaging' | 'pharmacy' | 'cashier' | 'procedure' | 'discharge' | 'patient' | 'decision' | 'waiting' | 'system' | 'customer_care' | 'manager' | 'task';
  executorType: string;
  taskType: string;
  responsibleRole: UserRole;
  departmentId: UUID;
  skill?: string;
  location?: string;
  mandatory: boolean;
  conditionalRule?: string;
  estimatedDurationMinutes: number;
  maxWaitingMinutes: number;
  skipPermissions: UserRole[];
  reworkRule?: string;
  escalationRule?: string;
  notificationRule?: string;
  requiredOutput?: string;
  version: number; // template-version optimistic version
}

interface WorkflowStepResponse extends Omit<CreateWorkflowStepRequest, 'version'> {
  workflowTemplateVersionId: UUID;
  prerequisiteStepCodes: string[];
}

interface WorkflowTemplateResponse {
  id: UUID;
  code: string;
  name: string;
  specialty: string;
  description: string;
  createdBy: ReferenceResponse;
  latestPublishedVersionId: UUID | null;
  version: number;
}

interface WorkflowTemplateVersionResponse {
  id: UUID;
  workflowTemplateId: UUID;
  versionNumber: number;
  status: 'draft' | 'in_review' | 'published' | 'deprecated' | 'archived';
  steps: WorkflowStepResponse[];
  dependencies: Array<{ sourceStepCode: string; targetStepCode: string }>;
  nodePositions: Record<string, { x: number; y: number }>;
  optimisticVersion: number;
  createdAt: DateTime;
  publishedAt: DateTime | null;
}

interface WorkflowInstanceResponse {
  id: UUID;
  code: string;
  patientId: UUID;
  encounterId: UUID;
  workflowTemplateId: UUID;
  workflowTemplateVersionId: UUID;
  status: 'created' | 'active' | 'suspended' | 'completed' | 'cancelled';
  activatedBy: ReferenceResponse;
  activatedAt: DateTime;
  completedAt: DateTime | null;
  suspendedReason: string | null;
  progressPercent: number;
  version: number;
}

interface WorkflowTaskResponse {
  id: UUID;
  workflowInstanceId: UUID;
  encounterId: UUID;
  stepCode: string;
  name: string;
  responsibleRole: UserRole;
  department: ReferenceResponse;
  status: 'pending' | 'blocked' | 'ready' | 'assigned' | 'accepted' | 'in_progress'
    | 'waiting_for_patient' | 'waiting_for_result' | 'waiting_for_approval' | 'completed'
    | 'failed' | 'rejected' | 'redo_required' | 'skipped' | 'cancelled' | 'expired' | 'escalated';
  assignee: ReferenceResponse | null;
  dependsOnStepCodes: string[];
  slaMinutes: number;
  priority: 'low' | 'medium' | 'high';
  urgency: 'routine' | 'urgent' | 'emergency';
  clinicalWarning: string | null;
  patientArrivalStatus: 'not_arrived' | 'arrived' | 'in_room' | null;
  reworkCount: number;
  createdAt: DateTime;
  startedAt: DateTime | null;
  completedAt: DateTime | null;
  version: number;
}
```

### Medical record, prescription and file DTOs

```ts
interface DischargeRequest {
  instructions: string[];
  followUpNeeded: boolean;
}

interface FollowUpRequest {
  description: string;
  dueInDays: number;
}

interface UpdateMedicalRecordRequest {
  diagnosisId?: UUID;
  discharge?: DischargeRequest;
  followUp?: FollowUpRequest;
  version: number;
}

interface MedicalRecordResponse {
  id: UUID;
  encounterId: UUID;
  status: 'draft' | 'in_review' | 'awaiting_completion' | 'awaiting_signature' | 'signed' | 'addendum_required' | 'amended' | 'reopened';
  diagnosisId: UUID | null;
  prescriptionId: UUID | null;
  clinicalDocumentIds: UUID[];
  discharge: DischargeRequest | null;
  followUp: FollowUpRequest | null;
  signedBy: ReferenceResponse | null;
  signedAt: DateTime | null;
  snapshotHash: string | null;
  reopenedReason: string | null;
  version: number;
}

interface MedicationItemRequest {
  name: string;
  dose: string;
  route?: 'oral' | 'topical' | 'injection' | 'other';
  frequency?: string;
  durationDays: number;
  instructions?: string;
}

interface CreatePrescriptionRequest {
  medications: MedicationItemRequest[];
  note?: string;
}

interface PrescriptionResponse {
  id: UUID;
  code: string;
  encounterId: UUID;
  patientId: UUID;
  doctor: ReferenceResponse;
  status: 'active' | 'completed' | 'discontinued';
  medications: Array<MedicationItemRequest & { id: UUID }>;
  note: string | null;
  issuedAt: DateTime;
  version: number;
}

interface CreateFileUploadIntentRequest {
  category: 'avatar' | 'symptom_image' | 'progress_photo' | 'clinical_document' | 'clinical_result' | 'generated_report';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
}

interface FileUploadIntentResponse {
  fileId: UUID;
  uploadUrl: string;
  uploadMethod: 'PUT';
  requiredHeaders: Record<string, string>;
  expiresAt: DateTime;
}

interface FileResponse {
  id: UUID;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  status: 'pending' | 'uploaded' | 'scanning' | 'available' | 'quarantined' | 'failed' | 'deleted';
  malwareScanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  createdAt: DateTime;
}

interface CreateClinicalDocumentRequest {
  fileId: UUID;
  type: string;
  workflowTaskId?: UUID;
  clinicalOrderId?: UUID;
  patientVisible?: boolean;
}

interface ClinicalDocumentResponse {
  id: UUID;
  encounterId: UUID;
  file: FileResponse;
  type: string;
  workflowTaskId: UUID | null;
  clinicalOrderId: UUID | null;
  documentVersion: number;
  reviewStatus: 'pending' | 'reviewed';
  signatureStatus: 'unsigned' | 'signed';
  patientVisible: boolean;
  incorrectLinkFlag: boolean;
  uploadedBy: ReferenceResponse;
  uploadedAt: DateTime;
  version: number;
}
```

### Care, notification, progress, report and support DTOs

```ts
interface CarePlanResponse {
  id: UUID;
  patientId: UUID;
  encounterId: UUID;
  status: 'not_started' | 'active' | 'completed' | 'suspended';
  createdAt: DateTime;
  version: number;
}

interface CreateFollowUpActivityRequest {
  type: string;
  title: string;
  description: string;
  dueAt: DateTime;
  priority: 'low' | 'medium' | 'high';
  automationMode?: 'automatic' | 'patient_action' | 'human_review';
  automationAction?: string;
}

interface FollowUpActivityResponse extends CreateFollowUpActivityRequest {
  id: UUID;
  carePlanId: UUID;
  status: 'scheduled' | 'due' | 'completed' | 'escalated' | 'cancelled';
  lastAutomatedAt: DateTime | null;
  automationRunCount: number;
  version: number;
}

interface CreateClinicalAlertRequest {
  trigger: 'no_response' | 'worsening_symptoms' | 'medication_reaction' | 'missed_appointment' | 'low_adherence' | 'patient_request' | 'critical_questionnaire';
  note: string;
  encounterId?: UUID;
}

interface ClinicalAlertResponse {
  id: UUID;
  carePlanId: UUID;
  patientId: UUID;
  encounterId: UUID | null;
  trigger: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  responsibleActor: string;
  responseDeadlineAt: DateTime;
  requiresLinkedEncounter: boolean;
  status: 'open' | 'acknowledged' | 'encounter_requested' | 'resolved';
  note: string;
  detectedAt: DateTime;
  closedBy: ReferenceResponse | null;
  closedAt: DateTime | null;
  version: number;
}

interface NotificationResponse {
  id: UUID;
  event: string;
  channel: 'in_app' | 'sms' | 'email' | 'push';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'retrying';
  message: string;
  relatedPatientId: UUID | null;
  relatedEncounterId: UUID | null;
  relatedWorkflowTaskId: UUID | null;
  createdAt: DateTime;
  deliveredAt: DateTime | null;
  readAt: DateTime | null;
  retryCount: number;
}

interface CreateProgressAssessmentRequest {
  capturedAt?: DateTime;
  note?: string;
  fileIds: UUID[];
}

interface ProgressAssessmentResponse {
  id: UUID;
  patientId: UUID;
  encounterId: UUID | null;
  capturedAt: DateTime;
  note: string | null;
  fileIds: UUID[];
  scores: { overall: number; inflammation: number; pigment: number; moisture: number } | null;
  modelVersion: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: DateTime;
}

interface CreateSupportTicketRequest {
  topic: 'technical' | 'treatment' | 'billing' | 'other';
  subject?: string;
  message: string;
  attachmentFileIds?: UUID[];
}

interface SupportTicketResponse {
  id: UUID;
  code: string;
  requesterId: UUID;
  topic: CreateSupportTicketRequest['topic'];
  subject: string | null;
  message: string;
  attachmentFileIds: UUID[];
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Reference, administration, audit and asynchronous job DTOs

```ts
interface UserResponse {
  id: UUID;
  name: string;
  email: string;
  phone: string | null;
  status: 'invited' | 'active' | 'locked' | 'disabled';
  memberships: UserMembershipResponse[];
  version: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface UserPreferenceResponse extends UpsertUserPreferenceRequest {
  userId: UUID;
  updatedAt: DateTime;
}

interface OrganizationResponse {
  id: UUID;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  version: number;
}

interface ClinicLocationResponse {
  id: UUID;
  organizationId: UUID;
  code: string;
  name: string;
  timezone: string;
  address: string | null;
  status: 'active' | 'inactive';
}

interface DepartmentResponse {
  id: UUID;
  clinicLocationId: UUID;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

interface QueueStationResponse {
  id: UUID;
  clinicLocationId: UUID;
  departmentId: UUID;
  code: string;
  name: string;
  room: string | null;
  status: 'active' | 'inactive';
}

interface DoctorScheduleResponse extends CreateDoctorScheduleRequest {
  id: UUID;
  version: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface ScheduleExceptionResponse {
  id: UUID;
  doctorScheduleId: UUID;
  startsAt: DateTime;
  endsAt: DateTime;
  type: 'leave' | 'closure' | 'override';
  reason: string | null;
  version: number;
}

interface EncounterEventResponse {
  id: UUID;
  encounterId: UUID;
  sequence: number;
  eventType: string;
  label: string;
  kind: 'info' | 'warning' | 'success' | 'danger';
  actor: ReferenceResponse | null;
  at: DateTime;
}

interface EncounterCreationRequestResponse {
  id: UUID;
  patientId: UUID;
  sourceAlertId: UUID | null;
  requestedByRole: UserRole;
  reason: string;
  status: 'requested' | 'rejected' | 'encounter_created';
  requestedAt: DateTime;
  decidedBy: ReferenceResponse | null;
  decidedAt: DateTime | null;
  createdEncounterId: UUID | null;
  version: number;
}

interface MedicalRecordAddendumResponse {
  id: UUID;
  medicalRecordId: UUID;
  text: string;
  addedBy: ReferenceResponse;
  addedAt: DateTime;
}

interface FileDownloadSessionResponse {
  url: string;
  expiresAt: DateTime;
  fileId: UUID;
}

interface CareAutomationRunResponse {
  id: UUID;
  carePlanId: UUID;
  status: 'queued' | 'running' | 'completed' | 'failed';
  processedCount: number;
  notificationCount: number;
  createdAt: DateTime;
  completedAt: DateTime | null;
}

interface NotificationReadBatchResponse {
  updatedCount: number;
  readAt: DateTime;
}

interface AuditEventResponse {
  id: UUID;
  at: DateTime;
  actor: { id: UUID | null; name: string; role: UserRole | 'system' };
  action: string;
  entityType: string;
  entityId: UUID | string;
  patientId: UUID | null;
  encounterId: UUID | null;
  organizationId: UUID;
  clinicLocationId: UUID | null;
  result: 'success' | 'denied' | 'failure';
  reason: string | null;
  changedFields: string[];
  requestId: UUID;
  severity: 'info' | 'warning' | 'critical';
}

interface IntegrationConnectionResponse {
  id: UUID;
  code: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccessAt: DateTime | null;
  lastFailureAt: DateTime | null;
  pendingMessageCount: number;
  retryCount: number;
  deadLetterCount: number;
  version: number;
}

interface IntegrationMessageResponse {
  id: UUID;
  connectionId: UUID;
  correlationId: string;
  idempotencyKey: string;
  status: 'pending' | 'delivered' | 'failed' | 'duplicate_rejected';
  createdAt: DateTime;
  deliveredAt: DateTime | null;
}

interface IntegrationRetryRunResponse {
  id: UUID;
  connectionId: UUID;
  status: 'queued' | 'running' | 'completed' | 'failed';
  requestedMessageCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: DateTime;
  completedAt: DateTime | null;
}

interface WorkflowValidationResponse {
  valid: boolean;
  errors: Array<{ code: string; stepCode?: string; message: string }>;
  warnings: Array<{ code: string; stepCode?: string; message: string }>;
}

interface ProgressAssessmentJobResponse {
  jobId: UUID;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assessment: ProgressAssessmentResponse | null;
  statusUrl: string;
}

interface PatientReportSummaryResponse {
  patientId: UUID;
  from: DateTime;
  to: DateTime;
  appointmentSummary: { total: number; attended: number; missed: number; upcoming: number };
  medicationAdherencePercent: number | null;
  latestProgressScores: ProgressAssessmentResponse['scores'];
  progressSeries: Array<{ capturedAt: DateTime; scores: NonNullable<ProgressAssessmentResponse['scores']> }>;
  treatmentHistory: Array<{ encounterId: UUID; date: DateTime; diagnosis: string | null; doctor: ReferenceResponse | null }>;
}

interface ReportGenerationJobResponse {
  id: UUID;
  patientId: UUID;
  type: 'summary' | 'treatment' | 'medication' | 'ai_progress';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  fileId: UUID | null;
  failureCode: string | null;
  createdAt: DateTime;
  completedAt: DateTime | null;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'unavailable';
  timestamp: DateTime;
  version: string;
}
```

### Required list aliases

For every resource `X`, `XListResponse` means `SuccessResponse<XResponse[], OffsetPageMeta | CursorPageMeta>` using the pagination mode declared in section 25. `XDetailResponse` extends the base `XResponse` only with the named nested fields documented above. Backend must not return Prisma models or unrestricted `include` graphs.

### Book appointment

```json
POST /api/v1/appointments
Idempotency-Key: 4e3f...
{"slotId":"uuid","patientId":"uuid","mode":"in_person","reason":"Mụn viêm lan rộng"}
```

```json
{"data":{"id":"uuid","code":"APT-2042","status":"upcoming","startsAt":"2026-07-20T02:00:00Z","endsAt":"2026-07-20T02:30:00Z","clinic":{"id":"uuid","name":"DermaHealth TP.HCM"},"doctor":{"id":"uuid","name":"Bs. Nguyễn Thị An"},"checkInToken":{"token":"returned-once","validFrom":"...","expiresAt":"..."}},"meta":{},"requestId":"uuid"}
```

In one serializable/retry-safe transaction: validate actor/patient/slot/mode, insert appointment and planned encounter, insert hashed token, audit and outbox. Conflict: `409 APPOINTMENT_SLOT_UNAVAILABLE`; duplicate key with same fingerprint replays response; different body returns `409 IDEMPOTENCY_KEY_REUSED`.

### Redeem check-in

```json
POST /api/v1/check-ins
{"token":"opaque-secret","clinicLocationId":"uuid","deviceId":"uuid"}
```

Returns ticket and `repeated`. Lock token and appointment; validate HMAC hash, active status, time window, location/device, appointment status and optional authenticated patient. A repeated redemption returns the existing nonterminal ticket. All validation failures return a generic `CHECK_IN_TOKEN_INVALID` while audit stores the internal reason.

### Submit intake and assessment

```json
{"chiefComplaint":"Mụn viêm lan rộng","severity":3,"durationDays":10,"symptoms":["pus","pain"],"history":["Mụn tái phát"],"currentMedication":[],"fileIds":["uuid"]}
```

Validate encounter relation/open state, severity 1–5, duration 0–36500, list limits, clean file availability. Store intake snapshot, enqueue/run assessment, return `202` if asynchronous. Red flags create urgent alert/outbox; response must label AI output preliminary and expose model version. AI failure must not block doctor review.

### Sign record

```json
POST /api/v1/medical-records/{medicalRecordId}/signatures
Idempotency-Key: ...
{"version":7,"attestation":true}
```

Lock record/encounter. Require assigned doctor, confirmed/revised diagnosis and configured required elements, no quarantined/pending mandatory documents, matching version. Canonicalize snapshot, hash, insert signature, set record signed and encounter `record_signed`, audit/outbox atomically. Errors: `RECORD_INCOMPLETE`, `RECORD_ALREADY_SIGNED`, `OPTIMISTIC_LOCK_FAILED`.

### Workflow task command

```json
POST /api/v1/workflow-tasks/{workflowTaskId}/completions
Idempotency-Key: ...
{"version":3,"output":{"clinicalDocumentId":"uuid"}}
```

Require instance active, actor role/assignee, current transition, dependencies and required output. Update task, unlock dependents, possibly complete instance, audit/outbox in one transaction.

## 27. Error Code Catalog

| Group | Stable codes |
|---|---|
| Common | `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `OPTIMISTIC_LOCK_FAILED`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `RATE_LIMITED` |
| Auth | `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_EMAIL_UNVERIFIED`, `AUTH_MFA_REQUIRED`, `AUTH_SESSION_EXPIRED`, `AUTH_REFRESH_REUSED`, `AUTH_FORBIDDEN` |
| Patient/authorization | `PATIENT_SCOPE_DENIED`, `CLINIC_SCOPE_DENIED`, `RELATIONSHIP_REQUIRED`, `BREAK_GLASS_REASON_REQUIRED` |
| Appointment | `APPOINTMENT_SLOT_UNAVAILABLE`, `APPOINTMENT_INVALID_TRANSITION`, `APPOINTMENT_CANCELLATION_WINDOW`, `APPOINTMENT_ALREADY_CHECKED_IN` |
| Check-in/queue | `CHECK_IN_TOKEN_INVALID`, `CHECK_IN_WINDOW_CLOSED`, `CHECK_IN_WRONG_LOCATION`, `QUEUE_INVALID_TRANSITION`, `QUEUE_EMPTY` |
| Encounter/AI | `ENCOUNTER_INVALID_TRANSITION`, `ENCOUNTER_BLOCKED`, `INTAKE_INVALID`, `AI_INSUFFICIENT_DATA`, `AI_ASSESSMENT_FAILED` |
| Clinical | `DIAGNOSIS_NOT_CONFIRMED`, `ORDER_INVALID_TRANSITION`, `RESULT_LATE`, `CLINICAL_ACTOR_NOT_ASSIGNED` |
| Workflow | `WORKFLOW_DRAFT_REQUIRED`, `WORKFLOW_GRAPH_CYCLE`, `WORKFLOW_VERSION_IMMUTABLE`, `WORKFLOW_ACTIVATION_BLOCKED`, `TASK_INVALID_TRANSITION`, `TASK_DEPENDENCIES_UNMET`, `TASK_REQUIRED_OUTPUT_MISSING` |
| EMR/file | `RECORD_IMMUTABLE`, `RECORD_INCOMPLETE`, `RECORD_ALREADY_SIGNED`, `ADDENDUM_NOT_ALLOWED`, `FILE_TYPE_UNSUPPORTED`, `FILE_TOO_LARGE`, `FILE_NOT_SCANNED`, `FILE_ACCESS_DENIED` |
| CRM/notification/integration | `CARE_ACTIVITY_INVALID_TRANSITION`, `ALERT_ALREADY_RESOLVED`, `ENCOUNTER_REQUEST_ALREADY_DECIDED`, `NOTIFICATION_RETRY_NOT_ALLOWED`, `INTEGRATION_OPERATION_CONFLICT` |

## 28. Authentication Design

Web: short-lived access token (10 minutes) in memory and rotated refresh token (30 days remembered, 24 hours otherwise) in `HttpOnly; Secure; SameSite=Lax` cookie scoped to `/api/v1/auth`. Prefer a BFF-style cookie session if frontend/backend share site; if access token cookie is used, apply CSRF double-submit/origin validation to unsafe methods. Never store tokens or role authority in localStorage. Refresh records store only Argon2/SHA-256 token hashes, family, user/device, IP/user-agent summary, expiry/revocation. Rotation detects reuse and revokes the family.

Login uses generic error, Argon2id password hash, per-IP and per-account throttling, progressive delay, security audit. Minimum 12 characters for staff-created passwords; block known compromised passwords. Password reset tokens are random, single-use, hashed, 30-minute expiry. Email verification is required before patient activation unless staff-provisioned. Staff accounts are invitation-only. MFA (TOTP/WebAuthn) is required for administrator/super-administrator and PROPOSED required for doctors. Logout revokes current refresh session; “logout all” revokes all.

Kiosk/display devices use separate scoped device credentials, never user sessions. Mobile bearer storage is UNKNOWN; if introduced, use OS secure storage and the same rotation model.

## 29. Authorization Policies

| Policy | Decision inputs | Audit/failure |
|---|---|---|
| `CanViewPatient` | self OR active care-team/appointment/encounter + same org; admin override | health read audit; `PATIENT_SCOPE_DENIED` |
| `CanManageAppointment` | patient self or clinic receptionist; practitioner view assigned | cancellation/override audit |
| `CanViewEncounter` | self or assigned task/order/doctor/care-team; same org | every clinical read audit |
| `CanWriteClinicalEncounter` | doctor membership + assignment/coverage + valid state | clinical mutation audit |
| `CanRecordClinicalResult` | order assigned role/user + clinic + order state | result audit |
| `CanDesignWorkflow` | designer/admin membership; only medical admin publish | version actions audit |
| `CanExecuteTask` | active instance, responsible role, assignee rules, org/department | status audit |
| `CanSignClinicalRecord` | doctor + encounter relation + completeness + attestation | signature audit |
| `CanAccessMedicalAttachment` | underlying resource policy + visibility + scan available | download audit |
| `CanManageCarePlan` | self for patient actions; assigned coordinator; doctor for clinical decisions | alert/request audit |
| `CanOperateIntegration` | medical/system admin; connection org | command audit |
| `CanBreakGlass` | authenticated eligible staff, reason, emergency scope/time limit; notify compliance | critical audit; no unconditional super-admin PHI |

Field serializers enforce restrictions: reception sees contact/appointment/check-in, technicians see identifiers necessary for the order, customer care sees follow-up administrative data, patients see released clinical content, system admins see system metadata without clinical body.

## 30. Validation Matrix

| Resource/field/action | Rule/layer | Error | Evidence/class |
|---|---|---|---|
| email/phone | normalized email; E.164 phone; syntax DTO + unique DB | `VALIDATION_FAILED` | profile/login; PROPOSED normalization |
| DOB/gender/blood type | valid past date; controlled nullable codes | validation/check | Patient; CONFIRMED fields |
| IDs | UUID syntax then scoped lookup | not found/scope denied | all entities |
| appointment slot | future, server-issued, practitioner/clinic/service match, no overlap | slot unavailable | Appointments; CONFIRMED/PROPOSED |
| booking reason | optional 1–1000 chars, no HTML | validation | booking local state; INFERRED persist |
| check-in | hash/status/window/location/device/appointment/patient | token invalid | check-in service |
| intake | complaint 1–2000; severity 1–5; duration 0–36500; symptom enum unique; list limits | `INTAKE_INVALID` | AI service |
| diagnosis/review | doctor/encounter relation; rationale required for partial/reject/revise; valid AI candidate code | clinical errors | doctor service |
| order/result | doctor creates; role matches type; justification required; result summary required; valid state | order errors | order service |
| workflow version | unique step codes; durations nonnegative; all dependencies exist; DAG; >=1 step on publish; mandatory output/rules validated | graph errors | workflow service |
| task command | allowed state, dependencies, active instance, role/assignee, skip permission, required output | task errors | workflow service |
| record sign | confirmed/revised diagnosis, mandatory fields, optimistic version, doctor relation | record incomplete | record service |
| addendum/reopen | nonblank reason/text max 10k; correct role/status; preserve history | record errors | record service |
| medication | 1–200 name/dose, duration 1–3650, route enum when decided; at least one item | validation | prescription types/mocks |
| file | category MIME whitelist, declared/actual size, magic bytes, checksum, scan | file codes | upload UI; PROPOSED |
| pagination/search/sort | limit 1–100; cursor signed; search <=100; sort whitelist | validation | list UIs; PROPOSED |
| all writes | actor from session; DTO whitelist; no mass assignment of status/role/audit IDs | auth/validation | security requirement |

## 31. Transactions and Concurrency

| Use case | Boundary/locks | Rollback/retry/outbox |
|---|---|---|
| book/reschedule | slot/range conflict check + appointment/encounter/token/audit/outbox; exclusion constraint | retry serialization/deadlock; conflict stable error |
| check-in | lock token/appointment; unique active queue ticket; token/ticket/encounter/audit | replay existing ticket |
| queue command | lock ticket/station; validate version/state | publish SSE after commit |
| encounter transition | lock encounter; state/event/audit/outbox | optimistic conflict |
| AI submission | intake/encounter/outbox; AI execution outside tx, result finalization in second tx | retry by assessment job key |
| diagnosis/plan/order/result | lock encounter/order; children/status/audit/outbox | no partial clinical changes |
| workflow publish/activate | lock template/draft or encounter; validate DAG; copy tasks/identity/audit | one instance per encounter/version pinned |
| task command | lock task/instance and affected dependents; update/unblock/audit/outbox | version conflict; job retry safe |
| record sign/addendum/reopen | lock record/encounter; completeness/snapshot/signature/status/audit | signature atomic; no auto retry after unknown response without key |
| CRM request approval | lock request/alert; create encounter/link/status/audit | unique alert request avoids duplicates |
| notification/integration | domain tx writes outbox; workers claim with `SKIP LOCKED` | retry/backoff/DLQ |

Use PostgreSQL `READ COMMITTED` plus row locks/constraints for most cases; serializable or constraint-driven retry for booking. Never hold DB transactions during AI/provider/object-storage calls.

## 32. Idempotency Strategy

Require `Idempotency-Key` for booking/reschedule/cancel, check-in, AI submission, plan/order/result/prescription issuance, workflow activation and commands, record signing/reopen/addendum, alert/request decisions, file intent completion and support submission. Scope key by authenticated principal/device + route + target; persist SHA-256 request fingerprint, status and response for 24 hours (7 days for clinical/payment-like commands). Same key/body replays; same key/different body returns `IDEMPOTENCY_KEY_REUSED`. Kiosk redemption additionally keys on token/appointment and returns `repeated:true`. Worker jobs have deterministic event/destination keys; provider delivery references are unique.

Simple safe reads and preference patches do not require idempotency. Refresh rotation uses token family semantics, not the general header.

## 33. Notifications and Background Jobs

Use a transactional outbox → BullMQ dispatcher → channel workers. Confirmed event categories include appointment QR/confirmation, workflow escalation/completion, CRM reminders/questionnaires, alerts, and retryable notifications. Password reset/verification are auth additions. Payload stores template ID/version, locale, recipient, relation IDs and minimal variables; do not put diagnoses or detailed medical content in subject/SMS/push.

Retries: exponential backoff with jitter (1m, 5m, 30m, 2h, 12h), max 5 except provider-specific policy; then DLQ and alert. `notification_deliveries` records provider reference, safe response code, attempt time and redacted failure. In-app delivery is authoritative DB state; external `delivered` only from provider callback. Preferences and legally/operationally mandatory categories are distinguished. `runAutomation` is scheduled and idempotent per activity/due cycle.

Integration message workers use correlation and idempotency keys already modeled by the frontend, never expose a manual “mark delivered” update as `Integrations.tsx` currently does.

## 34. Security Architecture

| Data category | Examples | Storage/log/access/retention |
|---|---|---|
| Public | clinic name, redacted queue number | normal encryption; public-display scope only |
| Internal | workflow templates, station config, integration health | org-scoped RBAC; operational logs allowed without secrets |
| Personal | name/contact/DOB/address | TLS, encrypted volumes; selected fields envelope-encrypted; redact logs |
| Health data | symptoms, diagnoses, results, prescriptions, photos, records | private DB/S3, relationship authorization, read audits, legal retention |
| Auth secrets | hashes, refresh/MFA/reset tokens | one-way hash/encryption as appropriate; never log; limited service accounts |
| Payment | none MVP | future provider tokens only; never card data |

Controls: TLS 1.2+, HSTS and secure headers; strict CORS to configured frontend; CSRF protection for cookie auth; parameterized ORM/raw SQL; DTO whitelisting; output encoding/CSP; rate limits by route/actor/IP/device; Argon2id; secret manager and rotation; least-privilege DB/queue/object credentials; separate environments/accounts/buckets; encrypted backups with restore tests; MIME magic-byte check, malware quarantine, private signed URLs; request IDs and structured JSON logs with allow-list fields; SIEM alerts for brute force, break-glass, cross-scope denials, exports and admin changes.

Never log passwords, access/refresh/reset/MFA/QR tokens, authorization headers/cookies, full medical records/diagnoses/notes, file content, full payment data, or raw provider payloads containing PHI. Current localStorage persistence, client role switching, prototype signing key, fake hashes, arbitrary actor IDs and mutable audit data are development-only behavior and must not ship.

## 35. Audit Log Design

Audit row: actor ID and immutable role/name snapshot, action, resource type/ID, patient/encounter/org/clinic, timestamp, IP, user-agent, request ID, result, reason, changed field names, redacted before/after, impersonation/break-glass context. Application APIs cannot update/delete audit rows. Use append-only DB permissions and optional hash chaining/WORM export for higher assurance.

Audit successful/failed login, refresh reuse, password reset/MFA changes, patient/record/result/document access, file download, clinical create/update/sign/addendum/reopen, AI review, prescription/order/result, appointment book/reschedule/cancel/missed/check-in, queue override, workflow publish/runtime exceptions, care alert/request decisions, role/membership changes, consent, export, integration/DLQ actions and break-glass.

Operational logs explain service behavior; security logs detect attacks; audit logs prove actor/resource actions; domain events drive workflows. They may share request IDs but are distinct stores and retention policies.

## 36. Legal and Compliance Review Items

Technical controls do not establish legal compliance. Professional review is required for patient/AI/photo consent, privacy notices, health-record retention/deletion/export/access history, cross-border DB/object/AI/SMS processing, vendor DPAs, telemedicine and provider licensing, electronic record/signature and prescription validity, identity verification, incident/breach reporting, backup locations, amendment/reopen rules, minors/guardians, emergency/break-glass operations, marketing/re-engagement consent, and whether AI training/reuse is permitted.

Product must decide which clinical notes/results/documents are patient-visible and when, how consent versions are presented, and which administrator can authorize correction/export. Operations must define incident response, access reviews, staff offboarding and restore exercises. Counsel must map the applicable jurisdiction; the repository alone does not identify it beyond Vietnamese UI/location cues.

## 37. Seed Data Plan

Create idempotent deterministic seeds keyed by codes, using fictional `example.test` emails, reserved fictional phone ranges and fictional addresses. Include one organization, clinic/location, departments/stations, one patient, safe practitioners/staff for every confirmed role, schedules, representative appointments/statuses, one check-in/token fixture generated at seed time, queue states, four encounter journeys, AI/doctor/order/workflow/record/care/notification/audit/integration/progress examples.

Fix seed defects: generate unique users for currently duplicated `U-0014/U-0015`; map `APT-1002` to the intended doctor rather than system admin `U-0013`; use ISO instants; ensure all upcoming appointments have planned encounter/token or document deliberate absence; remove real-looking emails/phones. Development-only password such as an environment-injected `SEED_DEMO_PASSWORD` is printed only in local seed documentation and refused when `NODE_ENV=production`. Upsert by stable code; repeated runs create no duplicates.

## 38. Frontend-to-Backend Migration Map

| Frontend source/current symbol | Exact replacement endpoint(s) | Request mapping | Response/query key and required FE change |
|---|---|---|---|
| `AppStateContext.tsx`, `Login.tsx` | `POST /auth/sessions`; `POST /auth/session-refreshes`; `DELETE /auth/sessions/current`; `GET /me` | login form → `CreateSessionRequest`; actor/role are never sent by FE | `['me']`; bootstrap from `CurrentUserResponse`; remove localStorage user selector except dev-only flag |
| `patientService.getCurrentPatient/getPatient` | `GET /patients/{patientId}` or patient link in `GET /me` | route/context patient UUID | `['patients',patientId]`; use ISO DOB and canonical gender/blood enums |
| `patientService.setConsent` | `POST /patients/{patientId}/consent-grants` or `/consent-withdrawals` | toggle → type/policyVersion or type/reason/version | invalidate `['patients',id,'consents']` and `['me','preferences']` |
| `Appointments.tsx` doctor list and `TIMES_*` | `GET /doctors`; `GET /doctors/{doctorId}/availability-slots` | search/specialty/clinic/date/mode; use server `slotId` | `['doctors',filters]`, `['availability-slots',doctorId,filters]`; delete inline doctor/slot arrays |
| `appointmentService.listForPatient/listUpcoming` | `GET /appointments` | patient sends no own actor ID; server scopes patient role; status/from filters | `['appointments',filters]`; render `startsAt` in clinic timezone |
| `appointmentService.bookAppointment` | `POST /appointments` | selected slot/patient/mode/reason/phone → `CreateAppointmentRequest`; add `Idempotency-Key` | set/invalidate appointment detail/list, encounter summary and notifications; handle `APPOINTMENT_SLOT_UNAVAILABLE` |
| `appointmentService.markMissed` | `POST /appointments/{id}/missed-records` | reason/version | invalidate appointment and dashboard queries |
| appointment cancel/reschedule UI | `POST /appointments/{id}/cancellations`; `POST /appointments/{id}/reschedules` | reason/version; reschedule adds new `slotId` | invalidate appointment, availability, token, queue and notification queries |
| `AppointmentQRCode.tsx`, check-in token repository | `GET /appointments/{id}/check-in-tokens/current`; `POST /appointments/{id}/check-in-tokens`; `POST /appointments/{id}/check-in-token-revocations` | regenerate/revoke sends reason/version; never hash/sign in FE | `['appointments',id,'check-in-token']`; render returned `qrPayload`; do not persist raw token |
| `checkInService.checkIn`, `KioskCheckIn.tsx` | `POST /check-ins` | scanner token + configured clinic/device; Idempotency-Key | store only navigation state/result; generic invalid-token error; no patient PHI on kiosk |
| `queueService`, `ClinicQueue.tsx` | `GET /queue-tickets`; noun command subresources under `/queue-tickets/{id}` | status filter and command-specific version/body | `['queue-tickets',filters]`; update from SSE then refetch on reconnect/conflict |
| `QueueStations.tsx` | `GET /queue-stations`; `POST /queue-display-sessions`; SSE `/queue-display-events` | clinic/station selection | `['queue-stations',clinicId]`; board consumes redacted event DTO only |
| `encounterService`, `Journey.tsx`, `PatientJourneyDetail.tsx` | `GET /encounters`; `GET /encounters/{id}`; `GET /encounters/{id}/events`; `POST /encounters/{id}/status-transitions` | filters or targetStatus/reason/blockingCondition/version | `['encounters',filters]`, `['encounters',id]`, event cursor key; no FE-created events |
| `aiAssessmentService.requestAssessment/requestReassessment` | `POST /encounters/{id}/symptom-intakes`; `POST /encounters/{id}/ai-assessment-requests`; `GET /ai-assessments/{id}` | upload files first; submit canonical intake; request assessment with intake ID | `['encounters',id,'symptom-intakes']`, `['encounters',id,'ai-assessments']`; handle 202 job and red flag |
| `doctorDecisionService.reviewAssessment` | `POST /ai-assessments/{id}/doctor-reviews` | action/acceptedConditionCode/rationale | invalidate assessment, reviews and encounter detail |
| `doctorDecisionService.recordDiagnosis/reviseDiagnosis` | `POST /encounters/{id}/diagnoses`; `POST /diagnoses/{id}/revisions` | map exact diagnosis fields; version for revision | invalidate diagnoses, medical record completion and encounter |
| `doctorDecisionService.approveClinicalPlan` | `POST /encounters/{id}/clinical-plans` | diagnosisId/summary; Idempotency-Key | invalidate clinical plan, encounter and workflow recommendation |
| `clinicalOrderService` | `POST /encounters/{id}/clinical-orders`; `/clinical-orders/{id}/service-starts`; `/invalid-samples`; `/cancellations`; `/clinical-results` | exact order/result DTO; include order version | order list/detail keys; invalidate encounter/work tasks/record on result |
| workflow template repository/service | `/workflow-templates`; `/workflow-template-versions`; nested steps/dependencies/layout/validation/publications/archives | keep editor local draft state, persist explicit step/edge/layout commands with version | template/version query keys; on `412` refetch and show conflict; published version read-only |
| workflow runtime service, `WorkQueue.tsx` | `GET /workflow-instances/{id}`; `GET /workflow-tasks`; noun task/instance command subresources | filters; each command sends version and reason/output as required | instance/task/work-queue keys; SSE/poll invalidation; never drag-mutate status locally before success |
| `medicalRecordService` | `GET /encounters/{id}/medical-record`; `POST /encounters/{id}/medical-records`; `PATCH /medical-records/{id}`; `POST /medical-records/{id}/signatures`; `/addenda`; `/reopenings` | diagnosis/discharge/followUp/version or command DTO | record/encounter/audit keys; signed record becomes read-only immediately |
| prescription repository/service and `mockPrescriptions` | `GET /prescriptions`; `POST /encounters/{id}/prescriptions`; `GET /prescriptions/{id}` | convert duration display string to `durationDays`; use canonical medication body | prescription list/detail keys; derive remaining days and status labels in FE |
| fake upload functions in AI/Progress/Records/Profile | `POST /file-upload-intents`; direct signed PUT; `POST /files/{id}/upload-completions`; attach resource endpoint | name/MIME/size/checksum → intent; bytes to signed URL; completion; then fileId in domain request | poll/refetch `['files',fileId]` until available; never use public permanent URL |
| clinical document repository/service | `GET/POST /encounters/{id}/clinical-documents`; document review/report endpoints; file download session | fileId/type/task/order/visibility; review/report reason/version | document list/detail keys; request short-lived download URL on click |
| `crmService`, `Care.tsx` | care plan/activity/automation/alert/encounter-request endpoints in section 25 | activity/trigger/decision DTOs and versions | care-plan/activity/alert/request keys; show async automation run state |
| `notificationService`, `TopHeader.tsx` | `GET /notifications`; notification read receipt/batch/retry request endpoints | cursor filters; IDs/allUnread; retry reason | infinite query + `['notifications','unread-count']`; remove random client delivery |
| `auditService`, `AuditViewer.tsx` | `GET /audit-events` | server filter/cursor only | infinite `['audit-events',filters]`; FE never creates/updates audit rows |
| `Integrations.tsx` direct repository mutations | integration connection/message list and retry/dead-letter resources | IDs/reason/idempotency key | connection/message/run query keys; display job result, never mark delivered locally |
| `mockProgressData`, `mockProgressPhotos`, `Progress.tsx` | progress assessment list/create/detail and file APIs | capturedAt/note/fileIds | progress list/detail keys; charts derive week and improvement from raw scores |
| `Reports.tsx` static arrays | `GET /patients/{id}/report-summaries`; report generation job/download session | date range/type/encounter/locale | report summary/job keys; download only after completed job |
| Dashboard/Profile inline aggregates | existing scoped list/detail APIs; optional backend-for-frontend dashboard projection only after profiling | no hard-coded patient ID | compose query keys first; remove static clinical claims and duplicated arrays |
| `SettingsPage.tsx` | `GET/PUT /me/preferences`; consent endpoints; logout session endpoint | full preference document/version | settings/me/consent keys; real loading/error/success states |
| `Support.tsx` | `POST /support-tickets`; `GET /support-tickets/{id}` | topic/subject/message/attachment IDs | support ticket key; preserve submitted form until success |

Create a compatibility mapper only for incremental rollout: API ISO timestamps → UI formatter; UUID/code separation; normalized medication items → existing cards. Do not adapt backend to ambiguous DD/MM strings, fake hash/URL, numeric IDs, client role, or denormalized names as authority.

## 39. Testing Strategy

Unit: every state graph, red-flag threshold, AI boundary, scheduling overlap, role/relationship policy, DAG/cycle validation, task dependency/skip/redo, record mutability/completion/signing, CRM escalation, mapping, idempotency and log redaction.

Integration against real PostgreSQL/Redis/MinIO: migrations/constraints/index queries, transactions and rollback, auth rotation/reuse, organization scoping, concurrent booking/check-in/task claims, outbox exactly-once effect semantics, file scan/access, audit creation. Use isolated schema/database per worker and deterministic factories; clean in transaction or truncate between suites.

E2E: login/refresh/logout; patient books and receives QR; 20 concurrent callers compete for one slot (exactly one success); kiosk rescans idempotently; queue call/service flow; unrelated doctor denied patient; intake and red flag; doctor review/diagnosis/order/result/plan; workflow publish/activate/task completion; record sign/addendum/reopen; CRM alert to approved follow-up encounter; notification retry; private file upload/download; audit verification; preferences/support.

Security: IDOR UUID swaps, cross-clinic access, role/field escalation, mass assignment, injection payloads, XSS strings, CSRF/CORS, brute force, invalid/reused refresh, token/QR leakage, unsupported/oversized/polyglot files, malicious filename, unscanned object access, stale version/state transitions, audit mutation, sensitive log scanning. Add OpenAPI contract snapshots and frontend contract tests.

Performance targets (PROPOSED MVP): p95 reads <300 ms and writes <500 ms excluding AI/providers; booking remains correct at 50 concurrent attempts/slot; queue SSE reconnects without PHI leak; audit query p95 <1 s for 90-day scoped range.

## 40. Environment Variables

| Variable | Required | Secret | Development example | Used by |
|---|---:|---:|---|---|
| `NODE_ENV`, `PORT`, `API_BASE_PATH` | yes | no | `development`, `3000`, `/api/v1` | app |
| `FRONTEND_ORIGINS`, `APP_PUBLIC_URL` | yes | no | `http://localhost:5173` | CORS/links |
| `DATABASE_URL` | yes | yes | `postgresql://app:dev@postgres:5432/dermahealth` | Prisma |
| `REDIS_URL` | yes | yes | `redis://redis:6379` | BullMQ/rate limits |
| `ACCESS_TOKEN_PRIVATE_KEY`, `ACCESS_TOKEN_PUBLIC_KEY`, `ACCESS_TOKEN_TTL` | yes | yes/no | placeholder PEM refs, `10m` | auth |
| `REFRESH_TOKEN_TTL`, `COOKIE_DOMAIN`, `COOKIE_SECURE` | yes | no | `30d`, empty, `false` | auth |
| `PASSWORD_PEPPER`, `FIELD_ENCRYPTION_KEY` | yes | yes | generated development values | auth/PHI |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE` | uploads | mixed | MinIO local values | files |
| `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | notifications | mixed | Mailpit host/1025 | email |
| `SMS_PROVIDER`, `SMS_API_KEY` | no MVP local | yes | `disabled` | SMS |
| `AI_PROVIDER`, `AI_MODEL_VERSION`, `AI_API_KEY` | yes | key maybe | `deterministic`, `derma-vision-2.4.0` | AI adapter |
| `LOG_LEVEL`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT` | mixed | DSN | `info`, empty | observability |
| `SEED_DEMO_PASSWORD` | dev only | yes | placeholder only | seed |

Secrets come from a secret manager in deployed environments, not committed `.env` files. Separate keys/buckets/databases per environment.

## 41. Local Development Infrastructure

Docker Compose services: API 3000, PostgreSQL 5432 (health `pg_isready`, persistent volume), Redis 6379 (ping health), MinIO 9000/9001 (private bucket and health), Mailpit 1025/8025. MinIO/Mailpit are needed only when exercising upload/email paths; no payment/video services.

Startup: postgres/redis healthy → migrate → seed → API; worker may run in API process for local development. Commands: `npm run db:migrate`, `npm run db:seed`, `npm run start:dev`, `npm run test`, `npm run test:e2e`, `npm run openapi:generate`. Add a root development script to start frontend and backend without changing existing frontend deploy until migration. Volumes persist DB/objects; test Compose uses disposable volumes.

## 42. Deployment and Operational Considerations

MVP: separate dev/staging/prod; container image pinned and scanned; migrations run as a gated one-off job before rollout; backward-compatible expand/migrate/contract changes; `/health/live` process-only and `/health/ready` checks DB/Redis and critical configuration; structured redacted logs, metrics, tracing/error tracking; alerts for auth attacks, 5xx, queue backlog/DLQ, integration/AI/provider failure, storage scan backlog and DB saturation; encrypted daily backup/PITR and quarterly restore test; private object lifecycle; least-privilege service accounts; audit retention partitioning; rolling deploy and tested rollback to previous application version (never destructive schema rollback).

Later: HA database/Redis, cross-region DR after legal decision, WORM audit archive, queue admin UI, automated restore validation, read replicas, formal SLOs. Existing static Nginx workflow deploys only the frontend and must not be reused for backend secrets/processes without a separate pipeline.

## 43. Backend Team Implementation and Delivery Plan

The task order below is the delivery dependency graph. It may be split across engineers only when the declared dependencies and shared contracts are already merged. Suggested workstreams are: **Platform/Security** (T00–T04, T09, T16, T22), **Scheduling/Operations** (T05–T08), **Clinical/EMR** (T10–T11, T14–T15, T17), **Workflow/Integration** (T12–T13, T18), and **FE Integration** (T19–T21). One Backend technical lead owns schema/API consistency and one FE–BE integration owner signs off each module contract.

| Task ID | Task | Dependencies | Deliverables | Tests / acceptance |
|---|---|---|---|---|
| T00 | backend workspace/tooling | none | Nest app, lint/test/OpenAPI, Compose | build/lint/unit run |
| T01 | DB/config foundation | T00 | Prisma, SQL migration support, request IDs/errors/pagination | clean migrate, standardized errors |
| T02 | audit/outbox/idempotency | T01 | append-only audit, outbox worker, key interceptor | atomic rollback/replay tests |
| T03 | identity/org/RBAC | T01–02 | users, memberships, login/refresh/logout/reset/MFA scaffold | rotation/reuse/authorization/security tests |
| T04 | patients/consents/preferences | T03 | scoped profiles/care-team/consent events | self/related/cross-org tests |
| T05 | clinics/practitioners/schedules | T03 | reference data, schedule/availability | timezone/exception tests |
| T06 | appointments | T04–05,T02 | booking/detail/cancel/reschedule, GiST constraint | concurrent slot test |
| T07 | QR/check-in/queue | T06 | hashed tokens, devices, tickets, commands/SSE | rescan/location/window/concurrency tests |
| T08 | encounters/journey | T04,T07 | encounter state/event APIs | exact graph/closure scope tests |
| T09 | file service | T03 | S3 intents/complete/scan/download policy | MIME/size/IDOR tests |
| T10 | intake/AI | T08–09 | versioned intake, adapter/jobs/red flags | threshold, failure, AI boundary tests |
| T11 | doctor decisions/orders/results | T08,T10 | reviews/diagnoses/plans/orders/results | assignment/state/late result tests |
| T12 | workflow design | T03,T08 | draft/version/steps/edges/publish | DAG/immutability/role tests |
| T13 | workflow runtime/work queue | T11–12 | activation/tasks/commands/SLA jobs | dependency/race/rework tests |
| T14 | EMR/prescriptions/documents | T09,T11,T13 | record assembly/sign/addenda/reopen/files | immutable signature and access audit E2E |
| T15 | care plans/alerts/requests | T08,T14 | activities/automation/alert/follow-up creation | decision/idempotency tests |
| T16 | notifications | T02–03,T06+ | inbox, templates, providers, retries/DLQ | delivery preference/retry tests |
| T17 | progress/reports | T09,T14 | assessment/photo APIs, aggregates/PDF | scoped derivation/download tests |
| T18 | integration ops/support | T02–03 | connection/message workers, safe admin commands, tickets | unique keys/role tests |
| T19 | frontend auth/API foundation | T03 | API client/query cache/error mapper/session | login/refresh contract tests |
| T20 | frontend appointment→clinical migration | T06–16 | replace repositories module-by-module | no local mutation; workflow E2E |
| T21 | frontend legacy mock removal | T17–18 | progress/report/prescription/settings/support migration | no domain hard-coded data |
| T22 | hardening/operations | all | security/load tests, backups, dashboards/runbooks | readiness checklist and restore drill |

Each task creates module/controller/DTO/application/domain/repository/tests and updates OpenAPI/migrations. The team must not begin T20 before the corresponding endpoint stage is contract-tested, and must keep feature flags/adapters only long enough for incremental migration.

### Delivery gates

| Gate | Required evidence | Exit decision |
|---|---|---|
| G0 — foundation ready | clean Compose startup, empty-DB migration, seed rerun, health endpoints, standard errors/request IDs, CI | Backend technical lead |
| G1 — identity and scope ready | login/refresh/logout, role and organization policies, cross-clinic/IDOR tests, audit foundation | Security reviewer + BE lead |
| G2 — operational visit flow ready | availability → booking → QR → check-in → queue → encounter demonstrated via API and E2E | BE lead + FE integration owner |
| G3 — clinical flow ready | intake → AI result → doctor decision → order/result → workflow → signed record demonstrated; immutable/audit tests pass | Clinical product owner + BE lead |
| G4 — post-visit flow ready | care automation, alerts, follow-up encounter, notifications, progress/report and support/integration paths pass | Product + QA |
| G5 — mock removal ready | FE contract suite passes, all mapped repository/mock consumers removed or feature flag retired, no undocumented transformation | FE and BE leads |
| G6 — production ready | security/load tests, backup restore, observability, runbooks, migration and rollback rehearsal | Engineering/operations sign-off |

### Per-module Definition of Done

- Database migration applies to an empty database and from the previous released migration; rollback/forward-fix impact is documented.
- Seed creates corrected, linked demo data and is repeatable without duplication.
- OpenAPI contains request/response examples, auth, filters, errors and all command endpoints; generated schema is committed/published by CI.
- Authorization is tested for allowed actor, wrong role, unrelated patient, cross-clinic actor and super-admin/break-glass behavior where applicable.
- High-risk writes have transaction, concurrency and idempotency tests; state cannot be changed through generic mass-assignment PATCHes.
- Audit/outbox records are asserted for successful and rejected sensitive operations.
- FE receives a stable example payload and error mapping; contract test passes before mock removal.
- Operational signals exist for failures, retries and DLQ where the module has workers/providers.

## 44. Acceptance Criteria

- All protected backend endpoints reject anonymous calls; all entity lookups enforce organization and relationship scope; cross-patient/clinic IDOR tests pass.
- Login validates credentials; refresh rotates; token reuse revokes the family; no auth/QR secret or PHI appears in logs/localStorage.
- Appointment availability is server-generated and concurrent duplicate booking is prevented by DB constraints; booking atomically creates planned encounter, hashed QR token, audit and notification outbox.
- Check-in is window/location/device/status validated and rescan-idempotent; queue commands use valid transitions and public feeds contain no identity/clinical data.
- Encounter, task, record, alert and request statuses can change only through documented commands; invalid transitions return stable codes.
- AI inputs/outputs are versioned; red flags escalate; AI cannot diagnose, prescribe, sign or close.
- Only related doctors create/revise diagnosis/plan/order and sign records; signed content is immutable; addenda/reopen preserve history; access is audited.
- Workflow versions are immutable after publish; cycles are rejected; instances pin versions; dependency and mandatory-step rules are enforced under concurrency.
- Sensitive objects are private, verified/scanned, served by short-lived authorized URLs and download-audited.
- Care automation is idempotent; follow-up encounter creation requires doctor/admin decision; notification jobs retry and DLQ safely.
- OpenAPI is complete and CI-synchronized; empty-database migrations and repeated seeds succeed; unit/integration/E2E/security suites pass.
- No relevant frontend screen depends on hard-coded domain mocks or direct repository mutation after T21; transformations are documented and contract-tested.

## 45. Confirmed Frontend Defects

1. `seed.ts` defines `U-0014` and `U-0015` twice with different people/roles; map-based lookup and upsert make role identity ambiguous.
2. `APT-1002.doctorId = U-0013`, but `U-0013` is system administrator; UI manually maps doctor 2 to the same wrong ID.
3. Timestamps mix `DD/MM/YYYY HH:mm`, date/time split strings, and ISO output; `new Date(string)` behavior and lexical sorting are unsafe.
4. Login never validates credentials; selecting an account stores arbitrary current user ID in localStorage; all entity/role/audit data are client-modifiable.
5. Several sensitive routes (`journey`, `records`, `patient-journey`, `settings`, `support`, dashboard) lack route gates; client gates would still not be authorization.
6. `AppointmentDetail` checks patient ownership only for patient/receptionist route assumptions; broader relation rules are absent.
7. Booking captures name, phone and reason but `appointmentService.bookAppointment` discards them; UI says video while command sends `in_person`; static doctor availability/fee/cancellation rules are inconsistent.
8. No server conflict check; any date including past dates can be selected/booked.
9. QR uses a committed prototype signing key and weak noncryptographic hash, stores raw token, and infers audit role from actor ID.
10. Queue service accepts arbitrary target statuses and lacks transition/role/location enforcement.
11. Direct integration repository mutations can mark failed messages delivered/reset DLQ without provider processing/audit.
12. `NotificationService` randomly determines delivery on the client.
13. Fake document upload creates filename/random fake hash without bytes, MIME, storage or access control; progress upload modal also discards data.
14. `Records.tsx` renders each clinical document twice in one `renderItem` block (duplicate sibling markup) and treatment Kanban is volatile/duplicated from CRM concepts.
15. `EncounterCreationRequestStatus` includes `approved`, but approval writes `encounter_created` while the audit `newState` says `approved`.
16. `Appointment.status` uses `done` whereas other domains use `completed/closed`; mock IDs/shapes and medication duration formats conflict with canonical entities.
17. Static reports/profile/dashboard/prescriptions make clinical claims that can diverge from repository state.
18. No loading/network error/pagination behavior exists because all services are synchronous; forms have minimal schema validation.
19. The repository's current `npm run build` fails TypeScript `noUnusedLocals`: `src/pages/workflows/WorkflowTemplateEditor.tsx` imports `Upload` but does not use it. This predates and is unrelated to this documentation-only change.

## 46. Risks and Technical Debt

Highest risks: IDOR/cross-clinic disclosure, client-side role escalation, double booking, duplicated check-in/tickets, arbitrary state mutation, mutable/silent changes to signed clinical data, public or unscanned health files, leaked tokens/PHI in logs, AI presented as diagnosis, non-idempotent clinical commands, inconsistent timezone conversion, notification/integration duplicate delivery, and incomplete audit context.

Technical debt to avoid carrying forward: arrays of foreign keys in encounter/record entities, free-text departments/specialties/gender, denormalized actor names as identity, display-formatted dates/money/durations, generic repository `upsert`, client-generated IDs/hashes, workflow rules stored only as free text, and conflating patient treatment tasks with workflow tasks and CRM activities.

## 47. Missing Product Decisions

| Question | Why/affected modules | Safe default | Alternatives/impact |
|---|---|---|---|
| Organization/clinic tenancy model? | all authorization/schema | one org, explicit clinic memberships | multi-org requires tenant provisioning and scope UX |
| Staff onboarding/auth/MFA? | identity/security | invite staff; MFA admins/clinicians | SSO/OIDC changes identity adapter |
| Patient registration/guardian/minor flow? | identity/patients/consent | invitation/self-registration disabled by default | guardian relations and consent UI/schema |
| Exact appointment schedule, duration, cancellation/no-show/fee policy? | scheduling/notifications/future payment | capacity 1, 30 min, configurable, no automated fee | policy engine and price/refund additions |
| Which upcoming seed dates/data are intended? | seed/demo | migrate relationships, use relative future dates | fixed historical demo snapshots |
| Clinical terminology/coding standards? | diagnosis/medication/orders | preserve code+display, validate local catalog | ICD/SNOMED/RxNorm/local catalogs |
| Patient visibility/release timing? | records/results/files | staff-only until explicitly released | automatic release by type/time |
| Legal signature/reopen approval? | EMR/audit | attributed hash + attestation; admin reopen with reason | qualified e-signature/dual approval |
| AI provider, intended use, human oversight, image retention? | AI/files/legal | deterministic adapter for parity, advisory only, no training reuse | external provider needs DPA/cross-border review |
| Workflow conditional-rule execution language? | workflow | store/display rules; require human decision in MVP | safe DSL evaluator later; never execute arbitrary code |
| Notification providers/content/mandatory categories? | notifications/preferences | in-app + Mailpit; SMS disabled | vendor integrations and consent policy |
| Integration protocols/payload retention? | integration ops | metadata-only simulator adapter | FHIR/HL7/custom needs mappings/security |
| Progress score semantics and report medical status? | progress/reports | label as informational derived snapshot | validated clinical instrument changes governance |
| Payments/chat/video in scope? | future modules | out of MVP | provider/product selection adds dedicated stages |
| Data retention/deletion/export jurisdiction? | all health/audit/backups | no hard delete; configurable legal hold | counsel decision and operational jobs |
| Break-glass eligibility/approval/duration? | EMR/security | clinicians/admin only, reason, 1-hour scope, alert compliance | dual approval may be required |

## 48. Future Enhancements

After MVP and product approval: OIDC/enterprise SSO and WebAuthn; guardian/delegate access; standards-based FHIR/HL7 integration; safe workflow condition DSL; validated clinical terminologies; telemedicine rooms/chat; payment/refund/invoice module; e-prescription provider; patient access-history portal; advanced consent/legal hold; WORM audit archive; de-identified analytics; wait-time optimization; mobile push/offline mode; multilingual content CMS; provider schedule/holiday administration; formal AI monitoring, bias/drift and clinician feedback.

## 49. Traceability Matrix

| Requirement ID | Module / requirement | Class | Frontend evidence / mock | DB entities | API / policy / tests | Task |
|---|---|---|---|---|---|---|
| AUTH-001 | real login/session replaces user selector | CONFIRMED need / PROPOSED design | `Login.tsx`, `AppStateContext.tsx` | users,sessions,memberships | `/auth/*`; auth tests | T03,T19 |
| PAT-001 | scoped patient profile and primary care relation | CONFIRMED | `Patient`, `Profile.tsx`, seed | patients,care_team | `/patients/*`; `CanViewPatient` | T04 |
| CONSENT-001 | grant/withdraw consent history | CONFIRMED | `Consent`, Settings, patient service | consents/events | consent commands; version tests | T04 |
| SCHED-001 | server availability and overlap prevention | CONFIRMED booking / INFERRED schedule | `Appointments.tsx` slots | schedules,appointments | availability; concurrent booking | T05–06 |
| APPT-001 | book/view/cancel/reschedule/missed commands | CONFIRMED book/view/status | appointment service/pages | appointments/history | appointment APIs/policy | T06 |
| CHECKIN-001 | cryptographic one-time QR and idempotent redeem | CONFIRMED | token/check-in service, kiosk | tokens,devices,tickets | token/check-in APIs/security tests | T07 |
| QUEUE-001 | priority queue/station command workflow and redacted display | CONFIRMED | queue service/pages | queue_tickets/stations | queue commands/SSE | T07 |
| ENC-001 | enforced encounter graph/events/closure | CONFIRMED | encounter service/enums | encounters/events | transition commands/state tests | T08 |
| AI-001 | versioned intake/AI/red flag and human boundary | CONFIRMED | AI service/page | intakes,assessments,candidates | intake/AI APIs; boundary tests | T09–10 |
| DOC-001 | doctor review/diagnosis/revision/plan | CONFIRMED | doctor service/page | reviews,diagnoses,plans | clinical commands/policy | T11 |
| ORDER-001 | clinical order/result/invalid sample/late result | CONFIRMED | order service/Records | orders/results | order commands/role tests | T11 |
| WF-001 | immutable DAG template/version lifecycle | CONFIRMED | workflow service/editor | templates,versions,steps,edges | graph APIs/cycle tests | T12 |
| WF-002 | pinned instance/tasks/dependencies/SLA commands | CONFIRMED | workflow service/queue pages | instances,tasks | runtime APIs/race tests | T13 |
| MED-001 | draft/sign/immutable/addendum/reopen record | CONFIRMED | record/encounter services | records,signatures,addenda | EMR commands/policies/E2E | T14 |
| RX-001 | prescription and medication items | CONFIRMED | interfaces/service/mocks/page | prescriptions/items | prescription APIs/doctor policy | T14 |
| FILE-001 | private verified/scanned clinical media | CONFIRMED need / PROPOSED controls | uploads/Documents | file_objects/documents | file APIs/IDOR/MIME tests | T09,T14 |
| CARE-001 | activities/automation/alerts/encounter requests | CONFIRMED | CRM service/Care | care tables | care commands/decision tests | T15 |
| NOTIF-001 | inbox/read/retry and queued multichannel delivery | CONFIRMED | Notification/service/header | notifications/deliveries/outbox | notification APIs/jobs | T16 |
| PROG-001 | longitudinal photos/scores and reports | INFERRED persistence | Progress/Reports/mockData | progress/files | progress/report APIs | T17 |
| AUDIT-001 | immutable sensitive access/action trail | CONFIRMED | AuditEvent/service/viewer | audit_events | audit query; append-only tests | T02 |
| INT-001 | integration health/idempotency/retry/DLQ | CONFIRMED simulated | integration entities/page | connections/messages | integration APIs/jobs | T18 |
| PREF-001 | user preferences | INFERRED persistence | Settings | user_preferences | `/me/preferences` | T04,T21 |
| SUPPORT-001 | persist support requests | INFERRED | Support form | support_tickets | `POST /support-tickets` | T18,T21 |
| SEC-001 | tenant/relation authorization, secret/file/log protection | PROPOSED required | route/service defects | memberships/audit/files | policies/security suite | T03,T09,T22 |
| FE-001 | remove localStorage repositories and hard-coded domain arrays | CONFIRMED integration need | repositories/mockData/pages | all | contract/E2E/no-mock scan | T19–21 |

Every confirmed backend requirement in sections 6–18 is represented above; smaller endpoint variants inherit the parent requirement ID and task.

## 50. Final Readiness Checklist

- [x] All 80 TS/TSX source files and 10 relevant repository/config files inspected; no relevant unread files.
- [x] Every route/page/modal/tab workflow inventoried; static configuration separated from backend data.
- [x] Dedicated seed, legacy mock data, localStorage, simulated services, inline arrays/uploads and hard-coded metrics inventoried.
- [x] Types, enums, forms, role gates, all service commands and state vocabularies reconciled.
- [x] Confirmed/inferred/proposed/unknown classifications used; unsupported payment/chat/video not marked confirmed.
- [x] Canonical relational model, constraints, indexes, ERD and mock migration documented.
- [x] API conventions, endpoint catalog, detailed high-risk contracts, errors, pagination and OpenAPI requirements specified.
- [x] Public API nouns align with current FE (`doctor`, `appointment`, `encounter`, `workflow-task`, `medical-record`) while internal database naming remains independently normalized.
- [x] 167 exact method/path rows, noun command suffixes, request bodies, response DTOs, pagination metadata and shared FE route constants are documented.
- [x] Server authentication/authorization/field scope, validation, transactions, concurrency and idempotency specified.
- [x] Clinical immutability, AI limits, private files, notifications, security, audit and legal boundaries specified.
- [x] Seed, environment, local infrastructure, operations, frontend migration, testing and dependency-aware Backend team tasks specified.
- [x] Confirmed defects, risks, decisions, enhancements, acceptance criteria and traceability provided.
- [ ] Product/legal owners resolve section 47 decisions before production launch; safe defaults permit implementation to start.
