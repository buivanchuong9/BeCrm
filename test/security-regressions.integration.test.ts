import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, APP_GUARD } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import '../src/core/http/request-id.middleware';
import { configureApp } from '../src/bootstrap';
import { AuthenticatedPrincipal } from '../src/core/security/auth.types';

import {
  WorkflowInstancesController,
  WorkflowTasksController,
} from '../src/modules/workflow/workflow.controller';
import { WorkflowRuntimeService } from '../src/modules/workflow/workflow-runtime.service';
import { WorkflowRuntimeRepository } from '../src/modules/workflow/workflow-runtime.repository';
import { WorkflowTemplatesRepository } from '../src/modules/workflow/workflow-templates.repository';
import { PrismaService } from '../src/core/database/prisma.service';
import { AuditService } from '../src/core/audit/audit.service';
import { OutboxService } from '../src/core/outbox/outbox.service';
import { EncountersRepository } from '../src/modules/encounters/encounters.repository';
import { PatientsRepository } from '../src/modules/patients/patients.repository';

import {
  RecordActionsController,
  DocumentsController,
} from '../src/modules/medical-records/medical-records.controller';
import { MedicalRecordsService } from '../src/modules/medical-records/medical-records.service';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const OTHER_PATIENT_ID = '33333333-3333-4333-8333-333333333333';

function principal(
  role: AuthenticatedPrincipal['memberships'][number]['role'],
  organizationId = ORG_A,
): AuthenticatedPrincipal {
  return {
    userId: 'actor-44444444-4444-4444-8444-444444444444',
    email: 'actor@example.com',
    displayName: 'Actor',
    memberships: [{ organizationId, clinicLocationId: null, departmentId: null, role }],
  };
}

let currentPrincipal: AuthenticatedPrincipal | null = null;

class FakeAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = currentPrincipal;
    return true;
  }
}

const fakeConfig = {
  get(key: string) {
    const values: Record<string, unknown> = {
      frontendOrigins: ['http://localhost:5173'],
      isProduction: false,
      requestBodyLimit: '1mb',
      trustProxyHops: 0,
      auth: { cookieSecure: false, cookieSameSite: 'lax', cookieDomain: undefined, fieldEncryptionKey: 'x' },
    };
    return values[key];
  },
};

describe('security regressions — confirmed-and-fixed vulnerabilities', () => {
  describe('workflow: listForPatient IDOR (GET /workflow-instances?patientId=)', () => {
    let baseUrl: string;
    let app: Awaited<ReturnType<typeof NestFactory.create>>;
    let visibleToActor = false;

    const fakePatients = {
      async findVisibleById(_p: AuthenticatedPrincipal, patientId: string) {
        return visibleToActor && patientId === OTHER_PATIENT_ID ? { id: patientId } : null;
      },
    };
    const fakeRuntime = {
      async listInstancesForPatient() {
        return [];
      },
      async list() {
        return [];
      },
    };
    const fakeEncounters = { async findVisibleById() { return null; } };

    @Module({
      controllers: [WorkflowInstancesController, WorkflowTasksController],
      providers: [
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: ConfigService, useValue: fakeConfig },
        { provide: PrismaService, useValue: { medicalEncounter: { findMany: async () => [] } } },
        { provide: WorkflowTemplatesRepository, useValue: {} },
        { provide: WorkflowRuntimeRepository, useValue: fakeRuntime },
        { provide: EncountersRepository, useValue: fakeEncounters },
        { provide: PatientsRepository, useValue: fakePatients },
        { provide: AuditService, useValue: { write: async () => undefined } },
        { provide: OutboxService, useValue: { write: async () => undefined } },
        WorkflowRuntimeService,
      ],
    })
    class WorkflowSecurityTestModule {}

    before(async () => {
      app = await NestFactory.create(WorkflowSecurityTestModule, { logger: false, bodyParser: false });
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
    });
    after(async () => app.close());
    beforeEach(() => {
      visibleToActor = false;
    });

    it('REGRESSION: returns 404, not another patient\'s data, when the caller cannot see that patient', async () => {
      currentPrincipal = principal('receptionist');
      visibleToActor = false; // actor has no relationship to OTHER_PATIENT_ID
      const response = await fetch(
        `${baseUrl}/api/v1/workflow-instances?patientId=${OTHER_PATIENT_ID}`,
        { headers: { authorization: 'irrelevant' } },
      );
      assert.equal(response.status, 404);
    });

    it('still succeeds (200) once the caller genuinely can see the patient', async () => {
      currentPrincipal = principal('receptionist');
      visibleToActor = true;
      const response = await fetch(
        `${baseUrl}/api/v1/workflow-instances?patientId=${OTHER_PATIENT_ID}`,
      );
      assert.equal(response.status, 200);
    });
  });

  describe('workflow: listTasks unscoped platform-wide leak (GET /workflow-tasks)', () => {
    let baseUrl: string;
    let app: Awaited<ReturnType<typeof NestFactory.create>>;
    let capturedEncounterIds: string[] | undefined;

    const fakeRuntime = {
      async list(filters: { encounterIds: string[] }) {
        capturedEncounterIds = filters.encounterIds;
        return [];
      },
      async listInstancesForPatient() {
        return [];
      },
    };
    const fakePrisma = {
      medicalEncounter: {
        findMany: async ({ where }: { where?: { organizationId?: { in: string[] } } }) => {
          // Simulate two orgs each having one encounter, to prove scoping.
          if (where?.organizationId?.in?.includes(ORG_A)) return [{ id: 'encounter-in-org-a' }];
          return [{ id: 'encounter-in-org-a' }, { id: 'encounter-in-org-b' }];
        },
      },
    };

    @Module({
      controllers: [WorkflowTasksController, WorkflowInstancesController],
      providers: [
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: ConfigService, useValue: fakeConfig },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: WorkflowTemplatesRepository, useValue: {} },
        { provide: WorkflowRuntimeRepository, useValue: fakeRuntime },
        { provide: EncountersRepository, useValue: { async findVisibleById() { return null; } } },
        { provide: PatientsRepository, useValue: { async findVisibleById() { return null; } } },
        { provide: AuditService, useValue: { write: async () => undefined } },
        { provide: OutboxService, useValue: { write: async () => undefined } },
        WorkflowRuntimeService,
      ],
    })
    class WorkflowTasksSecurityTestModule {}

    before(async () => {
      app = await NestFactory.create(WorkflowTasksSecurityTestModule, {
        logger: false,
        bodyParser: false,
      });
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
    });
    after(async () => app.close());
    beforeEach(() => {
      capturedEncounterIds = undefined;
    });

    it('REGRESSION: a patient role is forbidden from the staff task queue (previously: 200, everything)', async () => {
      currentPrincipal = principal('patient');
      const response = await fetch(`${baseUrl}/api/v1/workflow-tasks`);
      assert.equal(response.status, 403);
      assert.equal(capturedEncounterIds, undefined); // never even reached the repository
    });

    it('REGRESSION: an unfiltered staff query is scoped to the caller\'s own organization only (previously: every org)', async () => {
      currentPrincipal = principal('doctor', ORG_A);
      const response = await fetch(`${baseUrl}/api/v1/workflow-tasks`);
      assert.equal(response.status, 200);
      assert.deepEqual(capturedEncounterIds, ['encounter-in-org-a']);
    });

    it('a super_administrator may still see every organization\'s tasks', async () => {
      currentPrincipal = principal('super_administrator', ORG_A);
      const response = await fetch(`${baseUrl}/api/v1/workflow-tasks`);
      assert.equal(response.status, 200);
      assert.deepEqual(capturedEncounterIds, ['encounter-in-org-a', 'encounter-in-org-b']);
    });
  });

  describe('medical-records: missing role checks on flag/review actions', () => {
    let baseUrl: string;
    let app: Awaited<ReturnType<typeof NestFactory.create>>;

    const fakePrisma = {
      medicalRecord: {
        findUnique: async () => ({ id: '55555555-5555-4555-8555-555555555555', encounterId: 'encounter-1', status: 'signed' }),
        update: async () => ({ id: '55555555-5555-4555-8555-555555555555' }),
      },
      clinicalDocument: {
        findUnique: async () => ({ id: '66666666-6666-4666-8666-666666666666', encounterId: 'encounter-1' }),
        update: async () => ({ id: '66666666-6666-4666-8666-666666666666' }),
      },
    };
    const fakeEncounters = {
      async findVisibleById() {
        return { id: 'encounter-1', patientId: 'patient-1', organizationId: ORG_A, status: 'closed' };
      },
    };

    @Module({
      controllers: [RecordActionsController, DocumentsController],
      providers: [
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: ConfigService, useValue: fakeConfig },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: EncountersRepository, useValue: fakeEncounters },
        { provide: AuditService, useValue: { write: async () => undefined } },
        { provide: OutboxService, useValue: { write: async () => undefined } },
        MedicalRecordsService,
      ],
    })
    class MedicalRecordsSecurityTestModule {}

    before(async () => {
      app = await NestFactory.create(MedicalRecordsSecurityTestModule, {
        logger: false,
        bodyParser: false,
      });
      configureApp(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
    });
    after(async () => app.close());

    it('REGRESSION: a patient cannot flag their own signed record as needing a late-result addendum', async () => {
      currentPrincipal = principal('patient');
      const response = await fetch(`${baseUrl}/api/v1/medical-records/55555555-5555-4555-8555-555555555555/flag-late-result`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: 'attempted patient-side flag' }),
      });
      assert.equal(response.status, 403);
    });

    it('a staff role can still flag a late result (no regression on legitimate access)', async () => {
      currentPrincipal = principal('care_coordinator');
      const response = await fetch(`${baseUrl}/api/v1/medical-records/55555555-5555-4555-8555-555555555555/flag-late-result`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: 'legitimate staff flag' }),
      });
      assert.equal(response.status, 201);
    });

    it('REGRESSION: a patient cannot mark a clinical document as reviewed', async () => {
      currentPrincipal = principal('patient');
      const response = await fetch(`${baseUrl}/api/v1/documents/66666666-6666-4666-8666-666666666666/review`, { method: 'POST' });
      assert.equal(response.status, 403);
    });

    it('REGRESSION: a patient cannot flag a document as having an incorrect link', async () => {
      currentPrincipal = principal('patient');
      const response = await fetch(`${baseUrl}/api/v1/documents/66666666-6666-4666-8666-666666666666/flag-incorrect-link`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'attempted patient-side flag' }),
      });
      assert.equal(response.status, 403);
    });
  });
});
