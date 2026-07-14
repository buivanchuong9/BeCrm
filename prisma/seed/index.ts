import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Deterministic, idempotent development seed. Keyed by natural codes (org/clinic/
 * department code, user email) via upsert, so re-running never duplicates rows.
 *
 * Corrects the frontend's confirmed seed defects (spec section 37/45): every
 * seeded user gets a unique identity instead of the frontend's duplicated
 * `U-0014`/`U-0015` ids, and the implicit single clinic (`CS-HCM-01` /
 * "DermaHealth TP.HCM") becomes a real ClinicLocation row instead of a free string.
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
    where: { organizationId_code: { organizationId: organization.id, code: 'CS-HCM-01' } },
    update: { name: 'DermaHealth TP.HCM', status: 'active' },
    create: {
      organizationId: organization.id,
      code: 'CS-HCM-01',
      name: 'DermaHealth TP.HCM',
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
    { email: 'nguyenvana@example.test', displayName: 'Nguyễn Văn A', role: 'patient', clinicScoped: false },
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
      email: 'buivanchuong.ma@example.test',
      displayName: 'Bùi Văn Chương',
      role: 'medical_administrator',
      departmentCode: 'QUAN-TRI-YT',
      clinicScoped: false,
    },
    {
      email: 'daovanduong.ma@example.test',
      displayName: 'Đào Văn Dương',
      role: 'medical_administrator',
      departmentCode: 'QUAN-TRI-YT',
      clinicScoped: false,
    },
    {
      email: 'nguyenmanhcuong.ma@example.test',
      displayName: 'Nguyễn Mạnh Cường',
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
    {
      email: 'daovanduong.sa@example.test',
      displayName: 'Đào Văn Dương',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'nguyenmanhcuong.sa@example.test',
      displayName: 'Nguyễn Mạnh Cường',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'phamthihongchuc@example.test',
      displayName: 'Phạm Thị Hồng Chúc',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
    {
      email: 'buivanchuong.sa@example.test',
      displayName: 'Bùi Văn Chương',
      role: 'super_administrator',
      departmentCode: 'BQT-HE-THONG',
      clinicScoped: false,
    },
  ];

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

  // eslint-disable-next-line no-console
  console.log(`Seed complete: organization=${organization.code}, clinic=${clinic.code}, users=${users.length}`);
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
