import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import '../src/core/http/request-id.middleware';
import { configureApp } from '../src/bootstrap';
import { AuthenticatedPrincipal } from '../src/core/security/auth.types';

import {
  PatientCarePlanController,
  CarePlansController,
  ActivitiesController,
} from '../src/modules/care-plans/presentation/controllers/care-plans.controller';
import { CarePlansRepository } from '../src/modules/care-plans/infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../src/modules/care-plans/application/care-plan-access.service';
import { GetOrCreateCarePlanUseCase } from '../src/modules/care-plans/application/use-cases/get-or-create-care-plan.use-case';
import { ListFollowUpActivitiesUseCase } from '../src/modules/care-plans/application/use-cases/list-follow-up-activities.use-case';
import { CreateFollowUpActivityUseCase } from '../src/modules/care-plans/application/use-cases/create-follow-up-activity.use-case';
import { AdvanceFollowUpActivityUseCase } from '../src/modules/care-plans/application/use-cases/advance-follow-up-activity.use-case';
import { ConfirmFollowUpActivityUseCase } from '../src/modules/care-plans/application/use-cases/confirm-follow-up-activity.use-case';
import { RunCarePlanAutomationUseCase } from '../src/modules/care-plans/application/use-cases/run-care-plan-automation.use-case';
import { PatientsRepository } from '../src/modules/patients/patients.repository';
import { EncountersRepository } from '../src/modules/encounters/encounters.repository';
import { AuditService } from '../src/core/audit/audit.service';
import { PublishNotificationsUseCase } from '../src/modules/notifications/application/use-cases/publish-notifications.use-case';

const ORG_ID = '22222222-2222-4222-8222-222222222222';
const PATIENT_ID = '33333333-3333-4333-8333-333333333333';
const CARE_PLAN_ID = '44444444-4444-4444-8444-444444444444';
const ENCOUNTER_ID = '55555555-5555-4555-8555-555555555555';
const ACTIVITY_ID = '66666666-6666-4666-8666-666666666666';
const PATIENT_USER_ID = '77777777-7777-4777-8777-777777777777';

function principal(
  role: AuthenticatedPrincipal['memberships'][number]['role'],
  userId = 'actor-11111111-1111-4111-8111-111111111111',
): AuthenticatedPrincipal {
  return {
    userId,
    email: 'actor@example.com',
    displayName: 'Actor',
    memberships: [{ organizationId: ORG_ID, clinicLocationId: null, departmentId: null, role }],
  };
}

let currentPrincipal: AuthenticatedPrincipal | null = null;

// configureApp() (test/care-plans.integration.test.ts's shared middleware/pipe/
// filter/interceptor stack, same as production) reads ConfigService directly -
// it must be provided even though none of these routes use config values
// themselves, mirroring test/auth-registrations.integration.test.ts's pattern.
const fakeConfig = {
  get(key: string) {
    const values: Record<string, unknown> = {
      frontendOrigins: ['http://localhost:5173'],
      isProduction: false,
      requestBodyLimit: '1mb',
      trustProxyHops: 0,
      auth: { cookieSecure: false, cookieSameSite: 'lax', cookieDomain: undefined },
    };
    return values[key];
  },
};

class FakeAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = currentPrincipal;
    return true;
  }
}

function makeCarePlan(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: CARE_PLAN_ID,
    patientId: PATIENT_ID,
    encounterId: ENCOUNTER_ID,
    status: 'not_started',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: ACTIVITY_ID,
    carePlanId: CARE_PLAN_ID,
    type: 'medication_reminder',
    title: 'Take medication',
    description: 'Twice daily',
    dueDate: now,
    priority: 'normal',
    status: 'scheduled',
    automationMode: null,
    automationAction: null,
    lastAutomatedAt: null,
    automationRunCount: 0,
    version: 1,
    createdAt: now,
    ...overrides,
  };
}

class FakeCarePlansRepository {
  carePlans = new Map<string, ReturnType<typeof makeCarePlan>>([[CARE_PLAN_ID, makeCarePlan()]]);
  activities = new Map<string, ReturnType<typeof makeActivity>>([[ACTIVITY_ID, makeActivity()]]);

  async findById(id: string) {
    return this.carePlans.get(id) ?? null;
  }
  async findLatestForPatient(patientId: string) {
    return [...this.carePlans.values()].find((p) => p.patientId === patientId) ?? null;
  }
  async create(patientId: string, encounterId: string) {
    const plan = makeCarePlan({ id: randomUUID(), patientId, encounterId });
    this.carePlans.set(plan.id, plan);
    return plan;
  }
  async listActivities(carePlanId: string) {
    return [...this.activities.values()].filter((a) => a.carePlanId === carePlanId);
  }
  async createActivity(input: Record<string, unknown>) {
    const row = makeActivity({ id: randomUUID(), ...input });
    this.activities.set(row.id, row);
    return row;
  }
  async findActivityById(id: string) {
    return this.activities.get(id) ?? null;
  }
  async updateActivityStatus(id: string, status: string, versionIncrement: number) {
    const row = this.activities.get(id);
    if (!row) throw new Error('not found');
    const updated = { ...row, status, version: row.version + versionIncrement };
    this.activities.set(id, updated);
    return updated;
  }
  async findAutomationCandidates(carePlanId: string) {
    return [...this.activities.values()].filter(
      (a) => a.carePlanId === carePlanId && ['scheduled', 'due'].includes(a.status),
    );
  }
  async markActivitiesAutomated(ids: string[]) {
    for (const id of ids) {
      const row = this.activities.get(id);
      if (row) this.activities.set(id, { ...row, automationRunCount: row.automationRunCount + 1 });
    }
  }
}

class FakePatientsRepository {
  async findVisibleById(_principal: AuthenticatedPrincipal, patientId: string) {
    if (patientId !== PATIENT_ID) return null;
    return { id: PATIENT_ID, userId: PATIENT_USER_ID } as unknown;
  }
  async findUserId(patientId: string) {
    return patientId === PATIENT_ID ? PATIENT_USER_ID : null;
  }
}

class FakeEncountersRepository {
  async findMostRecentlyUpdatedForPatient(patientId: string) {
    return patientId === PATIENT_ID ? { id: ENCOUNTER_ID } : null;
  }
}

class FakeAuditService {
  calls: unknown[] = [];
  async write(input: unknown) {
    this.calls.push(input);
  }
}

class FakePublishNotificationsUseCase {
  calls: unknown[][] = [];
  async execute(inputs: unknown[]) {
    this.calls.push(inputs);
  }
}

const fakeCarePlans = new FakeCarePlansRepository();
const fakePatients = new FakePatientsRepository();
const fakeEncounters = new FakeEncountersRepository();
const fakeAudit = new FakeAuditService();
const fakePublish = new FakePublishNotificationsUseCase();

@Module({
  controllers: [PatientCarePlanController, CarePlansController, ActivitiesController],
  providers: [
    { provide: APP_GUARD, useClass: FakeAuthGuard },
    { provide: ConfigService, useValue: fakeConfig },
    { provide: CarePlansRepository, useValue: fakeCarePlans },
    { provide: PatientsRepository, useValue: fakePatients },
    { provide: EncountersRepository, useValue: fakeEncounters },
    { provide: AuditService, useValue: fakeAudit },
    { provide: PublishNotificationsUseCase, useValue: fakePublish },
    CarePlanAccessService,
    GetOrCreateCarePlanUseCase,
    ListFollowUpActivitiesUseCase,
    CreateFollowUpActivityUseCase,
    AdvanceFollowUpActivityUseCase,
    ConfirmFollowUpActivityUseCase,
    RunCarePlanAutomationUseCase,
  ],
})
class CarePlansTestModule {}

describe('care-plans (extracted from operations)', () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof NestFactory.create>>;

  before(async () => {
    app = await NestFactory.create(CarePlansTestModule, { logger: false, bodyParser: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => app.close());

  beforeEach(() => {
    fakeCarePlans.carePlans = new Map([[CARE_PLAN_ID, makeCarePlan()]]);
    fakeCarePlans.activities = new Map([[ACTIVITY_ID, makeActivity()]]);
    fakeAudit.calls = [];
    fakePublish.calls = [];
    currentPrincipal = null;
  });

  async function call(method: string, path: string, body?: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it('GET /patients/{id}/care-plan returns the existing plan (successful read path, response wire shape)', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('GET', `/api/v1/patients/${PATIENT_ID}/care-plan`);
    const body = (await response.json()) as { data: Record<string, unknown> };
    assert.equal(response.status, 200);
    assert.equal(body.data.id, CARE_PLAN_ID);
    assert.equal(body.data.patientId, PATIENT_ID);
    assert.equal(body.data.encounterId, ENCOUNTER_ID);
    assert.equal(typeof body.data.createdAt, 'string');
  });

  it('GET /patients/{id}/care-plan auto-creates a plan when none exists', async () => {
    currentPrincipal = principal('care_coordinator');
    fakeCarePlans.carePlans = new Map();
    const response = await call('GET', `/api/v1/patients/${PATIENT_ID}/care-plan`);
    const body = (await response.json()) as { data: Record<string, unknown> };
    assert.equal(response.status, 200);
    assert.equal(body.data.encounterId, ENCOUNTER_ID);
  });

  it('GET /patients/{id}/care-plan returns 404 for a patient the actor cannot see (not-found behavior)', async () => {
    currentPrincipal = principal('care_coordinator');
    const unknownPatientId = '99999999-9999-4999-8999-999999999999';
    const response = await call('GET', `/api/v1/patients/${unknownPatientId}/care-plan`);
    assert.equal(response.status, 404);
  });

  it('GET /care-plans/{id}/activities lists activities (successful list path)', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('GET', `/api/v1/care-plans/${CARE_PLAN_ID}/activities`);
    const body = (await response.json()) as { data: Record<string, unknown>[] };
    assert.equal(response.status, 200);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, ACTIVITY_ID);
  });

  it('POST /care-plans/{id}/activities creates an activity (successful write path, status code preservation: 201)', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/care-plans/${CARE_PLAN_ID}/activities`, {
      type: 'lifestyle_guidance',
      title: 'Walk daily',
      description: '30 minutes',
      dueDate: new Date().toISOString(),
      priority: 'normal',
    });
    const body = (await response.json()) as { data: Record<string, unknown> };
    assert.equal(response.status, 201);
    assert.equal(body.data.title, 'Walk daily');
    assert.equal(body.data.status, 'scheduled');
    assert.equal(fakeAudit.calls.length, 1);
  });

  it('POST /care-plans/{id}/activities returns 400 for invalid input (missing required field)', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/care-plans/${CARE_PLAN_ID}/activities`, {
      title: 'Missing type/description/dueDate/priority',
    });
    assert.equal(response.status, 400);
  });

  it('POST /care-plans/{id}/activities returns 403 for a role with no create permission (unauthorized actor)', async () => {
    currentPrincipal = principal('patient');
    const response = await call('POST', `/api/v1/care-plans/${CARE_PLAN_ID}/activities`, {
      type: 'lifestyle_guidance',
      title: 'Walk daily',
      description: '30 minutes',
      dueDate: new Date().toISOString(),
      priority: 'normal',
    });
    assert.equal(response.status, 403);
  });

  it('POST /activities/{id}/advance follows the allowed state machine', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/activities/${ACTIVITY_ID}/advance`, {
      toStatus: 'due',
    });
    const body = (await response.json()) as { data: Record<string, unknown> };
    assert.equal(response.status, 201);
    assert.equal(body.data.status, 'due');
  });

  it('POST /activities/{id}/advance returns 409 for a disallowed transition (state/scheduling rule)', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/activities/${ACTIVITY_ID}/advance`, {
      toStatus: 'completed',
    });
    const body = (await response.json()) as { code?: string };
    assert.equal(response.status, 409);
    assert.equal(body.code, 'INVALID_STATE_TRANSITION');
  });

  it('POST /activities/{id}/confirm requires the patient role', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/activities/${ACTIVITY_ID}/confirm`);
    assert.equal(response.status, 403);
  });

  it('POST /activities/{id}/confirm succeeds for the patient role and jumps version by 2 from scheduled', async () => {
    currentPrincipal = principal('patient');
    const response = await call('POST', `/api/v1/activities/${ACTIVITY_ID}/confirm`);
    const body = (await response.json()) as { data: Record<string, unknown> };
    assert.equal(response.status, 201);
    assert.equal(body.data.status, 'completed');
    assert.equal(body.data.version, 3);
  });

  it('POST /activities/{id}/advance returns 400 for a malformed activity id', async () => {
    currentPrincipal = principal('care_coordinator');
    const response = await call('POST', `/api/v1/activities/not-a-uuid/advance`, { toStatus: 'due' });
    assert.equal(response.status, 400);
  });

  it('POST /activities/{id}/advance returns 404 for a well-formed but unknown activity id', async () => {
    currentPrincipal = principal('care_coordinator');
    const unknownActivityId = '88888888-8888-4888-8888-888888888888';
    const response = await call('POST', `/api/v1/activities/${unknownActivityId}/advance`, {
      toStatus: 'due',
    });
    assert.equal(response.status, 404);
  });

  it('POST /care-plans/{id}/run-automation publishes notifications for eligible activities and marks them automated (notification side effect)', async () => {
    currentPrincipal = principal('medical_administrator');
    const response = await call('POST', `/api/v1/care-plans/${CARE_PLAN_ID}/run-automation`);
    const body = (await response.json()) as { data: { processed: number; notifications: number } };
    assert.equal(response.status, 201);
    assert.equal(body.data.processed, 1);
    assert.equal(body.data.notifications, 1);
    assert.equal(fakePublish.calls.length, 1);
    assert.equal((fakePublish.calls[0][0] as { recipientId: string }).recipientId, PATIENT_USER_ID);
    assert.equal(
      (fakeCarePlans.activities.get(ACTIVITY_ID) as { automationRunCount: number })
        .automationRunCount,
      1,
    );
  });

  it('POST /care-plans/{id}/run-automation is forbidden for a role without automation permission', async () => {
    currentPrincipal = principal('receptionist');
    const response = await call('POST', `/api/v1/care-plans/${CARE_PLAN_ID}/run-automation`);
    assert.equal(response.status, 403);
    assert.equal(fakePublish.calls.length, 0);
  });
});
