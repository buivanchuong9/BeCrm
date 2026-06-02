# CRM_DATABASE.md
## CareFollow Platform — CRM Bounded Context: Database Design

**Version:** 1.0.0
**Status:** DRAFT — Pending DDD_MODEL.md confirmation
**Scope:** `crm` PostgreSQL schema only
**Date:** 2026-06-01

> **Source Notice:** This document is reverse-engineered from `src/model/`, `src/services/`, and `src/configs/urls.ts` in the CRM frontend codebase. All claims are tagged **CONFIRMED**, **INFERRED**, or **UNKNOWN**. Receipt of `DDD_MODEL.md` and `CONTEXT_MAP.md` is required to resolve all UNKNOWN items before production migration.

---

## Table of Contents

1. [Context Overview](#1-context-overview)
2. [Aggregate Analysis](#2-aggregate-analysis)
3. [ERD — Mermaid](#3-erd--mermaid)
4. [Table Design](#4-table-design)
5. [SQL DDL](#5-sql-ddl)
6. [Index Strategy](#6-index-strategy)
7. [Audit Strategy](#7-audit-strategy)
8. [Soft Delete Strategy](#8-soft-delete-strategy)
9. [Prisma Schema](#9-prisma-schema)
10. [Unknown Registry](#10-unknown-registry)

---

## 1. Context Overview

### 1.1 Purpose

The **CRM context** (`crm` schema) owns all entities related to proactive sales, follow-up campaigns, contact relationship management, and marketing automation within the CareFollow platform.

It is a **distinct bounded context** from:
- `customer` — owns the canonical patient/customer profile
- `iam` — owns user identity and authentication
- `scheduling` — owns appointment booking
- `communication` — owns notification delivery mechanics

The CRM context **consumes** data from those contexts via UUID references and domain events. It **never joins** across schemas.

### 1.2 Responsibilities

| Responsibility | CONFIRMED / INFERRED |
|---|---|
| Sales campaign lifecycle management | CONFIRMED |
| Opportunity (deal) tracking per campaign | CONFIRMED |
| B2B contact (người liên hệ) management | CONFIRMED |
| Contact pipeline & kanban status configuration | CONFIRMED |
| Dynamic attribute definitions for contacts | CONFIRMED |
| Care history log (chăm sóc khách hàng) | CONFIRMED |
| Marketing automation workflow | CONFIRMED |
| Campaign customer scoring configuration | INFERRED |
| Employee sales point configuration | INFERRED |
| SLA configuration per campaign approach | INFERRED |

### 1.3 Out of Scope for This Context

| Concept | Belongs To |
|---|---|
| Customer / Patient canonical profile | `customer` schema |
| Appointment booking | `scheduling` schema |
| Invoice / payment processing | `finance` schema |
| Email / SMS / Zalo delivery engine | `communication` schema |
| User authentication & roles | `iam` schema |
| BPM workflow execution | `bpm` schema |

### 1.4 Language (Ubiquitous Language)

| Vietnamese Term | English DDD Term | Meaning |
|---|---|---|
| Chiến dịch bán hàng | Campaign | A structured sales outreach initiative with defined approach steps |
| Bước tiếp cận | CampaignApproach | An ordered step within a Campaign defining the outreach method |
| Hoạt động | CampaignActivity | A concrete action within a CampaignApproach |
| Cơ hội | Opportunity | A potential deal between a Campaign and a Customer |
| Người liên hệ | Contact | A B2B contact person linked to one or more customers |
| Pipeline liên hệ | ContactPipeline | A Kanban board configuration for managing Contacts |
| Trạng thái liên hệ | ContactStatus | A column/stage within a ContactPipeline |
| Lịch sử chăm sóc | CareHistory | A logged care/follow-up interaction with a customer |
| Chiến dịch chăm sóc | CareCategory | A care campaign classification label |
| Marketing tự động | MarketingAutomation | An automated workflow triggered by customer behavior |

---

## 2. Aggregate Analysis

### 2.1 Aggregate Map

```
crm schema
│
├── [AG-01] Campaign Aggregate
│   ├── Root:     campaigns
│   ├── Entities: campaign_approaches
│   │             campaign_activities
│   │             campaign_sales (sale assignment)
│   │             campaign_score_configs (customer point rules)
│   │             campaign_sale_point_configs (employee point rules)
│   │             campaign_sla_configs
│   └── Invariants:
│         • A Campaign must have at least one CampaignApproach before activation [INFERRED]
│         • Campaign.endDate must be after Campaign.startDate [INFERRED]
│         • Only one active divisionMethod per Campaign [INFERRED]
│
├── [AG-02] Opportunity Aggregate
│   ├── Root:     opportunities
│   ├── Entities: opportunity_processes (progress snapshots)
│   │             opportunity_exchanges (internal messages)
│   │             opportunity_viewers (access list)
│   │             opportunity_contacts (B2B contact link)
│   └── Invariants:
│         • Opportunity belongs to exactly one Campaign [CONFIRMED]
│         • Opportunity references either customerId OR contactId, not both [UNKNOWN-01]
│         • percent must be 0–100 [INFERRED]
│
├── [AG-03] Contact Aggregate
│   ├── Root:     contacts
│   ├── Entities: contact_extra_infos (dynamic attribute values)
│   │             contact_exchanges (communication log)
│   │             contact_customer_links (M:N to customer context)
│   └── Invariants:
│         • Contact phone must be unique per tenant [INFERRED]
│         • A Contact has exactly one primary pipeline status [INFERRED]
│
├── [AG-04] ContactPipeline Aggregate
│   ├── Root:     contact_pipelines
│   ├── Entities: contact_statuses (kanban columns)
│   └── Invariants:
│         • ContactStatus.position must be unique within a Pipeline [INFERRED]
│         • Deleting a Pipeline requires migrating existing Contacts [UNKNOWN-02]
│
├── [AG-05] ContactAttributeDefinition Aggregate
│   ├── Root:     contact_attribute_definitions
│   └── Invariants:
│         • fieldName must be unique per tenant [INFERRED]
│         • A child attribute cannot itself have children (max 2 levels) [UNKNOWN-03]
│
├── [AG-06] CareHistory Aggregate
│   ├── Root:     care_histories
│   └── Invariants:
│         • Must reference either a Customer or Contact, not neither [INFERRED]
│         • CareHistory is immutable after creation [UNKNOWN-04]
│
├── [AG-07] MarketingAutomation Aggregate
│   ├── Root:     marketing_automations
│   ├── Entities: ma_nodes
│   │             ma_node_configs
│   │             ma_customers (enrolled customers)
│   │             ma_mappings (campaign linking)
│   └── Invariants:
│         • An active MA cannot be structurally edited [INFERRED]
│         • A customer can be enrolled in at most one active MA [UNKNOWN-05]
│
└── [AG-08] CareCategory Aggregate  (simple reference data)
    ├── Root:     care_categories
    └── Invariants:
          • name must be unique per tenant [INFERRED]
```

### 2.2 Cross-Context References

| CRM Entity | Reference Column | Target Context | Target Entity |
|---|---|---|---|
| `opportunities` | `customer_id` | `customer` | `patients` |
| `opportunities` | `iam_owner_id` (employee) | `iam` | `users` |
| `opportunities` | `iam_sale_id` | `iam` | `users` |
| `opportunities` | `crm_marketing_source_id` | `crm` (internal) | `marketing_sources` |
| `campaigns` | `iam_owner_id` | `iam` | `users` |
| `campaign_sales` | `iam_user_id` | `iam` | `users` |
| `contacts` | `iam_owner_id` | `iam` | `users` |
| `contact_customer_links` | `customer_id` | `customer` | `patients` |
| `care_histories` | `customer_id` | `customer` | `patients` |
| `care_histories` | `iam_employee_id` | `iam` | `users` |
| `ma_customers` | `customer_id` | `customer` | `patients` |
| `opportunity_exchanges` | `iam_author_id` | `iam` | `users` |
| `contact_exchanges` | `iam_author_id` | `iam` | `users` |

> All columns above are `uuid NOT NULL` or `uuid NULL` with **no foreign key constraint**. Referential integrity is enforced at the application layer.

---

## 3. ERD — Mermaid

```mermaid
erDiagram

  %% ─── AG-01: Campaign ───────────────────────────────────────
  campaigns {
    uuid        id                  PK
    uuid        tenant_id           "FK→iam.org (uuid only)"
    varchar(20) code                UK
    varchar(255) name
    varchar(50) type
    varchar(50) status
    varchar(50) sale_distribution_type
    integer     division_method
    varchar(500) cover_url
    date        start_date
    date        end_date
    integer     position
    uuid        iam_owner_id        "→iam.users"
    text        approach_note
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  campaign_approaches {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_id         FK
    varchar(255) name
    integer     step
    integer     sla_hours
    jsonb       activities
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  campaign_activities {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_approach_id FK
    varchar(255) name
    integer     position
    jsonb       config
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
    integer     row_version
  }

  campaign_sales {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_id         FK
    uuid        iam_user_id         "→iam.users"
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
  }

  campaign_score_configs {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_id         FK
    varchar(100) action_type
    integer     score_value
    jsonb       condition
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    integer     row_version
  }

  campaign_sla_configs {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_id         FK
    uuid        campaign_approach_id FK
    integer     sla_hours
    jsonb       escalation_rule
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    integer     row_version
  }

  %% ─── AG-02: Opportunity ────────────────────────────────────
  opportunities {
    uuid        id                  PK
    uuid        tenant_id
    uuid        campaign_id         FK
    uuid        campaign_approach_id FK
    uuid        contact_pipeline_id FK
    varchar(50) ref_type            "customer|contact"
    uuid        customer_id         "→customer.patients"
    uuid        contact_id          FK
    uuid        iam_owner_id        "→iam.users"
    uuid        iam_sale_id         "→iam.users"
    uuid        crm_source_id       FK
    numeric(18,2) expected_revenue
    date        start_date
    date        end_date
    smallint    percent
    varchar(50) status
    text        note
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  opportunity_processes {
    uuid        id                  PK
    uuid        tenant_id
    uuid        opportunity_id      FK
    uuid        campaign_approach_id FK
    text        note
    smallint    percent
    varchar(50) status
    timestamptz occurred_at
    uuid        created_by
    timestamptz deleted_at
    uuid        deleted_by
  }

  opportunity_exchanges {
    uuid        id                  PK
    uuid        tenant_id
    uuid        opportunity_id      FK
    uuid        iam_author_id       "→iam.users"
    text        content
    text        content_delta
    jsonb       media_urls
    timestamptz created_at
    timestamptz deleted_at
    uuid        deleted_by
  }

  opportunity_viewers {
    uuid        id                  PK
    uuid        tenant_id
    uuid        opportunity_id      FK
    uuid        iam_user_id         "→iam.users"
    timestamptz created_at
  }

  opportunity_contacts {
    uuid        id                  PK
    uuid        tenant_id
    uuid        opportunity_id      FK
    uuid        contact_id          FK
    boolean     is_primary
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
  }

  %% ─── AG-03: Contact ────────────────────────────────────────
  contacts {
    uuid        id                  PK
    uuid        tenant_id
    varchar(255) name
    varchar(50) phone
    varchar(255) email
    text        note
    varchar(500) avatar_url
    varchar(500) card_visit_front_url
    varchar(500) card_visit_back_url
    varchar(100) department
    uuid        iam_owner_id        "→iam.users"
    uuid        contact_pipeline_id FK
    uuid        contact_status_id   FK
    uuid        primary_customer_id "→customer.patients"
    jsonb       extra_attributes
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  contact_extra_infos {
    uuid        id                  PK
    uuid        tenant_id
    uuid        contact_id          FK
    uuid        attribute_def_id    FK
    text        value
    timestamptz created_at
    timestamptz updated_at
    uuid        updated_by
  }

  contact_exchanges {
    uuid        id                  PK
    uuid        tenant_id
    uuid        contact_id          FK
    uuid        iam_author_id       "→iam.users"
    text        content
    text        content_delta
    jsonb       media_urls
    timestamptz created_at
    timestamptz deleted_at
    uuid        deleted_by
  }

  contact_customer_links {
    uuid        id                  PK
    uuid        tenant_id
    uuid        contact_id          FK
    uuid        customer_id         "→customer.patients"
    boolean     is_primary
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
  }

  %% ─── AG-04: ContactPipeline ─────────────────────────────────
  contact_pipelines {
    uuid        id                  PK
    uuid        tenant_id
    varchar(255) name
    integer     position
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  contact_statuses {
    uuid        id                  PK
    uuid        tenant_id
    uuid        contact_pipeline_id FK
    varchar(255) name
    integer     position
    varchar(30) color_hex
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
  }

  %% ─── AG-05: ContactAttributeDefinition ─────────────────────
  contact_attribute_definitions {
    uuid        id                  PK
    uuid        tenant_id
    uuid        parent_id           "self-ref FK"
    varchar(100) name
    varchar(100) field_name         UK
    varchar(30) data_type
    boolean     is_required
    boolean     is_readonly
    boolean     is_unique
    jsonb       options
    varchar(30) number_format
    integer     position
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  %% ─── AG-06: CareHistory ────────────────────────────────────
  care_histories {
    uuid        id                  PK
    uuid        tenant_id
    uuid        care_category_id    FK
    varchar(50) object_type         "customer|contact"
    uuid        customer_id         "→customer.patients"
    uuid        contact_id          FK
    uuid        iam_employee_id     "→iam.users"
    text        content
    smallint    status
    timestamptz occurred_at
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
    uuid        deleted_by
  }

  %% ─── AG-07: MarketingAutomation ────────────────────────────
  marketing_automations {
    uuid        id                  PK
    uuid        tenant_id
    varchar(255) name
    varchar(50) status
    jsonb       trigger_config
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  ma_nodes {
    uuid        id                  PK
    uuid        tenant_id
    uuid        marketing_automation_id FK
    varchar(100) node_type
    integer     position_x
    integer     position_y
    jsonb       node_config
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
  }

  ma_customers {
    uuid        id                  PK
    uuid        tenant_id
    uuid        marketing_automation_id FK
    uuid        customer_id         "→customer.patients"
    varchar(50) status
    jsonb       result_data
    timestamptz enrolled_at
    timestamptz completed_at
    timestamptz created_at
    uuid        created_by
    timestamptz deleted_at
  }

  ma_mappings {
    uuid        id                  PK
    uuid        tenant_id
    uuid        marketing_automation_id FK
    uuid        campaign_id         FK
    jsonb       mapping_config
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
  }

  %% ─── AG-08: CareCategory ────────────────────────────────────
  care_categories {
    uuid        id                  PK
    uuid        tenant_id
    varchar(255) name
    integer     position
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
    integer     row_version
  }

  %% ─── Reference Data ─────────────────────────────────────────
  marketing_sources {
    uuid        id                  PK
    uuid        tenant_id
    varchar(255) name
    varchar(30) source_type
    integer     position
    timestamptz created_at
    uuid        created_by
    timestamptz updated_at
    uuid        updated_by
    timestamptz deleted_at
    uuid        deleted_by
  }

  %% ─── Relationships ──────────────────────────────────────────
  campaigns                   ||--o{ campaign_approaches         : "has"
  campaigns                   ||--o{ campaign_sales              : "assigns"
  campaigns                   ||--o{ campaign_score_configs      : "configures"
  campaigns                   ||--o{ campaign_sla_configs        : "defines"
  campaign_approaches         ||--o{ campaign_activities         : "contains"
  campaign_approaches         ||--o{ campaign_sla_configs        : "governs"
  campaigns                   ||--o{ opportunities               : "generates"
  campaign_approaches         ||--o{ opportunities               : "classifies"
  opportunities               ||--o{ opportunity_processes       : "tracks"
  opportunities               ||--o{ opportunity_exchanges       : "holds"
  opportunities               ||--o{ opportunity_viewers         : "grants"
  opportunities               ||--o{ opportunity_contacts        : "links"
  contacts                    ||--o{ opportunity_contacts        : "linked-by"
  contact_pipelines           ||--o{ contact_statuses            : "defines"
  contact_pipelines           ||--o{ contacts                    : "stages"
  contact_statuses            ||--o{ contacts                    : "positions"
  contacts                    ||--o{ contact_extra_infos         : "has"
  contacts                    ||--o{ contact_exchanges           : "logs"
  contacts                    ||--o{ contact_customer_links      : "connects"
  contact_attribute_definitions ||--o{ contact_extra_infos       : "defines"
  contact_attribute_definitions ||--o| contact_attribute_definitions : "parent"
  care_categories             ||--o{ care_histories              : "classifies"
  contacts                    ||--o{ care_histories              : "subject-of"
  marketing_automations       ||--o{ ma_nodes                    : "contains"
  marketing_automations       ||--o{ ma_customers                : "enrolls"
  marketing_automations       ||--o{ ma_mappings                 : "links"
  campaigns                   ||--o{ ma_mappings                 : "mapped-by"
  marketing_sources           ||--o{ opportunities               : "tracks"
```

---

## 4. Table Design

### 4.1 Naming Conventions

| Rule | Pattern | Example |
|---|---|---|
| Table name | `plural_snake_case` | `campaign_approaches` |
| Primary key | `id` | `id uuid` |
| Foreign key (same schema) | `{table_singular}_id` | `campaign_id` |
| Cross-context reference | `{context}_{entity}_id` | `customer_id`, `iam_owner_id` |
| Boolean columns | `is_{adjective}` | `is_primary`, `is_required` |
| Timestamp (event) | `{event}_at` | `enrolled_at`, `occurred_at` |
| Status discriminator | `status` (varchar, enum-like) | `'draft'|'active'|'completed'` |
| Soft delete | `deleted_at` (nullable) | — |

### 4.2 Status Value Sets

> **UNKNOWN-06:** Exact status values are not in DDD_MODEL.md. Values below are INFERRED from frontend service calls.

| Table | Column | Known Values (INFERRED) |
|---|---|---|
| `campaigns` | `status` | `draft`, `active`, `paused`, `completed`, `cancelled` |
| `campaigns` | `type` | UNKNOWN-07 |
| `campaigns` | `sale_distribution_type` | UNKNOWN-08 |
| `campaigns` | `division_method` | integer enum — UNKNOWN-09 |
| `opportunities` | `status` | UNKNOWN-10 (stored as integer in current system) |
| `opportunities` | `ref_type` | `customer`, `contact` |
| `marketing_automations` | `status` | `draft`, `active`, `paused`, `archived` |
| `care_histories` | `status` | integer enum — UNKNOWN-11 |
| `ma_customers` | `status` | UNKNOWN-12 |

### 4.3 JSONB Column Contracts

| Table | Column | Shape (INFERRED) |
|---|---|---|
| `campaign_approaches` | `activities` | `[{ "type": string, "description": string }]` |
| `campaign_score_configs` | `condition` | `{ "field": string, "operator": string, "value": any }` |
| `campaign_sla_configs` | `escalation_rule` | UNKNOWN-13 |
| `opportunities` | — | no jsonb — structured columns preferred |
| `marketing_automations` | `trigger_config` | UNKNOWN-14 |
| `ma_nodes` | `node_config` | UNKNOWN-15 |
| `contact_attribute_definitions` | `options` | `[{ "value": string, "label": string }]` for SELECT type |
| `opportunity_exchanges` | `media_urls` | `[{ "url": string, "type": "image|video|file" }]` |

---

## 5. SQL DDL

```sql
-- ============================================================
-- CRM SCHEMA BOOTSTRAP
-- ============================================================

CREATE SCHEMA IF NOT EXISTS crm;

-- ─── Shared ENUM-like types (PostgreSQL custom types) ────────
-- UNKNOWN-06: Awaiting DDD_MODEL.md for confirmed status values.
-- Defined here as VARCHAR to remain flexible until confirmed.

-- ============================================================
-- AG-08: CareCategory  (referenced by CareHistory — define first)
-- ============================================================
CREATE TABLE crm.care_categories (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    position        INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    row_version     INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_care_categories PRIMARY KEY (id),
    CONSTRAINT uq_care_categories_name_tenant
        UNIQUE (tenant_id, name)
        DEFERRABLE INITIALLY DEFERRED
    -- Note: partial unique enforced at application layer for soft-delete compat
);

COMMENT ON TABLE crm.care_categories IS 'AG-08: CrmCampaign — care follow-up category labels per tenant.';

-- ============================================================
-- Reference Data: marketing_sources
-- ============================================================
CREATE TABLE crm.marketing_sources (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    source_type     VARCHAR(30),        -- UNKNOWN-16: type enum values
    position        INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,

    CONSTRAINT pk_marketing_sources PRIMARY KEY (id)
);

COMMENT ON TABLE crm.marketing_sources IS 'Reference: Lead source catalogue (marketingSource). Cross-ref: customerMarketingLead API.';

-- ============================================================
-- AG-04: ContactPipeline + ContactStatus
-- ============================================================
CREATE TABLE crm.contact_pipelines (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    position        INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    row_version     INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_contact_pipelines PRIMARY KEY (id)
);

COMMENT ON TABLE crm.contact_pipelines IS 'AG-04: Kanban pipeline configuration for B2B Contacts.';

CREATE TABLE crm.contact_statuses (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,
    contact_pipeline_id UUID            NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    position            INTEGER         NOT NULL DEFAULT 0,
    color_hex           VARCHAR(30),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID            NOT NULL,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by          UUID            NOT NULL,
    deleted_at          TIMESTAMPTZ,
    deleted_by          UUID,

    CONSTRAINT pk_contact_statuses PRIMARY KEY (id),
    CONSTRAINT fk_contact_statuses_pipeline
        FOREIGN KEY (contact_pipeline_id)
        REFERENCES crm.contact_pipelines(id)
        ON DELETE RESTRICT
);

COMMENT ON TABLE crm.contact_statuses IS 'AG-04 entity: Kanban column/status within a ContactPipeline.';

-- ============================================================
-- AG-05: ContactAttributeDefinition
-- ============================================================
CREATE TABLE crm.contact_attribute_definitions (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    parent_id       UUID,               -- self-referential, max 2 levels [UNKNOWN-03]
    name            VARCHAR(100)    NOT NULL,
    field_name      VARCHAR(100)    NOT NULL,
    data_type       VARCHAR(30)     NOT NULL,  -- text|number|date|select|boolean
    is_required     BOOLEAN         NOT NULL DEFAULT false,
    is_readonly     BOOLEAN         NOT NULL DEFAULT false,
    is_unique       BOOLEAN         NOT NULL DEFAULT false,
    options         JSONB,              -- for SELECT type: [{value, label}]
    number_format   VARCHAR(30),
    position        INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    row_version     INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_contact_attribute_definitions PRIMARY KEY (id),
    CONSTRAINT fk_contact_attr_def_parent
        FOREIGN KEY (parent_id)
        REFERENCES crm.contact_attribute_definitions(id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_contact_attr_def_field_name
        UNIQUE (tenant_id, field_name)
        -- partial unique (where deleted_at IS NULL) enforced at app layer
);

COMMENT ON TABLE crm.contact_attribute_definitions IS 'AG-05: Dynamic attribute schema for Contact entities, configurable per tenant.';

-- ============================================================
-- AG-03: Contact
-- ============================================================
CREATE TABLE crm.contacts (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,
    name                VARCHAR(255)    NOT NULL,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    note                TEXT,
    avatar_url          VARCHAR(500),
    card_visit_front_url VARCHAR(500),
    card_visit_back_url VARCHAR(500),
    department          VARCHAR(100),
    iam_owner_id        UUID,           -- → iam.users (employee owner)
    contact_pipeline_id UUID,
    contact_status_id   UUID,
    primary_customer_id UUID,           -- → customer.patients (cross-context, no FK)
    extra_attributes    JSONB,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          UUID            NOT NULL,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by          UUID            NOT NULL,
    deleted_at          TIMESTAMPTZ,
    deleted_by          UUID,
    row_version         INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_contacts PRIMARY KEY (id),
    CONSTRAINT fk_contacts_pipeline
        FOREIGN KEY (contact_pipeline_id)
        REFERENCES crm.contact_pipelines(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_contacts_status
        FOREIGN KEY (contact_status_id)
        REFERENCES crm.contact_statuses(id)
        ON DELETE SET NULL
    -- No FK on iam_owner_id, primary_customer_id — cross-context UUID refs
);

COMMENT ON TABLE crm.contacts IS 'AG-03: B2B Contact (người liên hệ). Linked to iam.users (owner) and customer.patients via UUID refs.';
COMMENT ON COLUMN crm.contacts.iam_owner_id IS 'Cross-context ref → iam.users.id. No FK constraint.';
COMMENT ON COLUMN crm.contacts.primary_customer_id IS 'Cross-context ref → customer.patients.id. No FK constraint.';

CREATE TABLE crm.contact_extra_infos (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    contact_id          UUID        NOT NULL,
    attribute_def_id    UUID        NOT NULL,
    value               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          UUID        NOT NULL,

    CONSTRAINT pk_contact_extra_infos PRIMARY KEY (id),
    CONSTRAINT fk_contact_extra_infos_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_contact_extra_infos_attr_def
        FOREIGN KEY (attribute_def_id)
        REFERENCES crm.contact_attribute_definitions(id)
        ON DELETE RESTRICT,
    CONSTRAINT uq_contact_extra_info_per_attr
        UNIQUE (contact_id, attribute_def_id)
);

COMMENT ON TABLE crm.contact_extra_infos IS 'AG-03 entity: EAV values for dynamic Contact attributes.';

CREATE TABLE crm.contact_exchanges (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    contact_id      UUID        NOT NULL,
    iam_author_id   UUID        NOT NULL,    -- → iam.users
    content         TEXT,
    content_delta   TEXT,
    media_urls      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,

    CONSTRAINT pk_contact_exchanges PRIMARY KEY (id),
    CONSTRAINT fk_contact_exchanges_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE
);

COMMENT ON COLUMN crm.contact_exchanges.iam_author_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

CREATE TABLE crm.contact_customer_links (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    contact_id      UUID        NOT NULL,
    customer_id     UUID        NOT NULL,   -- → customer.patients (cross-context)
    is_primary      BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NOT NULL,
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT pk_contact_customer_links PRIMARY KEY (id),
    CONSTRAINT fk_contact_customer_links_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_contact_customer_link
        UNIQUE (contact_id, customer_id)
);

COMMENT ON COLUMN crm.contact_customer_links.customer_id IS 'Cross-context ref → customer.patients.id. No FK constraint.';

-- ============================================================
-- AG-01: Campaign
-- ============================================================
CREATE TABLE crm.campaigns (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL,
    code                    VARCHAR(20)     NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    type                    VARCHAR(50),        -- UNKNOWN-07
    status                  VARCHAR(50)     NOT NULL DEFAULT 'draft',
    sale_distribution_type  VARCHAR(50),        -- UNKNOWN-08
    division_method         SMALLINT,           -- UNKNOWN-09: integer enum
    cover_url               VARCHAR(500),
    start_date              DATE,
    end_date                DATE,
    position                INTEGER         NOT NULL DEFAULT 0,
    iam_owner_id            UUID            NOT NULL, -- → iam.users
    approach_note           TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID            NOT NULL,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID            NOT NULL,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID,
    row_version             INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_campaigns PRIMARY KEY (id),
    CONSTRAINT uq_campaigns_code_tenant UNIQUE (tenant_id, code),
    CONSTRAINT ck_campaigns_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON COLUMN crm.campaigns.iam_owner_id IS 'Cross-context ref → iam.users.id (campaign owner/employee). No FK constraint.';

CREATE TABLE crm.campaign_approaches (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    campaign_id     UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    step            INTEGER         NOT NULL,
    sla_hours       INTEGER,
    activities      JSONB,          -- [{type, description}] — INFERRED structure
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    row_version     INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_campaign_approaches PRIMARY KEY (id),
    CONSTRAINT fk_campaign_approaches_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_campaign_approaches_step
        UNIQUE (campaign_id, step)
);

CREATE TABLE crm.campaign_activities (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL,
    campaign_approach_id    UUID            NOT NULL,
    name                    VARCHAR(255)    NOT NULL,
    position                INTEGER         NOT NULL DEFAULT 0,
    config                  JSONB,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID            NOT NULL,
    deleted_at              TIMESTAMPTZ,
    row_version             INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_campaign_activities PRIMARY KEY (id),
    CONSTRAINT fk_campaign_activities_approach
        FOREIGN KEY (campaign_approach_id)
        REFERENCES crm.campaign_approaches(id)
        ON DELETE CASCADE
);

CREATE TABLE crm.campaign_sales (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    campaign_id     UUID        NOT NULL,
    iam_user_id     UUID        NOT NULL,   -- → iam.users (salesperson)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NOT NULL,
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT pk_campaign_sales PRIMARY KEY (id),
    CONSTRAINT fk_campaign_sales_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_campaign_sales_user
        UNIQUE (campaign_id, iam_user_id)
);

COMMENT ON COLUMN crm.campaign_sales.iam_user_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

CREATE TABLE crm.campaign_score_configs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    campaign_id     UUID        NOT NULL,
    action_type     VARCHAR(100) NOT NULL,
    score_value     INTEGER     NOT NULL DEFAULT 0,
    condition       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID        NOT NULL,
    row_version     INTEGER     NOT NULL DEFAULT 1,

    CONSTRAINT pk_campaign_score_configs PRIMARY KEY (id),
    CONSTRAINT fk_campaign_score_configs_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE CASCADE
);

CREATE TABLE crm.campaign_sla_configs (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL,
    campaign_id             UUID        NOT NULL,
    campaign_approach_id    UUID,
    sla_hours               INTEGER     NOT NULL,
    escalation_rule         JSONB,      -- UNKNOWN-13
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID        NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by              UUID        NOT NULL,
    row_version             INTEGER     NOT NULL DEFAULT 1,

    CONSTRAINT pk_campaign_sla_configs PRIMARY KEY (id),
    CONSTRAINT fk_campaign_sla_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_campaign_sla_approach
        FOREIGN KEY (campaign_approach_id)
        REFERENCES crm.campaign_approaches(id)
        ON DELETE SET NULL
);

-- ============================================================
-- AG-02: Opportunity
-- ============================================================
CREATE TABLE crm.opportunities (
    id                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL,
    campaign_id             UUID            NOT NULL,
    campaign_approach_id    UUID,
    contact_pipeline_id     UUID,
    ref_type                VARCHAR(50)     NOT NULL DEFAULT 'customer', -- 'customer'|'contact'
    customer_id             UUID,           -- → customer.patients (cross-context)
    contact_id              UUID,           -- within crm (B2B type)
    iam_owner_id            UUID            NOT NULL, -- → iam.users (employee)
    iam_sale_id             UUID,           -- → iam.users (salesperson)
    crm_source_id           UUID,           -- → crm.marketing_sources
    expected_revenue        NUMERIC(18,2)   NOT NULL DEFAULT 0,
    start_date              DATE,
    end_date                DATE,
    percent                 SMALLINT        NOT NULL DEFAULT 0
                                CHECK (percent BETWEEN 0 AND 100),
    status                  VARCHAR(50)     NOT NULL DEFAULT 'open', -- UNKNOWN-10
    note                    TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by              UUID            NOT NULL,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by              UUID            NOT NULL,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID,
    row_version             INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_opportunities PRIMARY KEY (id),
    CONSTRAINT fk_opportunities_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_opportunities_approach
        FOREIGN KEY (campaign_approach_id)
        REFERENCES crm.campaign_approaches(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_opportunities_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_opportunities_source
        FOREIGN KEY (crm_source_id)
        REFERENCES crm.marketing_sources(id)
        ON DELETE SET NULL,
    -- Cross-context refs: customer_id, iam_owner_id, iam_sale_id — no FK
    CONSTRAINT ck_opportunities_ref
        CHECK (customer_id IS NOT NULL OR contact_id IS NOT NULL)
);

COMMENT ON COLUMN crm.opportunities.customer_id IS 'Cross-context ref → customer.patients.id. No FK constraint.';
COMMENT ON COLUMN crm.opportunities.iam_owner_id IS 'Cross-context ref → iam.users.id. No FK constraint.';
COMMENT ON COLUMN crm.opportunities.iam_sale_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

CREATE TABLE crm.opportunity_processes (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL,
    opportunity_id          UUID        NOT NULL,
    campaign_approach_id    UUID,
    note                    TEXT,
    percent                 SMALLINT    CHECK (percent BETWEEN 0 AND 100),
    status                  VARCHAR(50),    -- UNKNOWN-10
    occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID        NOT NULL,
    deleted_at              TIMESTAMPTZ,
    deleted_by              UUID,

    CONSTRAINT pk_opportunity_processes PRIMARY KEY (id),
    CONSTRAINT fk_opp_processes_opportunity
        FOREIGN KEY (opportunity_id)
        REFERENCES crm.opportunities(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_opp_processes_approach
        FOREIGN KEY (campaign_approach_id)
        REFERENCES crm.campaign_approaches(id)
        ON DELETE SET NULL
);

CREATE TABLE crm.opportunity_exchanges (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    opportunity_id  UUID        NOT NULL,
    iam_author_id   UUID        NOT NULL,   -- → iam.users
    content         TEXT,
    content_delta   TEXT,
    media_urls      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,

    CONSTRAINT pk_opportunity_exchanges PRIMARY KEY (id),
    CONSTRAINT fk_opp_exchanges_opportunity
        FOREIGN KEY (opportunity_id)
        REFERENCES crm.opportunities(id)
        ON DELETE CASCADE
);

COMMENT ON COLUMN crm.opportunity_exchanges.iam_author_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

CREATE TABLE crm.opportunity_viewers (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    opportunity_id  UUID        NOT NULL,
    iam_user_id     UUID        NOT NULL,   -- → iam.users
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_opportunity_viewers PRIMARY KEY (id),
    CONSTRAINT fk_opp_viewers_opportunity
        FOREIGN KEY (opportunity_id)
        REFERENCES crm.opportunities(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_opp_viewer UNIQUE (opportunity_id, iam_user_id)
);

COMMENT ON COLUMN crm.opportunity_viewers.iam_user_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

CREATE TABLE crm.opportunity_contacts (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    opportunity_id  UUID        NOT NULL,
    contact_id      UUID        NOT NULL,
    is_primary      BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID        NOT NULL,
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT pk_opportunity_contacts PRIMARY KEY (id),
    CONSTRAINT fk_opp_contacts_opportunity
        FOREIGN KEY (opportunity_id)
        REFERENCES crm.opportunities(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_opp_contacts_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_opp_contact UNIQUE (opportunity_id, contact_id)
);

-- ============================================================
-- AG-06: CareHistory
-- ============================================================
CREATE TABLE crm.care_histories (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    care_category_id    UUID,
    object_type         VARCHAR(50) NOT NULL CHECK (object_type IN ('customer', 'contact')),
    customer_id         UUID,           -- → customer.patients (cross-context)
    contact_id          UUID,
    iam_employee_id     UUID        NOT NULL, -- → iam.users
    content             TEXT,
    status              SMALLINT    NOT NULL DEFAULT 0, -- UNKNOWN-11
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID        NOT NULL,
    deleted_at          TIMESTAMPTZ,
    deleted_by          UUID,

    CONSTRAINT pk_care_histories PRIMARY KEY (id),
    CONSTRAINT fk_care_histories_category
        FOREIGN KEY (care_category_id)
        REFERENCES crm.care_categories(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_care_histories_contact
        FOREIGN KEY (contact_id)
        REFERENCES crm.contacts(id)
        ON DELETE SET NULL,
    CONSTRAINT ck_care_histories_target
        CHECK (customer_id IS NOT NULL OR contact_id IS NOT NULL)
);

COMMENT ON COLUMN crm.care_histories.customer_id IS 'Cross-context ref → customer.patients.id. No FK constraint.';
COMMENT ON COLUMN crm.care_histories.iam_employee_id IS 'Cross-context ref → iam.users.id. No FK constraint.';

-- ============================================================
-- AG-07: MarketingAutomation
-- ============================================================
CREATE TABLE crm.marketing_automations (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID            NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    status          VARCHAR(50)     NOT NULL DEFAULT 'draft',
    trigger_config  JSONB,          -- UNKNOWN-14
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by      UUID            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_by      UUID            NOT NULL,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID,
    row_version     INTEGER         NOT NULL DEFAULT 1,

    CONSTRAINT pk_marketing_automations PRIMARY KEY (id)
);

CREATE TABLE crm.ma_nodes (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL,
    marketing_automation_id UUID        NOT NULL,
    node_type               VARCHAR(100) NOT NULL,  -- UNKNOWN-15
    position_x              INTEGER     NOT NULL DEFAULT 0,
    position_y              INTEGER     NOT NULL DEFAULT 0,
    node_config             JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID        NOT NULL,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT pk_ma_nodes PRIMARY KEY (id),
    CONSTRAINT fk_ma_nodes_automation
        FOREIGN KEY (marketing_automation_id)
        REFERENCES crm.marketing_automations(id)
        ON DELETE CASCADE
);

CREATE TABLE crm.ma_customers (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL,
    marketing_automation_id UUID        NOT NULL,
    customer_id             UUID        NOT NULL,   -- → customer.patients
    status                  VARCHAR(50) NOT NULL DEFAULT 'enrolled', -- UNKNOWN-12
    result_data             JSONB,
    enrolled_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID        NOT NULL,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT pk_ma_customers PRIMARY KEY (id),
    CONSTRAINT fk_ma_customers_automation
        FOREIGN KEY (marketing_automation_id)
        REFERENCES crm.marketing_automations(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_ma_customer_enrollment
        UNIQUE (marketing_automation_id, customer_id)
        -- partial (where deleted_at IS NULL) enforced at app layer
);

COMMENT ON COLUMN crm.ma_customers.customer_id IS 'Cross-context ref → customer.patients.id. No FK constraint.';

CREATE TABLE crm.ma_mappings (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL,
    marketing_automation_id UUID        NOT NULL,
    campaign_id             UUID,
    mapping_config          JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID        NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by              UUID        NOT NULL,

    CONSTRAINT pk_ma_mappings PRIMARY KEY (id),
    CONSTRAINT fk_ma_mappings_automation
        FOREIGN KEY (marketing_automation_id)
        REFERENCES crm.marketing_automations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ma_mappings_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES crm.campaigns(id)
        ON DELETE SET NULL
);
```

---

## 6. Index Strategy

### 6.1 Mandatory Base Indexes (All Tables)

Every table carries these indexes automatically from the DDL above:
- `PRIMARY KEY` → B-tree on `id`
- Unique constraints → B-tree indexes

The following **must be created additionally** for every domain table:

```sql
-- Pattern: run for each table in crm schema.
-- Example for campaigns; repeat pattern for all tables.

-- Tenant + soft-delete (hot path for every list query)
CREATE INDEX CONCURRENTLY idx_campaigns_tenant_active
    ON crm.campaigns (tenant_id)
    WHERE deleted_at IS NULL;

-- Tenant + status filter
CREATE INDEX CONCURRENTLY idx_campaigns_tenant_status
    ON crm.campaigns (tenant_id, status)
    WHERE deleted_at IS NULL;

-- Audit: who created
CREATE INDEX CONCURRENTLY idx_campaigns_created_by
    ON crm.campaigns (created_by);
```

### 6.2 Context-Specific Indexes

```sql
-- ── campaigns ────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_campaigns_owner
    ON crm.campaigns (tenant_id, iam_owner_id)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_campaigns_dates
    ON crm.campaigns (tenant_id, start_date, end_date)
    WHERE deleted_at IS NULL;

-- ── campaign_approaches ──────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_campaign_approaches_campaign
    ON crm.campaign_approaches (campaign_id)
    WHERE deleted_at IS NULL;

-- ── opportunities ────────────────────────────────────────────
-- Most critical: list by campaign
CREATE INDEX CONCURRENTLY idx_opportunities_campaign
    ON crm.opportunities (tenant_id, campaign_id, status)
    WHERE deleted_at IS NULL;

-- Customer lookup (most frequent CRM query)
CREATE INDEX CONCURRENTLY idx_opportunities_customer
    ON crm.opportunities (tenant_id, customer_id)
    WHERE deleted_at IS NULL;

-- Sales pipeline view
CREATE INDEX CONCURRENTLY idx_opportunities_sale_status
    ON crm.opportunities (tenant_id, iam_sale_id, status)
    WHERE deleted_at IS NULL;

-- Approach-level analysis
CREATE INDEX CONCURRENTLY idx_opportunities_approach
    ON crm.opportunities (campaign_id, campaign_approach_id)
    WHERE deleted_at IS NULL;

-- Expected revenue aggregation
CREATE INDEX CONCURRENTLY idx_opportunities_revenue
    ON crm.opportunities (tenant_id, status, expected_revenue DESC)
    WHERE deleted_at IS NULL;

-- ── opportunity_processes ────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_opp_processes_opportunity
    ON crm.opportunity_processes (opportunity_id)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_opp_processes_occurred
    ON crm.opportunity_processes (opportunity_id, occurred_at DESC);

-- ── opportunity_exchanges ────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_opp_exchanges_opportunity
    ON crm.opportunity_exchanges (opportunity_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- ── contacts ─────────────────────────────────────────────────
-- Name fuzzy search using pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY idx_contacts_name_trgm
    ON crm.contacts USING GIN (name gin_trgm_ops)
    WHERE deleted_at IS NULL;

-- Phone exact lookup
CREATE INDEX CONCURRENTLY idx_contacts_phone
    ON crm.contacts (tenant_id, phone)
    WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- Pipeline kanban view
CREATE INDEX CONCURRENTLY idx_contacts_pipeline_status
    ON crm.contacts (tenant_id, contact_pipeline_id, contact_status_id)
    WHERE deleted_at IS NULL;

-- Owner filter
CREATE INDEX CONCURRENTLY idx_contacts_owner
    ON crm.contacts (tenant_id, iam_owner_id)
    WHERE deleted_at IS NULL;

-- ── contact_extra_infos ──────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_contact_extra_infos_contact
    ON crm.contact_extra_infos (contact_id);

-- ── contact_exchanges ────────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_contact_exchanges_contact
    ON crm.contact_exchanges (contact_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- ── care_histories ───────────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_care_histories_customer
    ON crm.care_histories (tenant_id, customer_id, occurred_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_care_histories_contact
    ON crm.care_histories (tenant_id, contact_id, occurred_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_care_histories_employee
    ON crm.care_histories (tenant_id, iam_employee_id, occurred_at DESC)
    WHERE deleted_at IS NULL;

-- ── marketing_automations ────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_ma_tenant_status
    ON crm.marketing_automations (tenant_id, status)
    WHERE deleted_at IS NULL;

-- ── ma_customers ─────────────────────────────────────────────
CREATE INDEX CONCURRENTLY idx_ma_customers_customer
    ON crm.ma_customers (tenant_id, customer_id)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_ma_customers_automation_status
    ON crm.ma_customers (marketing_automation_id, status)
    WHERE deleted_at IS NULL;
```

---

## 7. Audit Strategy

### 7.1 Mandatory Audit Columns per Table

Every table in `crm` schema carries the following audit columns. No exception.

| Column | Type | Rule |
|---|---|---|
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | Set once at INSERT, never updated |
| `created_by` | `UUID NOT NULL` | `iam.users.id` of the actor; system UUID for automated jobs |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | Updated by application on every UPDATE |
| `updated_by` | `UUID NOT NULL` | `iam.users.id` of last actor |
| `row_version` | `INTEGER NOT NULL DEFAULT 1` | Incremented by 1 on every UPDATE for optimistic locking |

> **Exceptions:** Append-only tables (`care_histories`, `opportunity_processes`, `opportunity_exchanges`, `contact_exchanges`, `opportunity_viewers`, `contact_customer_links`, `campaign_sales`) carry only `created_at` + `created_by`. They are never updated — only created or soft-deleted.

### 7.2 Optimistic Locking Contract

Application layer must include `WHERE id = $1 AND row_version = $2` on all UPDATE statements for aggregate roots. A mismatch must return HTTP 409 Conflict. The new `row_version` = old + 1 is set by the application, not a trigger.

### 7.3 System Actor

For automated operations (marketing automation executions, BPM-triggered care logs), a dedicated per-tenant `system_principal_id` is defined in `iam.system_principals` and used as `created_by`.

### 7.4 Timezone Policy

All timestamps stored in UTC (`TIMESTAMPTZ`). Display-layer conversion to Vietnam timezone (`Asia/Ho_Chi_Minh`, UTC+7) is the responsibility of the API layer.

---

## 8. Soft Delete Strategy

### 8.1 Mechanism

All aggregate root tables and most entity tables implement soft delete via `deleted_at TIMESTAMPTZ` + `deleted_by UUID`:

- `deleted_at IS NULL` → record is active
- `deleted_at IS NOT NULL` → record is soft-deleted

### 8.2 Application Filter Contract

Every repository method within the CRM context must apply `WHERE deleted_at IS NULL` by default. Explicit opt-in is required for queries that must include deleted records (e.g., audit history views).

### 8.3 Cascade Rules

| Scenario | Strategy |
|---|---|
| `campaigns` soft-deleted | Application cascade soft-deletes: `campaign_approaches`, `campaign_activities`, `campaign_sales`, `campaign_score_configs`, `campaign_sla_configs`. Does NOT cascade to `opportunities` — those are preserved with their data. |
| `contacts` soft-deleted | Application soft-deletes: `contact_extra_infos` (via mark), `contact_exchanges`. Unlinks from `contact_customer_links` (soft-delete the link row). |
| `contact_pipelines` soft-deleted | `contacts` that reference this pipeline have `contact_pipeline_id` set to NULL at application layer. `contact_statuses` are cascade soft-deleted. |
| `opportunities` soft-deleted | Application cascade soft-deletes: `opportunity_processes`, `opportunity_exchanges`, `opportunity_viewers`, `opportunity_contacts`. |
| `marketing_automations` soft-deleted | Application soft-deletes: `ma_nodes`, `ma_customers` (enrolled but not completed), `ma_mappings`. |

### 8.4 Hard Delete Policy

Hard delete is **prohibited on all CRM domain tables** in normal operation. Only legally mandated data erasure (Vietnamese PDPD — **UNKNOWN-17**) may trigger hard delete, and only after a formal `erasure_request` workflow completes.

### 8.5 Partial Unique Index Pattern

For unique constraints that must ignore soft-deleted rows, the application enforces uniqueness by checking `WHERE deleted_at IS NULL` before insert. Database-level partial unique indexes are added where performance demands it:

```sql
-- Example: campaign code unique among active records
CREATE UNIQUE INDEX uq_campaigns_code_active
    ON crm.campaigns (tenant_id, code)
    WHERE deleted_at IS NULL;
```

---

## 9. Prisma Schema

```prisma
// ─────────────────────────────────────────────────────────────
// CareFollow — CRM Bounded Context
// Prisma Schema: crm schema
// ─────────────────────────────────────────────────────────────

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["crm"]
}

// ─── AG-08: CareCategory ─────────────────────────────────────

model CareCategory {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  name        String    @db.VarChar(255)
  position    Int       @default(0)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy   String    @map("updated_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy   String?   @map("deleted_by") @db.Uuid
  rowVersion  Int       @default(1) @map("row_version")

  careHistories CareHistory[]

  @@schema("crm")
  @@map("care_categories")
}

// ─── Reference Data: MarketingSource ─────────────────────────

model MarketingSource {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  name        String    @db.VarChar(255)
  sourceType  String?   @map("source_type") @db.VarChar(30) // UNKNOWN-16
  position    Int       @default(0)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy   String    @map("updated_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy   String?   @map("deleted_by") @db.Uuid

  opportunities Opportunity[]

  @@schema("crm")
  @@map("marketing_sources")
}

// ─── AG-04: ContactPipeline + ContactStatus ───────────────────

model ContactPipeline {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  name        String    @db.VarChar(255)
  position    Int       @default(0)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy   String    @map("updated_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy   String?   @map("deleted_by") @db.Uuid
  rowVersion  Int       @default(1) @map("row_version")

  statuses     ContactStatus[]
  contacts     Contact[]
  opportunities Opportunity[]

  @@schema("crm")
  @@map("contact_pipelines")
}

model ContactStatus {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String    @map("tenant_id") @db.Uuid
  contactPipelineId String    @map("contact_pipeline_id") @db.Uuid
  name              String    @db.VarChar(255)
  position          Int       @default(0)
  colorHex          String?   @map("color_hex") @db.VarChar(30)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy         String    @map("created_by") @db.Uuid
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy         String    @map("updated_by") @db.Uuid
  deletedAt         DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy         String?   @map("deleted_by") @db.Uuid

  pipeline ContactPipeline @relation(fields: [contactPipelineId], references: [id])
  contacts Contact[]

  @@schema("crm")
  @@map("contact_statuses")
}

// ─── AG-05: ContactAttributeDefinition ───────────────────────

model ContactAttributeDefinition {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  parentId     String?   @map("parent_id") @db.Uuid
  name         String    @db.VarChar(100)
  fieldName    String    @map("field_name") @db.VarChar(100)
  dataType     String    @map("data_type") @db.VarChar(30)
  isRequired   Boolean   @default(false) @map("is_required")
  isReadonly   Boolean   @default(false) @map("is_readonly")
  isUnique     Boolean   @default(false) @map("is_unique")
  options      Json?
  numberFormat String?   @map("number_format") @db.VarChar(30)
  position     Int       @default(0)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy    String    @map("created_by") @db.Uuid
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy    String    @map("updated_by") @db.Uuid
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy    String?   @map("deleted_by") @db.Uuid
  rowVersion   Int       @default(1) @map("row_version")

  parent   ContactAttributeDefinition?  @relation("AttributeParent", fields: [parentId], references: [id])
  children ContactAttributeDefinition[] @relation("AttributeParent")
  extraInfos ContactExtraInfo[]

  @@unique([tenantId, fieldName])
  @@schema("crm")
  @@map("contact_attribute_definitions")
}

// ─── AG-03: Contact ───────────────────────────────────────────

model Contact {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId          String    @map("tenant_id") @db.Uuid
  name              String    @db.VarChar(255)
  phone             String?   @db.VarChar(50)
  email             String?   @db.VarChar(255)
  note              String?
  avatarUrl         String?   @map("avatar_url") @db.VarChar(500)
  cardVisitFrontUrl String?   @map("card_visit_front_url") @db.VarChar(500)
  cardVisitBackUrl  String?   @map("card_visit_back_url") @db.VarChar(500)
  department        String?   @db.VarChar(100)
  iamOwnerId        String?   @map("iam_owner_id") @db.Uuid  // → iam.users (no relation)
  contactPipelineId String?   @map("contact_pipeline_id") @db.Uuid
  contactStatusId   String?   @map("contact_status_id") @db.Uuid
  primaryCustomerId String?   @map("primary_customer_id") @db.Uuid // → customer.patients (no relation)
  extraAttributes   Json?     @map("extra_attributes")
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy         String    @map("created_by") @db.Uuid
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy         String    @map("updated_by") @db.Uuid
  deletedAt         DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy         String?   @map("deleted_by") @db.Uuid
  rowVersion        Int       @default(1) @map("row_version")

  pipeline          ContactPipeline? @relation(fields: [contactPipelineId], references: [id])
  status            ContactStatus?   @relation(fields: [contactStatusId], references: [id])
  extraInfos        ContactExtraInfo[]
  exchanges         ContactExchange[]
  customerLinks     ContactCustomerLink[]
  opportunityLinks  OpportunityContact[]
  careHistories     CareHistory[]

  @@schema("crm")
  @@map("contacts")
}

model ContactExtraInfo {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String    @map("tenant_id") @db.Uuid
  contactId       String    @map("contact_id") @db.Uuid
  attributeDefId  String    @map("attribute_def_id") @db.Uuid
  value           String?
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy       String    @map("updated_by") @db.Uuid

  contact      Contact                    @relation(fields: [contactId], references: [id])
  attributeDef ContactAttributeDefinition @relation(fields: [attributeDefId], references: [id])

  @@unique([contactId, attributeDefId])
  @@schema("crm")
  @@map("contact_extra_infos")
}

model ContactExchange {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  contactId    String    @map("contact_id") @db.Uuid
  iamAuthorId  String    @map("iam_author_id") @db.Uuid // → iam.users (no relation)
  content      String?
  contentDelta String?   @map("content_delta")
  mediaUrls    Json?     @map("media_urls")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy    String?   @map("deleted_by") @db.Uuid

  contact Contact @relation(fields: [contactId], references: [id])

  @@schema("crm")
  @@map("contact_exchanges")
}

model ContactCustomerLink {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  contactId   String    @map("contact_id") @db.Uuid
  customerId  String    @map("customer_id") @db.Uuid // → customer.patients (no relation)
  isPrimary   Boolean   @default(false) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz

  contact Contact @relation(fields: [contactId], references: [id])

  @@unique([contactId, customerId])
  @@schema("crm")
  @@map("contact_customer_links")
}

// ─── AG-01: Campaign ─────────────────────────────────────────

model Campaign {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String    @map("tenant_id") @db.Uuid
  code                 String    @db.VarChar(20)
  name                 String    @db.VarChar(255)
  type                 String?   @db.VarChar(50)       // UNKNOWN-07
  status               String    @default("draft") @db.VarChar(50)
  saleDistributionType String?   @map("sale_distribution_type") @db.VarChar(50) // UNKNOWN-08
  divisionMethod       Int?      @map("division_method") // UNKNOWN-09P
  coverUrl             String?   @map("cover_url") @db.VarChar(500)
  startDate            DateTime? @map("start_date") @db.Date
  endDate              DateTime? @map("end_date") @db.Date
  position             Int       @default(0)
  iamOwnerId           String    @map("iam_owner_id") @db.Uuid // → iam.users (no relation)
  approachNote         String?   @map("approach_note")
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy            String    @map("created_by") @db.Uuid
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy            String    @map("updated_by") @db.Uuid
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy            String?   @map("deleted_by") @db.Uuid
  rowVersion           Int       @default(1) @map("row_version")

  approaches    CampaignApproach[]
  sales         CampaignSale[]
  scoreConfigs  CampaignScoreConfig[]
  slaConfigs    CampaignSlaConfig[]
  opportunities Opportunity[]
  maMappings    MaMapping[]

  @@unique([tenantId, code])
  @@schema("crm")
  @@map("campaigns")
}

model CampaignApproach {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  campaignId  String    @map("campaign_id") @db.Uuid
  name        String    @db.VarChar(255)
  step        Int
  slaHours    Int?      @map("sla_hours")
  activities  Json?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy   String    @map("updated_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy   String?   @map("deleted_by") @db.Uuid
  rowVersion  Int       @default(1) @map("row_version")

  campaign      Campaign           @relation(fields: [campaignId], references: [id])
  activities_r  CampaignActivity[]
  slaConfigs    CampaignSlaConfig[]
  opportunities Opportunity[]
  oppProcesses  OpportunityProcess[]

  @@unique([campaignId, step])
  @@schema("crm")
  @@map("campaign_approaches")
}

model CampaignActivity {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String    @map("tenant_id") @db.Uuid
  campaignApproachId   String    @map("campaign_approach_id") @db.Uuid
  name                 String    @db.VarChar(255)
  position             Int       @default(0)
  config               Json?
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy            String    @map("created_by") @db.Uuid
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz
  rowVersion           Int       @default(1) @map("row_version")

  approach CampaignApproach @relation(fields: [campaignApproachId], references: [id])

  @@schema("crm")
  @@map("campaign_activities")
}

model CampaignSale {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  campaignId  String    @map("campaign_id") @db.Uuid
  iamUserId   String    @map("iam_user_id") @db.Uuid // → iam.users (no relation)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz

  campaign Campaign @relation(fields: [campaignId], references: [id])

  @@unique([campaignId, iamUserId])
  @@schema("crm")
  @@map("campaign_sales")
}

model CampaignScoreConfig {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  campaignId  String    @map("campaign_id") @db.Uuid
  actionType  String    @map("action_type") @db.VarChar(100)
  scoreValue  Int       @default(0) @map("score_value")
  condition   Json?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy   String    @map("created_by") @db.Uuid
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy   String    @map("updated_by") @db.Uuid
  rowVersion  Int       @default(1) @map("row_version")

  campaign Campaign @relation(fields: [campaignId], references: [id])

  @@schema("crm")
  @@map("campaign_score_configs")
}

model CampaignSlaConfig {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String    @map("tenant_id") @db.Uuid
  campaignId           String    @map("campaign_id") @db.Uuid
  campaignApproachId   String?   @map("campaign_approach_id") @db.Uuid
  slaHours             Int       @map("sla_hours")
  escalationRule       Json?     @map("escalation_rule") // UNKNOWN-13
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy            String    @map("created_by") @db.Uuid
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy            String    @map("updated_by") @db.Uuid
  rowVersion           Int       @default(1) @map("row_version")

  campaign Campaign          @relation(fields: [campaignId], references: [id])
  approach CampaignApproach? @relation(fields: [campaignApproachId], references: [id])

  @@schema("crm")
  @@map("campaign_sla_configs")
}

// ─── AG-02: Opportunity ───────────────────────────────────────

model Opportunity {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String    @map("tenant_id") @db.Uuid
  campaignId           String    @map("campaign_id") @db.Uuid
  campaignApproachId   String?   @map("campaign_approach_id") @db.Uuid
  contactPipelineId    String?   @map("contact_pipeline_id") @db.Uuid
  refType              String    @default("customer") @map("ref_type") @db.VarChar(50)
  customerId           String?   @map("customer_id") @db.Uuid  // → customer.patients (no relation)
  contactId            String?   @map("contact_id") @db.Uuid
  iamOwnerId           String    @map("iam_owner_id") @db.Uuid // → iam.users (no relation)
  iamSaleId            String?   @map("iam_sale_id") @db.Uuid  // → iam.users (no relation)
  crmSourceId          String?   @map("crm_source_id") @db.Uuid
  expectedRevenue      Decimal   @default(0) @map("expected_revenue") @db.Decimal(18, 2)
  startDate            DateTime? @map("start_date") @db.Date
  endDate              DateTime? @map("end_date") @db.Date
  percent              Int       @default(0)
  status               String    @default("open") @db.VarChar(50) // UNKNOWN-10
  note                 String?
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy            String    @map("created_by") @db.Uuid
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy            String    @map("updated_by") @db.Uuid
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy            String?   @map("deleted_by") @db.Uuid
  rowVersion           Int       @default(1) @map("row_version")

  campaign  Campaign          @relation(fields: [campaignId], references: [id])
  approach  CampaignApproach? @relation(fields: [campaignApproachId], references: [id])
  pipeline  ContactPipeline?  @relation(fields: [contactPipelineId], references: [id])
  contact   Contact?          @relation(fields: [contactId], references: [id])
  source    MarketingSource?  @relation(fields: [crmSourceId], references: [id])
  processes  OpportunityProcess[]
  exchanges  OpportunityExchange[]
  viewers    OpportunityViewer[]
  contacts_r OpportunityContact[]

  @@schema("crm")
  @@map("opportunities")
}

model OpportunityProcess {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId             String    @map("tenant_id") @db.Uuid
  opportunityId        String    @map("opportunity_id") @db.Uuid
  campaignApproachId   String?   @map("campaign_approach_id") @db.Uuid
  note                 String?
  percent              Int?
  status               String?   @db.VarChar(50) // UNKNOWN-10
  occurredAt           DateTime  @default(now()) @map("occurred_at") @db.Timestamptz
  createdBy            String    @map("created_by") @db.Uuid
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy            String?   @map("deleted_by") @db.Uuid

  opportunity Opportunity       @relation(fields: [opportunityId], references: [id])
  approach    CampaignApproach? @relation(fields: [campaignApproachId], references: [id])

  @@schema("crm")
  @@map("opportunity_processes")
}

model OpportunityExchange {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  opportunityId String    @map("opportunity_id") @db.Uuid
  iamAuthorId   String    @map("iam_author_id") @db.Uuid // → iam.users (no relation)
  content       String?
  contentDelta  String?   @map("content_delta")
  mediaUrls     Json?     @map("media_urls")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy     String?   @map("deleted_by") @db.Uuid

  opportunity Opportunity @relation(fields: [opportunityId], references: [id])

  @@schema("crm")
  @@map("opportunity_exchanges")
}

model OpportunityViewer {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  opportunityId String   @map("opportunity_id") @db.Uuid
  iamUserId     String   @map("iam_user_id") @db.Uuid // → iam.users (no relation)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  opportunity Opportunity @relation(fields: [opportunityId], references: [id])

  @@unique([opportunityId, iamUserId])
  @@schema("crm")
  @@map("opportunity_viewers")
}

model OpportunityContact {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  opportunityId String    @map("opportunity_id") @db.Uuid
  contactId     String    @map("contact_id") @db.Uuid
  isPrimary     Boolean   @default(false) @map("is_primary")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy     String    @map("created_by") @db.Uuid
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz

  opportunity Opportunity @relation(fields: [opportunityId], references: [id])
  contact     Contact     @relation(fields: [contactId], references: [id])

  @@unique([opportunityId, contactId])
  @@schema("crm")
  @@map("opportunity_contacts")
}

// ─── AG-06: CareHistory ───────────────────────────────────────

model CareHistory {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String    @map("tenant_id") @db.Uuid
  careCategoryId  String?   @map("care_category_id") @db.Uuid
  objectType      String    @map("object_type") @db.VarChar(50)
  customerId      String?   @map("customer_id") @db.Uuid // → customer.patients (no relation)
  contactId       String?   @map("contact_id") @db.Uuid
  iamEmployeeId   String    @map("iam_employee_id") @db.Uuid // → iam.users (no relation)
  content         String?
  status          Int       @default(0) // UNKNOWN-11
  occurredAt      DateTime  @default(now()) @map("occurred_at") @db.Timestamptz
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy       String    @map("created_by") @db.Uuid
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy       String?   @map("deleted_by") @db.Uuid

  careCategory CareCategory? @relation(fields: [careCategoryId], references: [id])
  contact      Contact?      @relation(fields: [contactId], references: [id])

  @@schema("crm")
  @@map("care_histories")
}

// ─── AG-07: MarketingAutomation ───────────────────────────────

model MarketingAutomation {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  name          String    @db.VarChar(255)
  status        String    @default("draft") @db.VarChar(50)
  triggerConfig Json?     @map("trigger_config") // UNKNOWN-14
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy     String    @map("created_by") @db.Uuid
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy     String    @map("updated_by") @db.Uuid
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz
  deletedBy     String?   @map("deleted_by") @db.Uuid
  rowVersion    Int       @default(1) @map("row_version")

  nodes     MaNode[]
  customers MaCustomer[]
  mappings  MaMapping[]

  @@schema("crm")
  @@map("marketing_automations")
}

model MaNode {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  marketingAutomationId String    @map("marketing_automation_id") @db.Uuid
  nodeType              String    @map("node_type") @db.VarChar(100) // UNKNOWN-15
  positionX             Int       @default(0) @map("position_x")
  positionY             Int       @default(0) @map("position_y")
  nodeConfig            Json?     @map("node_config")
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy             String    @map("created_by") @db.Uuid
  deletedAt             DateTime? @map("deleted_at") @db.Timestamptz

  automation MarketingAutomation @relation(fields: [marketingAutomationId], references: [id])

  @@schema("crm")
  @@map("ma_nodes")
}

model MaCustomer {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  marketingAutomationId String    @map("marketing_automation_id") @db.Uuid
  customerId            String    @map("customer_id") @db.Uuid // → customer.patients (no relation)
  status                String    @default("enrolled") @db.VarChar(50) // UNKNOWN-12
  resultData            Json?     @map("result_data")
  enrolledAt            DateTime  @default(now()) @map("enrolled_at") @db.Timestamptz
  completedAt           DateTime? @map("completed_at") @db.Timestamptz
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy             String    @map("created_by") @db.Uuid
  deletedAt             DateTime? @map("deleted_at") @db.Timestamptz

  automation MarketingAutomation @relation(fields: [marketingAutomationId], references: [id])

  @@unique([marketingAutomationId, customerId])
  @@schema("crm")
  @@map("ma_customers")
}

model MaMapping {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  marketingAutomationId String    @map("marketing_automation_id") @db.Uuid
  campaignId            String?   @map("campaign_id") @db.Uuid
  mappingConfig         Json?     @map("mapping_config")
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz
  createdBy             String    @map("created_by") @db.Uuid
  updatedAt             DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  updatedBy             String    @map("updated_by") @db.Uuid

  automation MarketingAutomation @relation(fields: [marketingAutomationId], references: [id])
  campaign   Campaign?           @relation(fields: [campaignId], references: [id])

  @@schema("crm")
  @@map("ma_mappings")
}
```

---

## 10. Unknown Registry

| ID | Description | Blocking | Resolution |
|---|---|---|---|
| UNKNOWN-01 | `ref_type` in Opportunity: always `customer` or also `contact`? Can both be set simultaneously? | Opportunity write logic | DDD_MODEL.md |
| UNKNOWN-02 | Policy when deleting a ContactPipeline that has active Contacts | Cascade/migration logic | DDD_MODEL.md |
| UNKNOWN-03 | Max depth of ContactAttributeDefinition parent-child nesting | Schema constraint | DDD_MODEL.md |
| UNKNOWN-04 | Whether CareHistory is immutable after creation (append-only) | Repository write rules | DDD_MODEL.md |
| UNKNOWN-05 | Can a customer be enrolled in multiple active MarketingAutomations simultaneously? | `uq_ma_customer_enrollment` index | DDD_MODEL.md |
| UNKNOWN-06 | Confirmed status string values for all status columns | Enum definitions, validation | DDD_MODEL.md |
| UNKNOWN-07 | Campaign `type` — what are the valid values? | Campaign creation validation | DDD_MODEL.md |
| UNKNOWN-08 | Campaign `sale_distribution_type` — valid values and business meaning | Distribution logic | DDD_MODEL.md |
| UNKNOWN-09 | Campaign `division_method` — integer enum values and meaning | Campaign setup wizard | DDD_MODEL.md |
| UNKNOWN-10 | Opportunity `status` — exact values and state machine transitions | Opportunity lifecycle | DDD_MODEL.md |
| UNKNOWN-11 | CareHistory `status` — integer enum values and meaning | Care log display | DDD_MODEL.md |
| UNKNOWN-12 | MaCustomer `status` — values: enrolled, processing, completed, failed? | MA execution engine | DDD_MODEL.md + MICROSERVICE_EVOLUTION_PLAN.md |
| UNKNOWN-13 | `escalation_rule` JSONB shape in `campaign_sla_configs` | SLA alert service | DDD_MODEL.md |
| UNKNOWN-14 | `trigger_config` JSONB shape in `marketing_automations` | MA trigger evaluation | DDD_MODEL.md |
| UNKNOWN-15 | `node_type` valid values in `ma_nodes` (e.g., send_sms, wait, condition) | MA node renderer | DDD_MODEL.md |
| UNKNOWN-16 | `source_type` valid values in `marketing_sources` | Lead source classification | DDD_MODEL.md |
| UNKNOWN-17 | Vietnamese PDPD hard-erasure obligation for CRM data | Hard-delete workflow | ARCHITECTURE_SPECIFICATION.md + Legal |

---

*End of CRM_DATABASE.md v1.0.0*
*Next review: Upon receipt of DDD_MODEL.md — resolve UNKNOWN-01 through UNKNOWN-17*
