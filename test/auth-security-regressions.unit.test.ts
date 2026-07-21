import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../src/modules/identity/auth.service';
import { StaffInvitationsService } from '../src/modules/identity/staff-invitations.service';
import { CreateSessionRequest } from '../src/modules/identity/dto/create-session.dto';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';

describe('CreateSessionRequest — frontend compatibility', () => {
  it('defaults an omitted rememberMe field to false', async () => {
    const request = plainToInstance(CreateSessionRequest, {
      email: 'owner@dermahealth.vn',
      password: 'a-valid-password',
    });

    assert.equal(request.rememberMe, false);
    assert.deepEqual(await validate(request), []);
  });

  it('still rejects a non-boolean rememberMe field', async () => {
    const request = plainToInstance(CreateSessionRequest, {
      email: 'owner@dermahealth.vn',
      password: 'a-valid-password',
      rememberMe: 'false',
    });

    const errors = await validate(request);
    assert.equal(
      errors.some((error) => error.property === 'rememberMe'),
      true,
    );
  });
});

function baseUser() {
  return {
    id: USER_ID,
    email: 'patient@example.com',
    displayName: 'Patient',
    status: 'active',
    passwordHash: 'stored-hash',
    lockedUntil: null,
    memberships: [
      { organizationId: ORG_ID, clinicLocationId: null, departmentId: null, role: 'patient' },
    ],
  };
}

describe('AuthService.refresh — rotation race condition (SECURITY FIX)', () => {
  function buildService(markRotatedCount: number) {
    const revokeFamilyCalls: unknown[] = [];
    const createInFamilyCalls: unknown[] = [];
    const fakeRefreshSessions = {
      async findByTokenHash() {
        return {
          id: 'session-1',
          familyId: 'family-1',
          userId: USER_ID,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        };
      },
      async markRotated() {
        return { count: markRotatedCount };
      },
      async createInFamily(...args: unknown[]) {
        createInFamilyCalls.push(args);
        return { id: 'session-2' };
      },
      async revokeFamily(...args: unknown[]) {
        revokeFamilyCalls.push(args);
      },
    };
    const fakeUsers = {
      async findByIdWithMemberships() {
        return baseUser();
      },
      toMembershipScopes(u: ReturnType<typeof baseUser>) {
        return u.memberships;
      },
    };
    const fakeTokenService = {
      signAccessToken: () => ({ token: 'access', expiresInSeconds: 600 }),
      issueRefreshToken: () => ({
        rawToken: 'new-raw-token',
        tokenHash: 'new-hash',
        expiresAt: new Date(),
      }),
    };
    const fakeAudit = { write: async () => undefined };
    const service = new AuthService(
      fakeUsers as never,
      fakeRefreshSessions as never,
      {} as never,
      fakeTokenService as never,
      fakeAudit as never,
    );
    return { service, revokeFamilyCalls, createInFamilyCalls };
  }

  it('REGRESSION: the winner of the CAS (markRotated count=1) issues new tokens', async () => {
    const { service, createInFamilyCalls } = buildService(1);
    const result = await service.refresh('raw-token', false, {});
    assert.equal(result.accessToken, 'access');
    assert.equal(createInFamilyCalls.length, 1);
  });

  it('REGRESSION: the loser of the CAS (markRotated count=0) is treated as reuse, not a silent second success', async () => {
    const { service, revokeFamilyCalls, createInFamilyCalls } = buildService(0);
    await assert.rejects(
      () => service.refresh('raw-token', false, {}),
      (err: Error & { code?: string }) => {
        assert.equal(err.code, 'AUTH_REFRESH_REUSED');
        return true;
      },
    );
    // The whole family must be revoked, and no second child session created —
    // this is exactly the fork that was previously possible.
    assert.equal(revokeFamilyCalls.length, 1);
    assert.equal(createInFamilyCalls.length, 0);
  });
});

describe('AuthService.login — timing side channel (SECURITY FIX)', () => {
  function buildService(userExists: boolean) {
    const verifyDummyCalls: string[] = [];
    const verifyCalls: string[] = [];
    const fakeUsers = {
      async findByEmailWithMemberships() {
        return userExists ? baseUser() : null;
      },
      async registerFailedLogin() {},
      async resetFailedLogin() {},
      toMembershipScopes(u: ReturnType<typeof baseUser>) {
        return u.memberships;
      },
    };
    const fakePasswordService = {
      async verify(_hash: string, password: string) {
        verifyCalls.push(password);
        return false;
      },
      async verifyDummy(password: string) {
        verifyDummyCalls.push(password);
      },
    };
    const fakeTokenService = {
      signAccessToken: () => ({ token: 'access', expiresInSeconds: 600 }),
      issueRefreshToken: () => ({ rawToken: 'raw', tokenHash: 'hash', expiresAt: new Date() }),
    };
    const fakeRefreshSessions = { async createFamily() {} };
    const fakeAudit = { write: async () => undefined };
    const service = new AuthService(
      fakeUsers as never,
      fakeRefreshSessions as never,
      fakePasswordService as never,
      fakeTokenService as never,
      fakeAudit as never,
    );
    return { service, verifyDummyCalls, verifyCalls };
  }

  it('REGRESSION: an unknown email now pays the same argon2 cost as a known email (verifyDummy is called)', async () => {
    const { service, verifyDummyCalls } = buildService(false);
    await assert.rejects(() => service.login('nobody@example.com', 'whatever', false, {}));
    assert.equal(verifyDummyCalls.length, 1);
    assert.equal(verifyDummyCalls[0], 'whatever');
  });

  it('a known email with the wrong password still calls the real verify (no change in behavior)', async () => {
    const { service, verifyCalls, verifyDummyCalls } = buildService(true);
    await assert.rejects(() => service.login('patient@example.com', 'wrong-password', false, {}));
    assert.equal(verifyCalls.length, 1);
    assert.equal(verifyDummyCalls.length, 0);
  });
});

describe('StaffInvitationsService.listPending — internal secret exposure (SECURITY FIX)', () => {
  it('REGRESSION: the Prisma select never includes tokenHash', async () => {
    let capturedArgs: { select?: Record<string, unknown> } | undefined;
    const fakePrisma = {
      staffInvitation: {
        findMany: async (args: { select?: Record<string, unknown> }) => {
          capturedArgs = args;
          return [];
        },
      },
    };
    const service = new StaffInvitationsService(
      fakePrisma as never,
      {} as never,
      { write: async () => undefined } as never,
      { get: () => 'http://localhost' } as never,
    );
    await service.listPending(ORG_ID);
    assert.ok(capturedArgs?.select, 'expected an explicit select clause');
    assert.equal(capturedArgs?.select?.tokenHash, undefined);
    assert.equal(capturedArgs?.select?.email, true);
  });
});
