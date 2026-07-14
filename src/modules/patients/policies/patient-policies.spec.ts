import { AuthenticatedPrincipal } from '../../../common/auth/auth.types';
import { ForbiddenAppError } from '../../../common/errors/app-error';
import {
  assertCanChangeConsent,
  assertUpdateFieldsAllowed,
  canViewConsentReadOnly,
  resolvePatientListScope,
  viewOrgWideOrganizationIds,
} from './patient-policies';

const ORG = 'org-1';
const OTHER_ORG = 'org-2';

function principalWith(userId: string, ...roles: Array<[string, string?]>): AuthenticatedPrincipal {
  return {
    userId,
    email: `${userId}@example.test`,
    displayName: userId,
    memberships: roles.map(([role, orgId]) => ({
      organizationId: orgId ?? ORG,
      clinicLocationId: null,
      departmentId: null,
      role: role as never,
    })),
  };
}

describe('resolvePatientListScope', () => {
  it('super_administrator gets unrestricted scope', () => {
    const p = principalWith('u1', ['super_administrator']);
    expect(resolvePatientListScope(p)).toEqual({ mode: 'all' });
  });

  it('receptionist/medical_administrator/doctor/nurse get org-scoped access', () => {
    for (const role of ['receptionist', 'medical_administrator', 'doctor', 'nurse']) {
      const p = principalWith('u1', [role]);
      expect(resolvePatientListScope(p)).toEqual({ mode: 'organizations', organizationIds: [ORG] });
    }
  });

  it('a plain patient role is forced to self scope', () => {
    const p = principalWith('u1', ['patient']);
    expect(resolvePatientListScope(p)).toEqual({ mode: 'self' });
  });

  it('roles with no patient-list access are rejected', () => {
    for (const role of [
      'lab_technician',
      'pharmacist',
      'system_administrator',
      'customer_care_employee',
    ]) {
      const p = principalWith('u1', [role]);
      expect(() => resolvePatientListScope(p)).toThrow(ForbiddenAppError);
    }
  });

  it('combines organization IDs across multiple staff memberships', () => {
    const p = principalWith('u1', ['receptionist', ORG], ['doctor', OTHER_ORG]);
    const scope = resolvePatientListScope(p);
    expect(scope.mode).toBe('organizations');
    if (scope.mode === 'organizations') {
      expect(scope.organizationIds.sort()).toEqual([ORG, OTHER_ORG].sort());
    }
  });
});

describe('viewOrgWideOrganizationIds', () => {
  it('only counts medical_administrator/receptionist roles', () => {
    const p = principalWith('u1', ['doctor'], ['medical_administrator']);
    expect(viewOrgWideOrganizationIds(p)).toEqual([ORG]);
  });

  it('returns empty for a patient-only principal', () => {
    const p = principalWith('u1', ['patient']);
    expect(viewOrgWideOrganizationIds(p)).toEqual([]);
  });
});

describe('assertUpdateFieldsAllowed', () => {
  const patient = { userId: 'patient-user', organizationId: ORG };

  it('allows medical_administrator to touch any field', () => {
    const p = principalWith('admin-1', ['medical_administrator']);
    expect(() =>
      assertUpdateFieldsAllowed(p, patient, ['name', 'primaryDoctorId', 'bloodType']),
    ).not.toThrow();
  });

  it('allows the patient themself to edit contact fields only', () => {
    const p = principalWith('patient-user', ['patient']);
    expect(() =>
      assertUpdateFieldsAllowed(p, patient, ['phone', 'email', 'address']),
    ).not.toThrow();
  });

  it('rejects the patient attempting to edit non-contact fields (no silent drop)', () => {
    const p = principalWith('patient-user', ['patient']);
    expect(() => assertUpdateFieldsAllowed(p, patient, ['phone', 'primaryDoctorId'])).toThrow(
      ForbiddenAppError,
    );
  });

  it('rejects an unrelated actor entirely', () => {
    const p = principalWith('someone-else', ['patient']);
    expect(() => assertUpdateFieldsAllowed(p, patient, ['phone'])).toThrow(ForbiddenAppError);
  });

  it('receptionist may edit contact fields only, and only within their own org', () => {
    const inOrg = principalWith('reception-1', ['receptionist', ORG]);
    expect(() => assertUpdateFieldsAllowed(inOrg, patient, ['phone', 'address'])).not.toThrow();

    const outOfOrg = principalWith('reception-2', ['receptionist', OTHER_ORG]);
    expect(() => assertUpdateFieldsAllowed(outOfOrg, patient, ['phone'])).toThrow(
      ForbiddenAppError,
    );
  });

  it('receptionist cannot reassign primaryDoctorId', () => {
    const p = principalWith('reception-1', ['receptionist', ORG]);
    expect(() => assertUpdateFieldsAllowed(p, patient, ['primaryDoctorId'])).toThrow(
      ForbiddenAppError,
    );
  });
});

describe('assertCanChangeConsent / canViewConsentReadOnly', () => {
  const patient = { userId: 'patient-user', organizationId: ORG };

  it('only the patient themself can grant/withdraw consent', () => {
    const self = principalWith('patient-user', ['patient']);
    expect(() => assertCanChangeConsent(self, patient)).not.toThrow();

    const admin = principalWith('admin-1', ['medical_administrator']);
    expect(() => assertCanChangeConsent(admin, patient)).toThrow(ForbiddenAppError);
  });

  it('medical_administrator may view (not change) consent read-only, org-scoped', () => {
    const adminInOrg = principalWith('admin-1', ['medical_administrator', ORG]);
    expect(canViewConsentReadOnly(adminInOrg, patient)).toBe(true);

    const adminOutOfOrg = principalWith('admin-2', ['medical_administrator', OTHER_ORG]);
    expect(canViewConsentReadOnly(adminOutOfOrg, patient)).toBe(false);
  });

  it('an unrelated actor cannot view consent', () => {
    const p = principalWith('nobody', ['receptionist', ORG]);
    expect(canViewConsentReadOnly(p, patient)).toBe(false);
  });
});
