import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  PERMISSION_CATALOG,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../src/common/authorization/permissions.catalog';
import { FEATURE_FLAG_CATALOG } from '../../src/common/authorization/feature-flags.catalog';

/**
 * Deterministic, idempotent development seed. Keyed by natural codes (org/clinic/
 * department code, user email) via upsert, so re-running never duplicates rows.
 *
 * Corrects the frontend's confirmed seed defects (spec section 37/45): every
 * seeded user gets a unique identity instead of the frontend's duplicated
 * `U-0014`/`U-0015` ids, and the implicit single clinic (`CS-HN-01` /
 * "DermaHealth Hà Nội") becomes a real ClinicLocation row instead of a free
 * string.
 *
 * Also fixes a real defect the previous version of this file had: 'Asia/Hà
 * Nội' is not a valid IANA timezone identifier (accented characters aren't
 * legal in tzdata zone names — the only real zone covering Vietnam is
 * 'Asia/Ho_Chi_Minh'). Any timezone-aware date library given the old string
 * would throw or silently fall back to UTC.
 */

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seed: NODE_ENV=production.');
  }
  const seedPassword = process.env.SEED_DEMO_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_DEMO_PASSWORD must be set to run the development seed.');
  }
  const pepper = process.env.PASSWORD_PEPPER ?? '';
  const passwordHash = await argon2.hash(`${seedPassword}${pepper}`, { type: argon2.argon2id });

  const organization = await prisma.organization.upsert({
    where: { code: 'dermahealth' },
    update: { name: 'DermaHealth', timezone: 'Asia/Ho_Chi_Minh' },
    create: { code: 'dermahealth', name: 'DermaHealth', timezone: 'Asia/Ho_Chi_Minh' },
  });

  const clinic = await prisma.clinicLocation.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'CS-HN-01' } },
    update: { name: 'DermaHealth Hà Nội', status: 'active' },
    create: {
      organizationId: organization.id,
      code: 'CS-HN-01',
      name: 'DermaHealth Hà Nội',
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'active',
    },
  });

  const departmentDefs: Array<{ code: string; name: string }> = [
    { code: 'KHOA-DA-LIEU', name: 'Khoa Da liễu' },
    { code: 'KHOA-DA-LIEU-TM', name: 'Khoa Da liễu thẩm mỹ' },
    { code: 'TIEP-DON', name: 'Tiếp đón' },
    { code: 'XET-NGHIEM', name: 'Xét nghiệm' },
    { code: 'CDHA', name: 'Chẩn đoán hình ảnh' },
    { code: 'DUOC', name: 'Dược' },
    { code: 'DIEU-PHOI-CS', name: 'Điều phối chăm sóc' },
    { code: 'CSKH', name: 'Chăm sóc khách hàng' },
    { code: 'QUAN-TRI-YT', name: 'Quản trị y tế' },
    { code: 'CNTT', name: 'CNTT' },
    { code: 'BQT-HE-THONG', name: 'Ban quản trị hệ thống' },
    { code: 'THIET-KE-QT', name: 'Thiết kế quy trình' },
  ];

  const departments = new Map<string, { id: string }>();
  for (const def of departmentDefs) {
    const dept = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: def.code } },
      update: { name: def.name, clinicLocationId: clinic.id },
      create: {
        organizationId: organization.id,
        clinicLocationId: clinic.id,
        code: def.code,
        name: def.name,
      },
    });
    departments.set(def.code, dept);
  }

  interface SeedUser {
    email: string;
    displayName: string;
    role: UserRole;
    departmentCode?: string;
    clinicScoped: boolean;
  }

  const users: SeedUser[] = [
    {
      email: 'nguyenvana@example.test',
      displayName: 'Nguyễn Văn A',
      role: 'patient',
      clinicScoped: false,
    },
    {
      email: 'bs.nguyenthian@example.test',
      displayName: 'Bs. Nguyễn Thị An',
      role: 'doctor',
      departmentCode: 'KHOA-DA-LIEU',
      clinicScoped: true,
    },
    {
      email: 'bs.tranvannam@example.test',
      displayName: 'Bs. Trần Văn Nam',
      role: 'doctor',
      departmentCode: 'KHOA-DA-LIEU-TM',
      clinicScoped: true,
    },
    {
      email: 'dd.tranthibich@example.test',
      displayName: 'ĐD. Trần Thị Bích',
      role: 'nurse',
      departmentCode: 'KHOA-DA-LIEU',
      clinicScoped: true,
    },
    {
      email: 'phamthihoa@example.test',
      displayName: 'Phạm Thị Hoa',
      role: 'receptionist',
      departmentCode: 'TIEP-DON',
      clinicScoped: true,
    },
    {
      email: 'ktv.levanson@example.test',
      displayName: 'KTV. Lê Văn Sơn',
      role: 'lab_technician',
      departmentCode: 'XET-NGHIEM',
      clinicScoped: true,
    },
    {
      email: 'ktv.dothimai@example.test',
      displayName: 'KTV. Đỗ Thị Mai',
      role: 'imaging_technician',
      departmentCode: 'CDHA',
      clinicScoped: true,
    },
    {
      email: 'ds.vuvanlong@example.test',
      displayName: 'DS. Vũ Văn Long',
      role: 'pharmacist',
      departmentCode: 'DUOC',
      clinicScoped: true,
    },
    {
      email: 'ngothilan@example.test',
      displayName: 'Ngô Thị Lan',
      role: 'care_coordinator',
      departmentCode: 'DIEU-PHOI-CS',
      clinicScoped: true,
    },
    {
      email: 'buivantung@example.test',
      displayName: 'Bùi Văn Tùng',
      role: 'customer_care_employee',
      departmentCode: 'CSKH',
      clinicScoped: true,
    },
    {
      email: 'lythingoc@example.test',
      displayName: 'Lý Thị Ngọc',
      role: 'medical_administrator',
      departmentCode: 'QUAN-TRI-YT',
      clinicScoped: false,
    },
    {
      email: 'hoangvanbinh@example.test',
      displayName: 'Hoàng Văn Bình',
      role: 'medical_administrator',
      departmentCode: 'QUAN-TRI-YT',
      clinicScoped: false,
    },
    {
      email: 'vuthikimanh@example.test',
      displayName: 'Vũ Thị Kim Anh',
      role: 'medical_administrator',
      departmentCode: 'QUAN-TRI-YT',
      clinicScoped: false,
    },
    {
      email: 'trinhvanduc@example.test',
      displayName: 'Trịnh Văn Đức',
      role: 'system_administrator',
      departmentCode: 'CNTT',
      clinicScoped: false,
    },
    {
      email: 'dangthithu@example.test',
      displayName: 'Đặng Thị Thu',
      role: 'clinical_process_designer',
      departmentCode: 'THIET-KE-QT',
      clinicScoped: false,
    },
    // The 4 platform Owners (docs permission model box 2: "4 tài khoản quyền
    // cao nhất") — each a distinct account with its own email, own MFA
    // (enrolled separately after first login, see MfaService), own audit
    // trail (AuditEvent.actorId), never shared credentials. All based in Hà
    // Nội. Any action tagged `dangerous: true` in the permission catalog
    // requires 2 of these 4 to approve (see DangerousActionsService) — no
    // single Owner account can execute one alone.
    {
      email: 'buivanchuong@dermahealth.vn',
      displayName: 'Bùi Văn Chương',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'nguyenmanhcuong@dermahealth.vn',
      displayName: 'Nguyễn Mạnh Cường',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'daovanduong@dermahealth.vn',
      displayName: 'Đào Văn Dương',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'phamthihongchuc@dermahealth.vn',
      displayName: 'Phạm Thị Hồng Chúc',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
  ];

  const userIdByEmail = new Map<string, string>();

  for (const def of users) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: { displayName: def.displayName, status: 'active', passwordHash },
      create: {
        email: def.email,
        displayName: def.displayName,
        status: 'active',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    userIdByEmail.set(def.email, user.id);

    const departmentId = def.departmentCode ? (departments.get(def.departmentCode)?.id ?? null) : null;
    const clinicLocationId = def.clinicScoped ? clinic.id : null;

    // Postgres unique constraints treat NULL as distinct per row, so the
    // (user, org, clinic, role) DB constraint cannot dedupe org-wide memberships
    // (clinicLocationId = NULL) via upsert's ON CONFLICT path. Look the row up
    // explicitly instead, so re-running the seed never inserts a duplicate.
    const existingMembership = await prisma.userMembership.findFirst({
      where: { userId: user.id, organizationId: organization.id, clinicLocationId, role: def.role },
    });
    if (existingMembership) {
      await prisma.userMembership.update({
        where: { id: existingMembership.id },
        data: { status: 'active', departmentId },
      });
    } else {
      await prisma.userMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          clinicLocationId,
          departmentId,
          role: def.role,
          status: 'active',
        },
      });
    }
  }

  // T05 practitioner identities extend the existing doctor users one-to-one.
  // Clinic assignments and recurring schedules are keyed by stable natural
  // fields so this block remains idempotent when the seed is run repeatedly.
  const dermatology = await prisma.specialty.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'DERMATOLOGY' } },
    update: { name: 'Da liễu', active: true },
    create: { organizationId: organization.id, code: 'DERMATOLOGY', name: 'Da liễu' },
  });
  const doctorSeeds = [
    { email: 'bs.nguyenthian@example.test', license: 'DH-BS-0001', departmentCode: 'KHOA-DA-LIEU' },
    { email: 'bs.tranvannam@example.test', license: 'DH-BS-0002', departmentCode: 'KHOA-DA-LIEU-TM' },
  ];
  for (const doctorSeed of doctorSeeds) {
    const doctorId = userIdByEmail.get(doctorSeed.email);
    const department = departments.get(doctorSeed.departmentCode);
    if (!doctorId || !department) throw new Error(`Missing practitioner seed dependency: ${doctorSeed.email}`);
    await prisma.practitionerProfile.upsert({
      where: { userId: doctorId },
      update: { licenseNumber: doctorSeed.license, status: 'active', title: 'Bác sĩ' },
      create: { userId: doctorId, licenseNumber: doctorSeed.license, status: 'active', title: 'Bác sĩ' },
    });
    await prisma.practitionerSpecialty.upsert({
      where: { practitionerUserId_specialtyId: { practitionerUserId: doctorId, specialtyId: dermatology.id } },
      update: { primary: true },
      create: { practitionerUserId: doctorId, specialtyId: dermatology.id, primary: true },
    });
    const assignment = await prisma.practitionerClinicAssignment.upsert({
      where: {
        practitionerUserId_clinicLocationId_departmentId: {
          practitionerUserId: doctorId,
          clinicLocationId: clinic.id,
          departmentId: department.id,
        },
      },
      update: { active: true, slotDurationMinutes: 30, capacity: 1 },
      create: {
        practitionerUserId: doctorId,
        organizationId: organization.id,
        clinicLocationId: clinic.id,
        departmentId: department.id,
        slotDurationMinutes: 30,
        capacity: 1,
      },
    });
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      const existingSchedule = await prisma.practitionerSchedule.findFirst({
        where: {
          assignmentId: assignment.id,
          dayOfWeek,
          startMinute: 8 * 60,
          endMinute: 17 * 60,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
      if (existingSchedule) {
        await prisma.practitionerSchedule.update({
          where: { id: existingSchedule.id },
          data: { active: true, effectiveTo: null },
        });
      } else {
        await prisma.practitionerSchedule.create({
          data: {
            assignmentId: assignment.id,
            dayOfWeek,
            startMinute: 8 * 60,
            endMinute: 17 * 60,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          },
        });
      }
    }
  }

  // T04: one seeded patient, correcting the frontend's single seed patient
  // (seed.ts PT-1029 "Nguyễn Văn A") — gender normalized from the frontend's
  // Vietnamese 'Nam' literal to the API's 'male'/'female'/'other'/'unknown'
  // enum, and the frontend's real-looking @gmail.com contact email replaced
  // with the same fictional @example.test address used for the account login.
  const patientUserId = userIdByEmail.get('nguyenvana@example.test');
  const primaryDoctorId = userIdByEmail.get('bs.nguyenthian@example.test');
  if (!patientUserId || !primaryDoctorId) {
    throw new Error('Expected seeded patient/doctor users to exist before creating the Patient row.');
  }

  const patient = await prisma.patient.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'PT-1029' } },
    update: {
      userId: patientUserId,
      name: 'Nguyễn Văn A',
      dob: new Date('1995-03-15T00:00:00.000Z'),
      gender: 'male',
      phone: '0912 345 678',
      email: 'nguyenvana@example.test',
      address: 'Q. Bình Thạnh, TP.HCM',
      bloodType: 'O+',
      primaryDoctorId,
    },
    create: {
      organizationId: organization.id,
      code: 'PT-1029',
      userId: patientUserId,
      name: 'Nguyễn Văn A',
      dob: new Date('1995-03-15T00:00:00.000Z'),
      gender: 'male',
      phone: '0912 345 678',
      email: 'nguyenvana@example.test',
      address: 'Q. Bình Thạnh, TP.HCM',
      bloodType: 'O+',
      primaryDoctorId,
    },
  });

  const existingPrimaryCareTeam = await prisma.patientCareTeamMember.findFirst({
    where: { patientId: patient.id, relationship: 'primary_doctor', endsAt: null },
  });
  if (!existingPrimaryCareTeam) {
    await prisma.patientCareTeamMember.create({
      data: { patientId: patient.id, userId: primaryDoctorId, relationship: 'primary_doctor' },
    });
  }

  // Matches seed.ts's three consent fixtures (CONSENT-1/2/3): two granted,
  // one withdrawn — proving the append-only grant/withdraw history round-trips.
  const consentDefs: Array<{
    type: 'data_processing' | 'research_data_sharing' | 'telemedicine';
    granted: boolean;
  }> = [
    { type: 'data_processing', granted: true },
    { type: 'research_data_sharing', granted: true },
    { type: 'telemedicine', granted: false },
  ];
  for (const def of consentDefs) {
    const now = new Date();
    await prisma.consent.upsert({
      where: { patientId_type: { patientId: patient.id, type: def.type } },
      update: {},
      create: {
        patientId: patient.id,
        type: def.type,
        policyVersion: '1.0',
        granted: def.granted,
        grantedAt: def.granted ? now : null,
        withdrawnAt: def.granted ? null : now,
      },
    });
  }

  // Permission catalog + default role→permission matrix (authorization
  // engine's "Role + Permission" box). Upserted so re-running the seed picks
  // up catalog additions without duplicating rows.
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description, dangerous: permission.dangerous ?? false },
      create: {
        code: permission.code,
        description: permission.description,
        dangerous: permission.dangerous ?? false,
      },
    });
  }
  for (const [role, permissionCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as Array<
    [UserRole, string[]]
  >) {
    for (const permissionCode of permissionCodes) {
      const existing = await prisma.rolePermission.findUnique({
        where: { role_permissionCode: { role, permissionCode } },
      });
      if (!existing) {
        await prisma.rolePermission.create({ data: { role, permissionCode } });
      }
    }
  }

  // Feature flag catalog ("Feature Flag" box) — platform-wide defaults only;
  // per-organization overrides are created at runtime via FeatureFlagsService.
  for (const flag of FEATURE_FLAG_CATALOG) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: { key: flag.key, description: flag.description, enabledDefault: flag.enabledDefault },
    });
  }

  // Singleton platform security posture row (audit-suspension state).
  await prisma.platformSecuritySetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed complete: organization=${organization.code}, clinic=${clinic.code}, users=${users.length}`);
  // eslint-disable-next-line no-console
  console.log(
    `${userIdByEmail.size} users, ${PERMISSION_CATALOG.length} permissions, ${FEATURE_FLAG_CATALOG.length} feature flags seeded.`,
  );
  // eslint-disable-next-line no-console
  console.log(`Development login password for every seeded user: value of SEED_DEMO_PASSWORD in .env`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
