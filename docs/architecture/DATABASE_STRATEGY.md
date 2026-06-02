# DATABASE_STRATEGY.md
## CareFollow Platform — PostgreSQL Architecture Strategy

**Version:** 1.0.0
**Status:** DRAFT — Awaiting architecture document upload
**Author:** Principal PostgreSQL / DDD Architect
**Date:** 2026-06-01
**Scope:** Modular Monolith → Microservice Evolution

> **Source-of-Truth Notice**
> This document was authored from codebase reverse-engineering (service layer, model directories, API prefix inventory) pending formal receipt of `ARCHITECTURE_SPECIFICATION.md`, `CONTEXT_MAP.md`, `DDD_MODEL.md`, and `MICROSERVICE_EVOLUTION_PLAN.md`. Every factual claim is tagged **CONFIRMED**, **INFERRED**, or **UNKNOWN**. Once those documents are delivered, all UNKNOWN and INFERRED items must be reconciled.

---

## Table of Contents

1. [Database Philosophy](#1-database-philosophy)
2. [Schema-per-Context Strategy](#2-schema-per-context-strategy)
3. [UUID Strategy](#3-uuid-strategy)
4. [Audit Columns Strategy](#4-audit-columns-strategy)
5. [Soft Delete Strategy](#5-soft-delete-strategy)
6. [Multi-tenancy Strategy](#6-multi-tenancy-strategy)
7. [Event Outbox Strategy](#7-event-outbox-strategy)
8. [Backup Strategy](#8-backup-strategy)
9. [Migration Strategy](#9-migration-strategy)
10. [Index Strategy](#10-index-strategy)
11. [Reporting Projection Strategy](#11-reporting-projection-strategy)
12. [Cross-Context Reference Rules](#12-cross-context-reference-rules)
13. [Data Ownership Rules](#13-data-ownership-rules)
14. [Unknown Registry](#14-unknown-registry)

---

## 1. Database Philosophy

### 1.1 Core Principles

CareFollow adopts **PostgreSQL as the single relational engine** for all bounded contexts during the Modular Monolith phase. The design philosophy is governed by four non-negotiable axioms:

| Axiom | Statement |
|---|---|
| **Context Sovereignty** | Each bounded context owns its schema exclusively. No context may read or write another context's tables directly. |
| **Loose Coupling** | Inter-context relationships are expressed as UUID references, never as foreign-key constraints crossing schema boundaries. |
| **Microservice Readiness** | Every schema must be extractable to an independent PostgreSQL database instance without application-layer changes beyond connection-string configuration. |
| **Auditability by Default** | Every domain table carries created/updated/deleted timestamps and actor IDs as non-negotiable columns. |

### 1.2 Technology Choice Rationale

- **CONFIRMED:** PostgreSQL is the chosen RDBMS.
- **INFERRED:** PostgreSQL version 15+ is assumed to leverage logical replication, row-level security, and `pg_partman` for partition management.
- **INFERRED:** The application is a healthcare/beauty clinic SaaS platform (CareFollow) serving multiple clinic tenants.
- **CONFIRMED:** The system uses a multi-service API topology (`/adminapi`, `/authenticator`, `/bpmapi`, `/hr`, `/notification`, `/finance`, `/warehouse`, `/sale`, `/cs`), confirming bounded context separation is already operationally recognized.

### 1.3 Operational Model

```
Phase 1 — Modular Monolith
  └── Single PostgreSQL cluster
      └── Multiple schemas (one per bounded context)
      └── Single connection pool (PgBouncer recommended)
      └── Logical separation enforced at application layer

Phase 2 — Service Extraction
  └── One PostgreSQL instance per extracted microservice
      └── Schema promoted to a standalone database
      └── No SQL changes required — connection string only
      └── CDC (Change Data Capture) via logical replication for cross-service projections
```

---

## 2. Schema-per-Context Strategy

### 2.1 Schema Inventory

Each row represents one bounded context with its PostgreSQL schema name, service-layer prefix evidence, and evolutionary status.

| # | Bounded Context | Schema Name | API Prefix Evidence | Evolution Priority |
|---|---|---|---|---|
| 1 | Identity & Access | `iam` | `/authenticator` | High — extract first |
| 2 | Customer | `customer` | `/adminapi/customer` | High |
| 3 | Clinical | `clinical` | `/adminapi/patient`, `/adminapi/treatment` | High — sensitive data |
| 4 | Scheduling | `scheduling` | `/adminapi/schedule` | Medium |
| 5 | Business Process (BPM) | `bpm` | `/bpmapi` | Medium |
| 6 | CRM & Campaign | `crm` | `/adminapi/campaign`, `/cs` | Medium |
| 7 | Communication | `communication` | `/notification` | Low |
| 8 | Finance | `finance` | `/finance`, `/sale` | High — compliance boundary |
| 9 | Human Resources | `hr` | `/hr` | Medium |
| 10 | Product & Service Catalog | `catalog` | `/adminapi/product`, `/adminapi/service` | Low |
| 11 | Inventory & Warehouse | `inventory` | `/warehouse` | Low |
| 12 | Support & Warranty | `support` | `/cs/ticket`, `/cs/warranty` | Low |
| 13 | Notification | `notification` | `/notification` | Low |
| 14 | Reporting (Projections) | `reporting` | `/adminapi/report` | Derived — read-only |
| 15 | System Configuration | `system_config` | `/system`, `/adminapi/setting` | Low |
| 16 | Outbox (Internal) | `outbox` | n/a — infrastructure | Infrastructure |

> **UNKNOWN-01:** The exact boundary between `crm` and `customer` contexts is ambiguous. `Contact` and `Customer` overlap. This must be resolved in CONTEXT_MAP.md.

> **UNKNOWN-02:** `SocialCRM` (Facebook, Zalo) integration scope — whether it belongs in `crm` or a dedicated `social_integration` schema — is undetermined.

### 2.2 Schema Naming Convention

- All schema names are **lowercase, snake_case**.
- The `public` schema is **never used** for domain tables; it is reserved for shared extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`).
- Each schema has a dedicated **schema owner role** with `USAGE` and `CREATE` privileges.
- Application roles are granted **schema-specific** privileges only — no cross-schema grants.

### 2.3 Schema Isolation Enforcement

- In Modular Monolith phase, isolation is enforced at the **application layer**: each context's repository layer is configured with a schema-scoped connection or `search_path` set to its own schema.
- `search_path` is set per session, not globally, to prevent accidental cross-schema table resolution.
- In CI, a static analysis lint rule must flag any query that references a table outside its declared context schema.

---

## 3. UUID Strategy

### 3.1 UUID Version

- All primary keys use **UUID v7** (time-ordered, monotonically increasing).
- **Rationale:** UUID v4 is fully random and causes B-tree index fragmentation at scale. UUID v7 preserves insertion order, dramatically reducing write amplification in large tables (e.g., `clinical.treatment_history`, `finance.transaction`).
- **INFERRED:** If the current runtime does not support native UUID v7 generation, `gen_random_uuid()` (v4) is acceptable as an interim measure with a documented migration path to v7.

### 3.2 Generation Location

- UUIDs are **generated at the application layer**, not via `DEFAULT gen_random_uuid()` in the database.
- **Rationale:** Application-layer generation allows the ID to be known before the INSERT, enabling event-sourcing and outbox patterns without a round-trip to the database.
- The database column retains `DEFAULT gen_random_uuid()` as a safety net only.

### 3.3 Cross-Context Reference

- When Context A references an entity from Context B, it stores the **UUID only**, typed as `uuid NOT NULL`.
- The column is named using the pattern `{context_short}_{entity}_id` (e.g., `iam_user_id`, `customer_patient_id`).
- No foreign key constraint is created across schemas.

### 3.4 UUID as Business Key

- UUIDs are the **only primary key** — no surrogate integer sequences, no composite primary keys on domain tables.
- Natural keys (e.g., patient code, clinic code) are stored as `UNIQUE NOT NULL` columns alongside the UUID PK but are never used as foreign keys.

---

## 4. Audit Columns Strategy

### 4.1 Mandatory Audit Columns

Every domain table (excluding read-only projection tables and infrastructure tables) must carry the following columns:

| Column | Type | Constraint | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY NOT NULL` | UUID v7, application-generated |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | UTC creation timestamp |
| `created_by` | `uuid` | `NOT NULL` | `iam_user_id` of the actor |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | UTC of last update |
| `updated_by` | `uuid` | `NOT NULL` | `iam_user_id` of last actor |
| `deleted_at` | `timestamptz` | `NULL` | NULL = active; set = soft-deleted |
| `deleted_by` | `uuid` | `NULL` | Actor who performed soft delete |
| `tenant_id` | `uuid` | `NOT NULL` | Owning clinic/organization — see §6 |
| `row_version` | `integer` | `NOT NULL DEFAULT 1` | Optimistic locking counter |

### 4.2 Timestamp Policy

- All timestamps are stored in **UTC** (`timestamptz`), never `timestamp without time zone`.
- Display-layer timezone conversion is the responsibility of the API layer, not the database.
- `updated_at` is updated via an **application-layer touch**, not a database trigger, to remain microservice-portable.

### 4.3 Actor Tracing

- `created_by` and `updated_by` store the UUID of the `iam.user` record.
- For system-generated events (automated jobs, BPM workflows), a dedicated system actor UUID is defined per tenant and stored in `iam.system_principals`.
- **UNKNOWN-03:** Whether a separate `created_by_type` discriminator column (human vs. system vs. integration) is required — deferred to DDD_MODEL.md review.

### 4.4 Optimistic Locking

- `row_version` is incremented by `1` on every UPDATE.
- The application layer enforces optimistic locking by including `WHERE id = $1 AND row_version = $2` on all UPDATE statements.
- A version mismatch returns a `409 Conflict` response.

---

## 5. Soft Delete Strategy

### 5.1 Policy

- **All domain entities use soft delete.** Hard deletes are prohibited on domain tables except in legally mandated data erasure scenarios (GDPR right-to-erasure — see UNKNOWN-04).
- Soft delete is implemented via the `deleted_at` column: `NULL` means active, a timestamp means deleted.
- `deleted_by` records the actor UUID.

### 5.2 Query Filtering

- Every repository-layer query must include a `WHERE deleted_at IS NULL` predicate by default.
- The application framework must enforce this via a **base repository filter** to prevent accidental full-table reads.
- Explicit "include deleted" queries require an opt-in flag at the repository method level.

### 5.3 Cascade Soft Delete Rules

- When a parent entity is soft-deleted, child entities within the **same context** are cascade soft-deleted at the application layer (not via database CASCADE).
- Cross-context cascade soft delete is handled via **domain events** through the outbox — the owning context publishes a `{Entity}Deleted` event; subscriber contexts apply their own soft delete policy.
- **INFERRED:** Example: deleting a `customer.patient` should cascade soft-delete `scheduling.appointments` within the scheduling context via an event.

### 5.4 Unique Constraints and Soft Delete

- Unique constraints that include business keys must account for soft delete.
- Pattern: A **partial unique index** is used: `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`.
- This ensures a soft-deleted record's unique key can be reused without constraint violation.

### 5.5 Data Retention

- **UNKNOWN-04:** Specific data retention periods for clinical/medical records (regulatory requirement in Vietnam). Once defined in ARCHITECTURE_SPECIFICATION.md, a background purge job policy will be documented.
- **UNKNOWN-05:** Whether GDPR or Vietnamese PDPD (Personal Data Protection Decree) hard-erasure obligations apply. If yes, a separate `erasure_request` workflow is required before hard delete is permitted.

---

## 6. Multi-tenancy Strategy

### 6.1 Tenancy Model

- **INFERRED:** CareFollow is a SaaS platform serving multiple independent clinic organizations ("tenants"). Each clinic is one tenant.
- Tenancy model adopted: **Shared Database, Shared Schema** with **Row-Level Isolation via `tenant_id`**.
- Every domain table carries `tenant_id uuid NOT NULL` as a mandatory discriminator column.
- **Rationale:** Schema-per-tenant would conflict with the schema-per-context strategy. The two concerns are orthogonal: schema = context boundary, `tenant_id` = data isolation within that context.

### 6.2 Tenant Identifier

- A `tenant_id` is a UUID defined in `iam.organization`.
- Every API request carries the tenant identity in a JWT claim (`tenant_id`).
- The application layer extracts `tenant_id` from the JWT and injects it into all repository queries automatically via a request-scoped context.

### 6.3 Row-Level Security (RLS)

- **INFERRED:** PostgreSQL Row-Level Security policies should be enabled on sensitive tables (especially `clinical.*`) to provide a defense-in-depth isolation guarantee at the database layer.
- RLS policy: `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`.
- The application sets `SET LOCAL app.current_tenant_id = '...'` at the start of each transaction.
- **UNKNOWN-06:** Whether RLS is a Phase 1 requirement or a Phase 2 hardening item — to be determined by ARCHITECTURE_SPECIFICATION.md.

### 6.4 Cross-Tenant Data Prohibition

- No query may return data across multiple `tenant_id` values in a single result set, except in a dedicated super-admin reporting context (`reporting.cross_tenant_*` views) accessible only to internal platform operators.
- **UNKNOWN-07:** Whether a "platform operator" role with cross-tenant read access is required — to be confirmed.

### 6.5 Tenant Onboarding

- When a new tenant is provisioned, a setup service creates seed records in:
  - `iam.organization` (tenant master)
  - `iam.roles` (default roles)
  - `system_config.settings` (default configuration)
  - `catalog.*` (default product/service templates, if applicable)
- **UNKNOWN-08:** Whether tenants share a common catalog or each tenant has a fully isolated catalog — to be confirmed in DDD_MODEL.md.

---

## 7. Event Outbox Strategy

### 7.1 Rationale

Cross-context communication in a Modular Monolith uses the **Transactional Outbox Pattern** to guarantee at-least-once delivery of domain events without distributed transactions.

### 7.2 Outbox Schema

The `outbox` schema is a shared infrastructure schema, not a bounded-context schema. It contains a single table used by all contexts.

**Outbox table structure (conceptual — no SQL):**

| Column | Purpose |
|---|---|
| `id` | UUID v7 primary key |
| `tenant_id` | Owning tenant for partitioning and routing |
| `aggregate_type` | The bounded context and entity (e.g., `customer.Patient`) |
| `aggregate_id` | UUID of the root aggregate that generated the event |
| `event_type` | Fully qualified event name (e.g., `customer.PatientCreated.v1`) |
| `event_payload` | JSONB — the event body |
| `occurred_at` | UTC timestamp of the domain event (not publish time) |
| `published_at` | NULL until successfully published to the message broker |
| `publish_attempts` | Integer counter for retry tracking |
| `created_at` | Row insertion timestamp |

### 7.3 Write Flow

1. Application begins a database transaction.
2. Domain logic writes to the owning context's schema tables.
3. In the **same transaction**, a record is inserted into `outbox.events`.
4. Transaction commits atomically — both the domain write and the outbox record succeed or fail together.
5. A background relay process (`OutboxRelay`) polls `outbox.events WHERE published_at IS NULL` and publishes to the message broker (Kafka / RabbitMQ — **UNKNOWN-09**).
6. On successful publish, `published_at` is stamped.

### 7.4 Relay Mechanism

- The relay polls on a configurable interval (recommended: 500ms for low-latency contexts, 5s for batch contexts).
- The relay uses `SELECT ... FOR UPDATE SKIP LOCKED` to support multiple relay instances without contention.
- Failed publishes increment `publish_attempts` and are retried with exponential backoff up to a configurable max.
- After max retries, the event is moved to `outbox.dead_letter_events` for operator inspection.

### 7.5 Event Versioning

- Event types are versioned: `{context}.{EventName}.v{N}` (e.g., `clinical.TreatmentCompleted.v1`).
- Consumers must declare which versions they support.
- Breaking schema changes require a new version; non-breaking additions are backward-compatible within the same version.

### 7.6 Outbox Cleanup

- After successful publication and a configurable retention window (default: 7 days), published outbox records are archived to `outbox.events_archive` and purged from the hot table.
- **INFERRED:** A pg_partman time-range partition strategy on `outbox.events` by `created_at` (monthly partitions) is recommended to keep the hot table lean.

### 7.7 Known Contexts Generating Outbox Events

| Context | Key Events (INFERRED) |
|---|---|
| `customer` | PatientCreated, PatientUpdated, PatientDeleted |
| `clinical` | TreatmentCompleted, AppointmentCheckedIn, DiarySurgeryFinalized |
| `scheduling` | AppointmentBooked, AppointmentCancelled, AppointmentRescheduled |
| `finance` | InvoicePaid, PaymentReceived, CashbookEntryCreated |
| `bpm` | WorkflowInstanceStarted, TaskAssigned, TaskCompleted, WorkflowCompleted |
| `crm` | CampaignLaunched, LeadConverted |
| `iam` | UserCreated, UserDeactivated, PasswordChanged |
| `support` | TicketCreated, TicketResolved, WarrantyClaimOpened |

---

## 8. Backup Strategy

### 8.1 Backup Tiers

| Tier | Type | Frequency | Retention | Method |
|---|---|---|---|---|
| Continuous | WAL Archiving | Real-time | 7 days | `pg_basebackup` + WAL streaming |
| Daily | Full Base Backup | Daily 02:00 UTC | 30 days | `pg_dump` per schema or `pg_basebackup` |
| Weekly | Full Snapshot | Sunday 03:00 UTC | 12 weeks | Compressed `pg_dump` to cold storage |
| Monthly | Archive Snapshot | 1st of month 04:00 UTC | 12 months | Encrypted archive, offsite |

### 8.2 Recovery Point Objective (RPO) / Recovery Time Objective (RTO)

- **UNKNOWN-10:** Formal RPO/RTO SLAs have not been confirmed in ARCHITECTURE_SPECIFICATION.md.
- **INFERRED Target:** RPO ≤ 5 minutes (WAL-based), RTO ≤ 1 hour for full cluster restore.
- Clinical data (`clinical` schema) must have RPO ≤ 1 minute if medical record compliance requires it.

### 8.3 Schema-Level Restore

- Because contexts are schema-isolated, a single context's schema can be restored independently using `pg_restore --schema={schema_name}` without full cluster downtime.
- This is a critical advantage of the schema-per-context strategy — it enables targeted point-in-time recovery.

### 8.4 Backup Encryption

- All backup files are encrypted at rest using AES-256 before upload to cloud storage.
- Encryption keys are managed outside the database (e.g., AWS KMS / HashiCorp Vault — **UNKNOWN-11**).

### 8.5 Backup Validation

- A weekly automated restore test must execute against a non-production environment to validate backup integrity.
- Restore test success/failure is logged and alerted to the on-call operator.

---

## 9. Migration Strategy

### 9.1 Migration Tooling

- **UNKNOWN-12:** The specific migration tool (Flyway, Liquibase, custom) has not been confirmed. This document specifies the migration contract; tooling is a downstream decision.
- All migrations are written as **forward-only SQL scripts**. No rollback scripts.
- **Rationale:** In a production SaaS system, rollback scripts are dangerous because they may destroy data written after the migration. The correct pattern is to write a new forward migration that reverses the undesired change.

### 9.2 Migration Versioning

- Migration files follow the naming pattern: `V{YYYYMMDD}{HHmmss}__{schema}_{description}.sql`
  - Example: `V20260601143000__customer_add_loyalty_tier.sql`
- Each migration is scoped to a **single schema**. Cross-schema migrations are forbidden.
- Migrations are stored in a directory tree organized by schema: `migrations/{schema_name}/`.

### 9.3 Safe Migration Rules

All migrations must comply with the following rules to support zero-downtime deployments:

| Rule | Rationale |
|---|---|
| Never drop a column in the same migration that removes application code using it | Two-phase deploy required |
| Never rename a column — add new, migrate data, drop old in separate migrations | Prevents lock contention and breakage |
| New columns must be `NULL` or have a `DEFAULT` value | Avoids full table rewrite lock on large tables |
| Never add a non-concurrent index in a migration that runs under a lock | Use `CREATE INDEX CONCURRENTLY` |
| Never add a NOT NULL constraint without a prior backfill migration | Prevents failure on existing rows |
| Never modify an existing column type directly — use shadow column pattern | Prevents data loss |

### 9.4 Lock Management

- Migrations that require table-level locks must be scheduled during a maintenance window.
- Index creation always uses `CREATE INDEX CONCURRENTLY`.
- Large table backfills are done in batches (e.g., 10,000 rows per batch with a brief sleep between batches) to avoid I/O saturation.

### 9.5 Microservice Extraction Migration

- When a context is extracted to its own microservice/database:
  1. A new PostgreSQL database is provisioned.
  2. The schema's complete migration history is replayed against the new database to reach the same state.
  3. Data is migrated using `pg_dump --schema={schema}` + `pg_restore` with a brief write-pause window.
  4. The connection string in the application is switched atomically.
  5. The schema is dropped from the monolith database after a validation period.

---

## 10. Index Strategy

### 10.1 Mandatory Indexes (All Tables)

Every domain table must have the following indexes as a baseline:

| Index | Columns | Type | Purpose |
|---|---|---|---|
| Primary Key | `id` | B-tree (auto) | Unique row lookup |
| Tenant Filter | `(tenant_id, deleted_at)` | B-tree | Tenant-scoped list queries |
| Audit Lookup | `(created_by)` | B-tree | Audit trail queries |
| Soft Delete | `(deleted_at)` | B-tree partial (`WHERE deleted_at IS NULL`) | Active-record filtering |

### 10.2 Context-Specific Index Guidelines

**`customer` schema:**
- `(tenant_id, full_name)` — patient/customer name search
- `(tenant_id, phone_number)` — phone lookup (most frequent CRM lookup)
- GIN index on `extra_attributes` JSONB column — dynamic attribute search
- `(tenant_id, customer_source_id, created_at DESC)` — pipeline/funnel analysis

**`clinical` schema:**
- `(tenant_id, patient_id, treatment_date DESC)` — treatment history timeline
- `(tenant_id, doctor_id, status)` — doctor workload view
- `(patient_id, deleted_at)` where `deleted_at IS NULL` — active patient records

**`scheduling` schema:**
- `(tenant_id, appointment_date, status)` — daily calendar view
- `(tenant_id, doctor_id, appointment_date)` — doctor schedule
- `(patient_id, appointment_date DESC)` — patient appointment history

**`bpm` schema:**
- `(tenant_id, workflow_definition_id, status)` — active instances per workflow
- `(tenant_id, assignee_id, status, due_at)` — user task inbox query
- `(tenant_id, process_instance_id)` — process trace

**`finance` schema:**
- `(tenant_id, invoice_date DESC)` — invoice listing
- `(tenant_id, patient_id, invoice_date DESC)` — patient billing history
- `(tenant_id, status, due_date)` — overdue invoice detection

**`notification` schema:**
- `(tenant_id, recipient_id, is_read, created_at DESC)` — notification inbox
- `(created_at)` with time-range partitioning — high-volume insert performance

**`outbox` schema:**
- `(published_at, created_at)` — relay polling query
- `(tenant_id, aggregate_type, aggregate_id)` — event correlation

### 10.3 Index Maintenance

- `REINDEX CONCURRENTLY` must be scheduled during low-traffic windows for bloated indexes.
- `pg_stat_user_indexes` must be reviewed monthly to identify unused indexes for removal.
- Indexes unused for 90 days are candidates for removal after a cross-team review.

### 10.4 Full-Text Search

- Patient name and contact search uses PostgreSQL `pg_trgm` trigram indexes (`GIN`) for fuzzy matching.
- **UNKNOWN-13:** Whether a dedicated search engine (Elasticsearch / OpenSearch) is required for advanced search — deferred to ARCHITECTURE_SPECIFICATION.md.

---

## 11. Reporting Projection Strategy

### 11.1 Philosophy

Reporting must never query operational (OLTP) schemas directly in production. Doing so creates resource contention, couples reporting requirements to the data model, and violates context sovereignty.

### 11.2 Reporting Schema

- A dedicated `reporting` schema holds **read-only, denormalized projection tables** built for analytical query patterns.
- The `reporting` schema is the only location where cross-context data may be joined and stored.
- All tables in `reporting` are **append-only or full-replace projections** — they are never the source of truth.

### 11.3 Projection Population

Projections are populated via one of two mechanisms:

| Mechanism | When to Use |
|---|---|
| **Event-driven projection** | Near-real-time reporting (e.g., daily KPI dashboard). A projection consumer subscribes to domain events from the outbox and updates the projection table incrementally. |
| **Scheduled ETL job** | Batch reporting (e.g., monthly revenue reports). A nightly job reads from operational schemas via a read-replica and writes to `reporting`. |

### 11.4 Known Reporting Projections (INFERRED)

| Projection Table | Source Contexts | Update Mechanism | Purpose |
|---|---|---|---|
| `reporting.daily_revenue_summary` | `finance` | Scheduled ETL | Revenue dashboard |
| `reporting.patient_journey_snapshot` | `customer`, `clinical`, `scheduling` | Event-driven | Patient 360 view |
| `reporting.staff_kpi_summary` | `hr`, `bpm`, `clinical` | Scheduled ETL | KPI reporting |
| `reporting.campaign_conversion_funnel` | `crm`, `customer` | Event-driven | Marketing analytics |
| `reporting.appointment_utilization` | `scheduling`, `clinical` | Event-driven | Capacity planning |
| `reporting.treatment_outcome_summary` | `clinical` | Scheduled ETL | Clinical quality reporting |
| `reporting.ticket_resolution_metrics` | `support` | Event-driven | Customer support KPIs |

### 11.5 Projection Freshness

- Event-driven projections target a freshness SLA of ≤ 5 minutes.
- Scheduled ETL projections are updated nightly and labelled with `last_refreshed_at`.
- All projection tables carry a `projection_version` and `source_event_id` column for traceability.

### 11.6 Read Replica

- All reporting queries must be directed to a **PostgreSQL read replica**, never the primary.
- Connection routing is enforced at the connection pool layer (e.g., PgBouncer pool targeting read replica).
- **UNKNOWN-14:** Whether a dedicated OLAP store (TimescaleDB, Redshift, BigQuery) is planned for long-term analytics — deferred to MICROSERVICE_EVOLUTION_PLAN.md.

---

## 12. Cross-Context Reference Rules

### 12.1 Core Rule

> **No cross-schema foreign key constraints exist in the database. Period.**

All cross-context relationships are expressed as application-layer UUID references. Referential integrity across contexts is the responsibility of the domain layer, not the database.

### 12.2 Reference Naming Convention

When an entity in Context A stores a reference to an entity in Context B:

- Column name pattern: `{source_context_short}_{entity}_{role}_id`
- Examples:
  - `iam_user_id` — reference to `iam.users.id`
  - `customer_patient_id` — reference to `customer.patients.id`
  - `catalog_service_id` — reference to `catalog.services.id`
- The column type is always `uuid NOT NULL` (or `uuid NULL` if the reference is optional).
- A descriptive comment on the column must state the target context and table.

### 12.3 Reference Validation

- **Write-time validation:** Before inserting or updating a cross-context reference, the application layer must call the target context's repository to verify existence. This is an **anti-corruption layer** call.
- **INFERRED:** An in-process call is acceptable in Modular Monolith phase. In Microservice phase, this becomes an API call or a local replica lookup.
- **Read-time resolution:** When resolving a cross-context reference for display (e.g., showing doctor name on appointment), the calling context issues a separate query to the target context's read model, never a JOIN across schemas.

### 12.4 Phantom Reference Risk

- Because there are no FK constraints, a referenced entity can be soft-deleted without the referencing context being aware.
- This is mitigated by:
  1. Domain events: the owning context publishes a `{Entity}SoftDeleted` event.
  2. Subscribers update their local state (e.g., marking the appointment as "patient deleted").
  3. A nightly cross-context consistency check job detects orphaned references and alerts operators.

### 12.5 Reference Catalog (INFERRED)

The following cross-context references have been identified from the service layer:

| From Context.Table | Reference Column | Points To Context.Table |
|---|---|---|
| `scheduling.appointments` | `customer_patient_id` | `customer.patients` |
| `scheduling.appointments` | `iam_doctor_id` | `iam.users` |
| `clinical.treatment_history` | `customer_patient_id` | `customer.patients` |
| `clinical.treatment_history` | `scheduling_appointment_id` | `scheduling.appointments` |
| `clinical.treatment_history` | `catalog_service_id` | `catalog.services` |
| `finance.invoices` | `customer_patient_id` | `customer.patients` |
| `finance.invoice_items` | `catalog_service_id` | `catalog.services` |
| `finance.invoice_items` | `catalog_product_id` | `catalog.products` |
| `bpm.workflow_instances` | `customer_patient_id` | `customer.patients` |
| `bpm.task_assignments` | `iam_user_id` | `iam.users` |
| `crm.campaigns` | `iam_user_id` (owner) | `iam.users` |
| `support.tickets` | `customer_patient_id` | `customer.patients` |
| `hr.timekeeping_records` | `iam_user_id` | `iam.users` |

> **UNKNOWN-15:** The full cross-context reference catalog must be completed from CONTEXT_MAP.md. The above is reverse-engineered from service and model directories.

---

## 13. Data Ownership Rules

### 13.1 Ownership Principle

Every piece of data has **exactly one owning context**. The owning context is the single writer. All other contexts are readers (via events or read APIs) — they never write to data they do not own.

### 13.2 Data Ownership Table

| Domain Concept | Owning Context | Canonical Table | Other Contexts May… |
|---|---|---|---|
| User identity & credentials | `iam` | `iam.users` | Store `iam_user_id` reference only |
| Organization / Clinic profile | `iam` | `iam.organizations` | Store `tenant_id` only |
| Patient / Customer profile | `customer` | `customer.patients` | Reference by UUID, cache display name locally |
| Patient medical history | `clinical` | `clinical.treatment_history` | Read via event projection |
| Treatment services (catalog) | `catalog` | `catalog.services` | Reference `catalog_service_id` |
| Products (catalog) | `catalog` | `catalog.products` | Reference `catalog_product_id` |
| Appointment booking | `scheduling` | `scheduling.appointments` | Reference `scheduling_appointment_id` |
| Financial transactions | `finance` | `finance.transactions` | Reference for reconciliation only |
| Invoices | `finance` | `finance.invoices` | No direct write access |
| Business process definitions | `bpm` | `bpm.process_definitions` | Trigger via command API only |
| Workflow instances | `bpm` | `bpm.workflow_instances` | Observe via events |
| Notifications | `notification` | `notification.messages` | Publish events to trigger sending |
| CRM campaigns | `crm` | `crm.campaigns` | Reference by UUID |
| Employee / Staff record | `hr` | `hr.employees` | Reference `iam_user_id` which maps 1:1 |
| Inventory levels | `inventory` | `inventory.stock_levels` | Reference for availability checks |
| Tickets / Support cases | `support` | `support.tickets` | Reference by UUID |
| KPI definitions & targets | `hr` | `hr.kpi_definitions` | Read via reporting projection |
| Audit log (platform-wide) | `iam` | `iam.audit_log` | Never written to directly by other contexts |

### 13.3 Shared Reference Data

Certain reference data (e.g., geographic area codes, currency codes) is owned by `system_config` and read by all contexts. These are:
- Read-only lookups loaded at application startup.
- **Never written to by non-`system_config` contexts.**
- Cached at the application layer to avoid repeated DB calls.

### 13.4 Data Residency

- **UNKNOWN-16:** Whether CareFollow is required to comply with Vietnamese data residency laws (data stored on Vietnamese soil). This affects cloud region selection and backup storage location.

---

## 14. Unknown Registry

The following decisions are explicitly deferred and must be resolved before the system enters production. Each item has an owner and a dependency.

| ID | Description | Blocking | Resolution Dependency |
|---|---|---|---|
| UNKNOWN-01 | Exact boundary between `crm.Contact` and `customer.Patient` — overlap unresolved | Context Map, API design | CONTEXT_MAP.md |
| UNKNOWN-02 | SocialCRM (Zalo, Facebook) — dedicated `social_integration` schema or part of `crm` | Schema creation | CONTEXT_MAP.md |
| UNKNOWN-03 | `created_by_type` discriminator (human/system/integration) in audit columns | Audit reporting | DDD_MODEL.md |
| UNKNOWN-04 | Data retention periods for clinical/medical records under Vietnamese law | Purge job design | ARCHITECTURE_SPECIFICATION.md + Legal |
| UNKNOWN-05 | GDPR / PDPD hard-erasure obligation for patient PII | Hard-delete workflow | ARCHITECTURE_SPECIFICATION.md + Legal |
| UNKNOWN-06 | Row-Level Security (RLS) as Phase 1 requirement vs. Phase 2 hardening | Security posture | ARCHITECTURE_SPECIFICATION.md |
| UNKNOWN-07 | Platform operator cross-tenant read access scope and authorization model | Super-admin design | ARCHITECTURE_SPECIFICATION.md |
| UNKNOWN-08 | Tenant-specific vs. shared product/service catalog model | `catalog` schema design | DDD_MODEL.md |
| UNKNOWN-09 | Message broker technology (Kafka, RabbitMQ, AWS SQS, etc.) | Outbox relay implementation | MICROSERVICE_EVOLUTION_PLAN.md |
| UNKNOWN-10 | Formal RPO/RTO SLA targets | Backup tier design | ARCHITECTURE_SPECIFICATION.md |
| UNKNOWN-11 | Encryption key management provider (AWS KMS, Vault, etc.) | Backup encryption | ARCHITECTURE_SPECIFICATION.md |
| UNKNOWN-12 | Database migration tooling (Flyway, Liquibase, custom) | Migration pipeline | MICROSERVICE_EVOLUTION_PLAN.md |
| UNKNOWN-13 | Dedicated full-text/fuzzy search engine requirement | Search feature design | ARCHITECTURE_SPECIFICATION.md |
| UNKNOWN-14 | Long-term OLAP store requirement (TimescaleDB, BigQuery, Redshift) | Reporting Phase 2 | MICROSERVICE_EVOLUTION_PLAN.md |
| UNKNOWN-15 | Complete cross-context reference catalog | Cross-context validation | CONTEXT_MAP.md |
| UNKNOWN-16 | Vietnamese data residency compliance requirement | Infrastructure region | ARCHITECTURE_SPECIFICATION.md + Legal |

---

## Appendix A — Schema Summary Reference Card

| Schema | Context | Phase 1 Location | Phase 2 Status |
|---|---|---|---|
| `iam` | Identity & Access | Shared cluster | Extract first |
| `customer` | Customer / Patient | Shared cluster | Extract with `clinical` |
| `clinical` | Clinical / Medical | Shared cluster | Extract with `customer` |
| `scheduling` | Scheduling | Shared cluster | Extract with `clinical` |
| `bpm` | Business Process | Shared cluster | Standalone service |
| `crm` | CRM & Campaign | Shared cluster | Standalone service |
| `communication` | Communication | Shared cluster | Standalone service |
| `finance` | Finance | Shared cluster | Extract for compliance |
| `hr` | Human Resources | Shared cluster | Standalone service |
| `catalog` | Product/Service Catalog | Shared cluster | Shared service |
| `inventory` | Inventory & Warehouse | Shared cluster | Standalone service |
| `support` | Ticket & Warranty | Shared cluster | Standalone service |
| `notification` | Notification | Shared cluster | Standalone service |
| `reporting` | Reporting Projections | Read replica | Dedicated analytical store |
| `system_config` | System Configuration | Shared cluster | Platform service |
| `outbox` | Event Outbox (infra) | Shared cluster | Replaced by broker in Phase 2 |

---

## Appendix B — Column Standard Template

Naming and typing standards for column categories used across all schemas:

| Category | Naming Pattern | PostgreSQL Type |
|---|---|---|
| Primary Key | `id` | `uuid NOT NULL PRIMARY KEY` |
| Cross-context reference | `{ctx}_{entity}_id` | `uuid NOT NULL` or `uuid NULL` |
| Tenant discriminator | `tenant_id` | `uuid NOT NULL` |
| Business natural key | `code`, `reference_number` | `varchar(64) NOT NULL` |
| Human-readable name | `name`, `display_name` | `varchar(255) NOT NULL` |
| Free-form text | `description`, `notes` | `text NULL` |
| Status discriminator | `status` | `varchar(50) NOT NULL` (enum-like) |
| Money / Currency | `amount` | `numeric(18, 2) NOT NULL` |
| Boolean flag | `is_{adjective}` | `boolean NOT NULL DEFAULT false` |
| Timestamp (business) | `{event}_at` | `timestamptz NOT NULL` or `NULL` |
| Timestamp (audit) | `created_at`, `updated_at`, `deleted_at` | `timestamptz` — see §4 |
| Actor reference | `created_by`, `updated_by`, `deleted_by` | `uuid` — see §4 |
| Dynamic attributes | `extra_attributes` | `jsonb NULL` |
| Optimistic lock | `row_version` | `integer NOT NULL DEFAULT 1` |

---

*End of DATABASE_STRATEGY.md v1.0.0*
*Next review: Upon receipt of ARCHITECTURE_SPECIFICATION.md, CONTEXT_MAP.md, DDD_MODEL.md, MICROSERVICE_EVOLUTION_PLAN.md*
