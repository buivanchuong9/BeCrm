import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ConflictAppError } from '../src/common/errors/app-error';
import '../src/common/http/request-id.middleware';
import { PolicyEngineService } from '../src/common/authorization/policy-engine.service';
import { configureApp } from '../src/bootstrap';
import { AuthController } from '../src/modules/identity/auth.controller';
import { AuthService } from '../src/modules/identity/auth.service';
import { PasswordResetService } from '../src/modules/identity/password-reset.service';
import { PasswordService } from '../src/modules/identity/password.service';
import { RegistrationService } from '../src/modules/identity/registration.service';
import { StaffInvitationsService } from '../src/modules/identity/staff-invitations.service';
import { TokenService } from '../src/modules/identity/token.service';
import { UsersRepository } from '../src/modules/identity/users.repository';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_ID = '22222222-2222-4222-8222-222222222222';

interface TestResponseBody {
  success: boolean;
  code?: string;
  errors?: Record<string, string>;
  data?: {
    mode?: string;
    user?: { displayName?: string; name?: string };
  };
}

const config = {
  get(key: string) {
    const values: Record<string, unknown> = {
      frontendOrigins: [FRONTEND_ORIGIN],
      isProduction: false,
      requestBodyLimit: '1mb',
      auth: { cookieSecure: false, cookieSameSite: 'lax', cookieDomain: undefined },
    };
    return values[key];
  },
};

const user = {
  id: USER_ID,
  email: 'patient@example.com',
  displayName: 'Patient Example',
  phone: '+84901234567',
  status: 'active',
  version: 1,
  memberships: [
    {
      organizationId: ORGANIZATION_ID,
      clinicLocationId: null,
      departmentId: null,
      role: 'patient',
    },
  ],
};

const registration = {
  async registerPatient(dto: { email: string; displayName: string }) {
    if (dto.email === 'duplicate@example.com') {
      throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
    }
    return {
      accessToken: 'access-token-for-test',
      accessTokenExpiresInSeconds: 600,
      refreshToken: 'refresh-token-for-test',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
      user: { ...user, email: dto.email, displayName: dto.displayName },
    };
  },
};

const users = {
  toMembershipScopes(value: typeof user) {
    return value.memberships;
  },
};

@Module({
  controllers: [AuthController],
  providers: [
    { provide: ConfigService, useValue: config },
    { provide: AuthService, useValue: {} },
    { provide: RegistrationService, useValue: registration },
    { provide: PasswordService, useValue: {} },
    { provide: PasswordResetService, useValue: {} },
    { provide: UsersRepository, useValue: users },
    { provide: StaffInvitationsService, useValue: {} },
    { provide: TokenService, useValue: { verifyAccessToken: () => null } },
    { provide: PolicyEngineService, useValue: {} },
  ],
})
class RegistrationTestModule {}

describe('POST /api/v1/auth/registrations', () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof NestFactory.create>>;

  before(async () => {
    app = await NestFactory.create(RegistrationTestModule, {
      logger: false,
      bodyParser: false,
    });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => app.close());

  const validBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'patient@example.com',
    password: 'Correct-Horse-42',
    displayName: 'Patient Example',
    dob: '1995-03-15',
    gender: 'female',
    phone: '+84901234567',
    organizationId: ORGANIZATION_ID,
    ...overrides,
  });

  async function post(body: Record<string, unknown>) {
    return fetch(`${baseUrl}/api/v1/auth/registrations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: FRONTEND_ORIGIN },
      body: JSON.stringify(body),
    });
  }

  it('registers a patient successfully', async () => {
    const response = await post(validBody());
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data?.mode, 'registered');
    assert.equal(body.data?.user?.displayName, 'Patient Example');
    assert.equal(body.data?.user?.name, 'Patient Example');
    assert.match(response.headers.get('set-cookie') ?? '', /^refresh_token=/);
  });

  it('accepts legacy name as a backward-compatible alias', async () => {
    const payload = validBody({ name: 'Legacy Patient' });
    delete payload.displayName;
    const response = await post(payload);
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 201);
    assert.equal(body.data?.user?.displayName, 'Legacy Patient');
  });

  it('returns 409 for a duplicate email', async () => {
    const response = await post(validBody({ email: 'duplicate@example.com' }));
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.code, 'CONFLICT');
  });

  it('returns 400 for an invalid email', async () => {
    const response = await post(validBody({ email: 'not-an-email' }));
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 400);
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(body.errors?.email);
  });

  it('returns 400 for a weak password', async () => {
    const response = await post(validBody({ password: 'short' }));
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 400);
    assert.equal(body.errors?.password, 'Password must be at least 12 characters.');
  });

  it('returns 400 when a field has the wrong type', async () => {
    const response = await post(validBody({ phone: 12345 }));
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 400);
    assert.ok(body.errors?.phone);
  });

  it('returns 400 when displayName and its legacy alias are missing', async () => {
    const payload = validBody();
    delete payload.displayName;
    const response = await post(payload);
    const body = (await response.json()) as TestResponseBody;
    assert.equal(response.status, 400);
    assert.equal(body.errors?.displayName, 'Display name is required.');
  });

  it('handles an OPTIONS preflight with the complete CORS contract', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/registrations`, {
      method: 'OPTIONS',
      headers: {
        origin: FRONTEND_ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-request-id',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('access-control-allow-methods') ?? '', /POST/);
    assert.match(response.headers.get('access-control-allow-headers') ?? '', /Content-Type/i);
  });

  it('adds CORS and request-id headers to normal responses', async () => {
    const response = await post(validBody());
    const body = (await response.json()) as { requestId: string };
    assert.equal(response.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.match(response.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/i);
    assert.equal(body.requestId, response.headers.get('x-request-id'));
  });
});
