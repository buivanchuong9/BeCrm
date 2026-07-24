import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Seeds realistic (fictional) dermatologist profiles for demo/UAT purposes:
 * organization -> clinic location -> department -> specialties -> doctors
 * (User + PractitionerProfile + specialties + clinic assignment).
 *
 * Idempotent: safe to re-run. Matches an existing organization by
 * ORG_CODE (default 'dermahealth') or creates one if none exists yet —
 * this is a demo-data script, not the platform metadata seed in
 * prisma/seed/index.ts, which must stay free of tenant/clinical records.
 *
 * Usage:
 *   DATABASE_URL=... npx ts-node -r tsconfig-paths/register scripts/seed-demo-doctors.ts
 */
const prisma = new PrismaClient();

const ORG_CODE = process.env.ORG_CODE?.trim() || 'dermahealth';
const CLINIC_CODE = 'main-clinic';
const DEPARTMENT_CODE = 'derma';
const EMAIL_DOMAIN = 'demo.dermahealth.vn';

const SPECIALTIES = [
  { code: 'general-derma', name: 'Da liễu tổng quát' },
  { code: 'cosmetic-derma', name: 'Da liễu thẩm mỹ' },
  { code: 'pediatric-derma', name: 'Da liễu nhi' },
  { code: 'allergy-immuno-derma', name: 'Dị ứng - Miễn dịch da liễu' },
  { code: 'derma-surgery', name: 'Phẫu thuật da liễu & Ung thư da' },
  { code: 'laser-aesthetics', name: 'Laser & Công nghệ cao thẩm mỹ da' },
] as const;

type SpecialtyCode = (typeof SPECIALTIES)[number]['code'];

interface DemoDoctor {
  slug: string;
  displayName: string;
  title: string;
  licenseNumber: string;
  yearsExperience: number;
  primarySpecialty: SpecialtyCode;
  secondarySpecialty?: SpecialtyCode;
  bio: string;
}

const DOCTORS: DemoDoctor[] = [
  {
    slug: 'nguyen.thu.ha',
    displayName: 'TS.BS Nguyễn Thị Thu Hà',
    title: 'Tiến sĩ Y khoa - Bác sĩ Da liễu Cao cấp',
    licenseNumber: 'DEMO-079-0182345',
    yearsExperience: 22,
    primarySpecialty: 'cosmetic-derma',
    secondarySpecialty: 'laser-aesthetics',
    bio: 'Hơn 22 năm kinh nghiệm điều trị và thẩm mỹ da. Nguyên trưởng khoa Thẩm mỹ da tại một bệnh viện da liễu tuyến cuối phía Nam, tu nghiệp chuyên sâu về laser và trẻ hóa da tại Hàn Quốc. Thành viên Hội Da liễu Việt Nam, tác giả nhiều báo cáo khoa học về nám da và lão hóa da ở người châu Á.',
  },
  {
    slug: 'tran.minh.khoa',
    displayName: 'BSCKII Trần Minh Khoa',
    title: 'Bác sĩ Chuyên khoa II - Da liễu',
    licenseNumber: 'DEMO-079-0176812',
    yearsExperience: 18,
    primarySpecialty: 'general-derma',
    secondarySpecialty: 'allergy-immuno-derma',
    bio: '18 năm công tác trong lĩnh vực da liễu tổng quát và dị ứng - miễn dịch da. Có thế mạnh chẩn đoán và điều trị các bệnh da mạn tính như vảy nến, viêm da cơ địa, mề đay mạn tính. Từng tham gia nhiều khóa đào tạo liên tục do Hội Da liễu Việt Nam tổ chức.',
  },
  {
    slug: 'le.hoang.nam',
    displayName: 'ThS.BS Lê Hoàng Nam',
    title: 'Thạc sĩ Y khoa - Bác sĩ Da liễu Nhi',
    licenseNumber: 'DEMO-079-0191023',
    yearsExperience: 15,
    primarySpecialty: 'pediatric-derma',
    bio: '15 năm kinh nghiệm khám và điều trị các bệnh lý da ở trẻ em, từ chàm sữa, viêm da tã lót đến các bệnh da bẩm sinh. Phong cách khám nhẹ nhàng, kiên nhẫn, được nhiều phụ huynh tin tưởng lựa chọn cho con em mình.',
  },
  {
    slug: 'pham.ngoc.anh',
    displayName: 'BSCKI Phạm Thị Ngọc Anh',
    title: 'Bác sĩ Chuyên khoa I - Da liễu Thẩm mỹ',
    licenseNumber: 'DEMO-079-0203471',
    yearsExperience: 12,
    primarySpecialty: 'cosmetic-derma',
    bio: '12 năm kinh nghiệm chăm sóc da và điều trị mụn, sẹo, tăng sắc tố. Được đào tạo bài bản về phác đồ điều trị mụn trứng cá theo chuẩn quốc tế, chú trọng tư vấn cá nhân hóa theo từng loại da.',
  },
  {
    slug: 'dang.van.bao',
    displayName: 'PGS.TS.BS Đặng Văn Bảo',
    title: 'Phó Giáo sư, Tiến sĩ - Bác sĩ Phẫu thuật Da liễu',
    licenseNumber: 'DEMO-079-0154298',
    yearsExperience: 28,
    primarySpecialty: 'derma-surgery',
    bio: '28 năm kinh nghiệm phẫu thuật da liễu, tầm soát và điều trị ung thư da. Nguyên giảng viên thỉnh giảng bộ môn Da liễu tại một trường đại học y trong nước, đã thực hiện hàng nghìn ca tiểu phẫu và phẫu thuật u da an toàn.',
  },
  {
    slug: 'vu.thi.mai.lan',
    displayName: 'BS Vũ Thị Mai Lan',
    title: 'Bác sĩ Da liễu',
    licenseNumber: 'DEMO-079-0219987',
    yearsExperience: 8,
    primarySpecialty: 'general-derma',
    bio: '8 năm kinh nghiệm khám và điều trị các bệnh da thường gặp. Năng động, cập nhật liên tục các phác đồ điều trị mới, được đánh giá cao về sự tận tâm và khả năng tư vấn dễ hiểu cho người bệnh.',
  },
];

async function main() {
  const summary: string[] = [];

  await prisma.$transaction(async (tx) => {
    let organization = await tx.organization.findUnique({ where: { code: ORG_CODE } });
    if (!organization) {
      organization = await tx.organization.create({
        data: { code: ORG_CODE, name: 'DermaHealth', timezone: 'Asia/Ho_Chi_Minh' },
      });
      summary.push(`Created organization ${organization.code}`);
    }

    let clinicLocation = await tx.clinicLocation.findFirst({
      where: { organizationId: organization.id, code: CLINIC_CODE },
    });
    if (!clinicLocation) {
      clinicLocation = await tx.clinicLocation.create({
        data: {
          organizationId: organization.id,
          code: CLINIC_CODE,
          name: 'DermaHealth - Cơ sở chính',
        },
      });
      summary.push(`Created clinic location ${clinicLocation.code}`);
    }

    let department = await tx.department.findFirst({
      where: { organizationId: organization.id, code: DEPARTMENT_CODE },
    });
    if (!department) {
      department = await tx.department.create({
        data: {
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          code: DEPARTMENT_CODE,
          name: 'Khoa Da liễu',
        },
      });
      summary.push(`Created department ${department.code}`);
    }

    const specialtyIdByCode = new Map<SpecialtyCode, string>();
    for (const spec of SPECIALTIES) {
      const specialty = await tx.specialty.upsert({
        where: { organizationId_code: { organizationId: organization.id, code: spec.code } },
        update: { name: spec.name },
        create: { organizationId: organization.id, code: spec.code, name: spec.name },
      });
      specialtyIdByCode.set(spec.code, specialty.id);
    }

    for (const doctor of DOCTORS) {
      const email = `bs.${doctor.slug}@${EMAIL_DOMAIN}`;
      const bio = `${doctor.bio} (${doctor.yearsExperience} năm kinh nghiệm.)`;

      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            displayName: doctor.displayName,
            status: 'active',
            emailVerifiedAt: new Date(),
          },
        });
        summary.push(`Created user ${email}`);
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: { displayName: doctor.displayName },
        });
      }

      await tx.practitionerProfile.upsert({
        where: { userId: user.id },
        update: { licenseNumber: doctor.licenseNumber, title: doctor.title, bio, status: 'active' },
        create: {
          userId: user.id,
          licenseNumber: doctor.licenseNumber,
          title: doctor.title,
          bio,
          status: 'active',
        },
      });

      const specialtyCodes = [
        doctor.primarySpecialty,
        ...(doctor.secondarySpecialty ? [doctor.secondarySpecialty] : []),
      ];
      for (const [index, code] of specialtyCodes.entries()) {
        const specialtyId = specialtyIdByCode.get(code)!;
        await tx.practitionerSpecialty.upsert({
          where: { practitionerUserId_specialtyId: { practitionerUserId: user.id, specialtyId } },
          update: { primary: index === 0 },
          create: { practitionerUserId: user.id, specialtyId, primary: index === 0 },
        });
      }

      const existingMembership = await tx.userMembership.findFirst({
        where: {
          userId: user.id,
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          role: 'doctor',
        },
      });
      if (!existingMembership) {
        await tx.userMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            departmentId: department.id,
            role: 'doctor',
            status: 'active',
          },
        });
      }

      const existingAssignment = await tx.practitionerClinicAssignment.findFirst({
        where: { practitionerUserId: user.id, clinicLocationId: clinicLocation.id },
      });
      if (!existingAssignment) {
        await tx.practitionerClinicAssignment.create({
          data: {
            practitionerUserId: user.id,
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            departmentId: department.id,
            slotDurationMinutes: 30,
            capacity: 1,
            active: true,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'admin.demo_practitioner_seeded',
          resourceType: 'user',
          resourceId: user.id,
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          result: 'success',
          reason: 'Demo doctor data seeded via scripts/seed-demo-doctors.ts',
          sourceModule: 'seed-demo-doctors',
        },
      });

      summary.push(`OK ${doctor.displayName} <${email}>`);
    }
  });

  console.log(summary.join('\n'));
  console.log(`\nSeeded ${DOCTORS.length} demo doctor(s) into organization "${ORG_CODE}".`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Demo doctor seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
