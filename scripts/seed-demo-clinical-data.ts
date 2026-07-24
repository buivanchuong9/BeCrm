import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Seeds realistic (fictional) patients + their full clinical trail —
 * appointments, encounters, prescriptions, medical records, medication
 * reminders and today's queue tickets — so every add/edit/delete flow in
 * the app (appointments, queue, prescriptions, medical records) has real
 * data to operate on instead of an empty state.
 *
 * Requires scripts/seed-demo-doctors.ts to have run first (same
 * organization/clinic/department + the 6 demo doctor accounts).
 *
 * Idempotent per patient: if a patient with the given code already has
 * any appointment, that patient's block is skipped entirely.
 *
 * Usage:
 *   DATABASE_URL=... npx ts-node -r tsconfig-paths/register scripts/seed-demo-clinical-data.ts
 */
const prisma = new PrismaClient();

const ORG_CODE = process.env.ORG_CODE?.trim() || 'dermahealth';
const CLINIC_CODE = 'main-clinic';
const DEPARTMENT_NAME = 'Khoa Da liễu';

function ticketPrefix(department: string): string {
  const first = department.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : 'Q';
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function atHour(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface Medication {
  name: string;
  dose: string;
  durationDays: number;
}

interface DemoPatient {
  code: string;
  name: string;
  gender: 'male' | 'female';
  dob: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  doctorSlug: string;
  chiefComplaint: string;
  pastMedications: Medication[];
  today?: { queueStatus: 'waiting' | 'called' | 'acknowledged' | 'in_service' | 'completed' };
  future?: { inDays: number; reason: string };
}

const PATIENTS: DemoPatient[] = [
  {
    code: 'BN-0001',
    name: 'Nguyễn Văn Bình',
    gender: 'male',
    dob: '1985-03-12',
    phone: '0901234567',
    email: 'nguyenvanbinh85@example.com',
    address: '12 Nguyễn Trãi, Quận 1, TP.HCM',
    bloodType: 'O+',
    doctorSlug: 'tran.minh.khoa',
    chiefComplaint: 'Viêm da cơ địa mạn tính, ngứa nhiều về đêm',
    pastMedications: [
      {
        name: 'Betamethasone valerate 0.1% kem bôi',
        dose: 'Bôi mỏng 2 lần/ngày',
        durationDays: 14,
      },
      { name: 'Cetirizine 10mg', dose: 'Uống 1 viên/ngày vào buổi tối', durationDays: 14 },
    ],
    today: { queueStatus: 'waiting' },
  },
  {
    code: 'BN-0002',
    name: 'Trần Thị Lan',
    gender: 'female',
    dob: '1990-07-22',
    phone: '0912345678',
    email: 'tranthilan90@example.com',
    address: '45 Lê Lợi, Quận Hải Châu, Đà Nẵng',
    bloodType: 'A+',
    doctorSlug: 'nguyen.thu.ha',
    chiefComplaint: 'Nám da, tăng sắc tố sau sinh',
    pastMedications: [
      { name: 'Hydroquinone 4% kem bôi', dose: 'Bôi vùng nám vào buổi tối', durationDays: 30 },
      { name: 'Kem chống nắng SPF50+', dose: 'Bôi lại mỗi 3 giờ khi ra nắng', durationDays: 30 },
    ],
    today: { queueStatus: 'called' },
  },
  {
    code: 'BN-0003',
    name: 'Lê Hoàng Minh',
    gender: 'male',
    dob: '2019-01-15',
    phone: '0923456789',
    email: 'lehoangnam.parent@example.com',
    address: '78 Trần Phú, TP. Nha Trang',
    bloodType: 'unknown',
    doctorSlug: 'le.hoang.nam',
    chiefComplaint: 'Chàm sữa, da khô ửng đỏ hai bên má',
    pastMedications: [
      { name: 'Cetaphil kem dưỡng ẩm', dose: 'Bôi toàn thân 2 lần/ngày', durationDays: 14 },
      {
        name: 'Hydrocortisone 1% kem bôi',
        dose: 'Bôi vùng tổn thương 1 lần/ngày',
        durationDays: 7,
      },
    ],
    future: { inDays: 7, reason: 'Tái khám chàm sữa' },
  },
  {
    code: 'BN-0004',
    name: 'Phạm Thị Hương',
    gender: 'female',
    dob: '1995-11-05',
    phone: '0934567890',
    email: 'phamthihuong95@example.com',
    address: '23 Hai Bà Trưng, Quận 3, TP.HCM',
    bloodType: 'B+',
    doctorSlug: 'pham.ngoc.anh',
    chiefComplaint: 'Mụn trứng cá viêm vùng cằm và hai bên má',
    pastMedications: [
      { name: 'Adapalene 0.1% gel', dose: 'Bôi buổi tối, tránh vùng mắt', durationDays: 30 },
      { name: 'Doxycycline 100mg', dose: 'Uống 1 viên/ngày sau ăn', durationDays: 21 },
    ],
    today: { queueStatus: 'in_service' },
  },
  {
    code: 'BN-0005',
    name: 'Đỗ Văn Toàn',
    gender: 'male',
    dob: '1970-05-20',
    phone: '0945678901',
    email: 'dovantoan70@example.com',
    address: '56 Nguyễn Huệ, TP. Huế',
    bloodType: 'AB+',
    doctorSlug: 'dang.van.bao',
    chiefComplaint: 'Nốt ruồi thay đổi màu sắc, cần tầm soát ung thư da',
    pastMedications: [
      { name: 'Amoxicillin 500mg', dose: 'Uống 1 viên x 3 lần/ngày', durationDays: 5 },
    ],
  },
  {
    code: 'BN-0006',
    name: 'Vũ Thị Kim Chi',
    gender: 'female',
    dob: '2000-09-30',
    phone: '0956789012',
    email: 'vuthikimchi00@example.com',
    address: '89 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
    bloodType: 'O-',
    doctorSlug: 'vu.thi.mai.lan',
    chiefComplaint: 'Vảy nến mảng ở khuỷu tay và đầu gối',
    pastMedications: [
      { name: 'Calcipotriol/Betamethasone gel', dose: 'Bôi 1 lần/ngày', durationDays: 28 },
    ],
    today: { queueStatus: 'completed' },
  },
  {
    code: 'BN-0007',
    name: 'Hoàng Văn Đức',
    gender: 'male',
    dob: '1988-02-14',
    phone: '0967890123',
    email: 'hoangvanduc88@example.com',
    address: '34 Bạch Đằng, TP. Hải Phòng',
    bloodType: 'A-',
    doctorSlug: 'tran.minh.khoa',
    chiefComplaint: 'Dị ứng da tiếp xúc sau dùng mỹ phẩm mới',
    pastMedications: [
      { name: 'Prednisolone 5mg', dose: 'Uống giảm liều dần trong 7 ngày', durationDays: 7 },
      { name: 'Loratadine 10mg', dose: 'Uống 1 viên/ngày', durationDays: 10 },
    ],
    future: { inDays: 3, reason: 'Tái khám dị ứng da tiếp xúc' },
  },
  {
    code: 'BN-0008',
    name: 'Ngô Thị Bích Ngọc',
    gender: 'female',
    dob: '1993-12-25',
    phone: '0978901234',
    email: 'ngothibichngoc93@example.com',
    address: '67 Lý Thường Kiệt, TP. Cần Thơ',
    bloodType: 'B-',
    doctorSlug: 'nguyen.thu.ha',
    chiefComplaint: 'Trẻ hóa da, chăm sóc da sau điều trị laser',
    pastMedications: [
      { name: 'Kem dưỡng phục hồi sau laser', dose: 'Bôi 2 lần/ngày', durationDays: 10 },
    ],
    today: { queueStatus: 'acknowledged' },
  },
];

async function main() {
  const summary: string[] = [];

  const organization = await prisma.organization.findUnique({ where: { code: ORG_CODE } });
  if (!organization) {
    throw new Error(
      `Organization "${ORG_CODE}" not found. Run scripts/seed-demo-doctors.ts first.`,
    );
  }
  const clinicLocation = await prisma.clinicLocation.findFirst({
    where: { organizationId: organization.id, code: CLINIC_CODE },
  });
  if (!clinicLocation) {
    throw new Error(
      `Clinic location "${CLINIC_CODE}" not found. Run scripts/seed-demo-doctors.ts first.`,
    );
  }
  const department = await prisma.department.findFirst({
    where: { organizationId: organization.id, name: DEPARTMENT_NAME },
  });
  if (!department) {
    throw new Error(
      `Department "${DEPARTMENT_NAME}" not found. Run scripts/seed-demo-doctors.ts first.`,
    );
  }

  const doctorSlugs = Array.from(new Set(PATIENTS.map((p) => p.doctorSlug)));
  const doctorBySlug = new Map<string, { id: string }>();
  for (const slug of doctorSlugs) {
    const email = `bs.${slug}@demo.dermahealth.vn`;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`Doctor "${email}" not found. Run scripts/seed-demo-doctors.ts first.`);
    }
    doctorBySlug.set(slug, user);
  }

  let ticketSeq = 0;

  for (const patient of PATIENTS) {
    const existing = await prisma.patient.findFirst({
      where: { organizationId: organization.id, code: patient.code },
    });
    if (existing) {
      const hasAppointments = await prisma.appointment.count({ where: { patientId: existing.id } });
      if (hasAppointments > 0) {
        summary.push(`Skip ${patient.name} (${patient.code}) - already seeded`);
        continue;
      }
    }

    const doctor = doctorBySlug.get(patient.doctorSlug)!;

    await prisma.$transaction(async (tx) => {
      const p = existing
        ? existing
        : await tx.patient.create({
            data: {
              organizationId: organization.id,
              code: patient.code,
              name: patient.name,
              dob: new Date(patient.dob),
              gender: patient.gender,
              phone: patient.phone,
              email: patient.email,
              address: patient.address,
              bloodType: patient.bloodType,
              primaryDoctorId: doctor.id,
            },
          });

      await tx.consent.upsert({
        where: { patientId_type: { patientId: p.id, type: 'data_processing' } },
        update: {},
        create: {
          patientId: p.id,
          type: 'data_processing',
          policyVersion: '1.0',
          granted: true,
          grantedAt: new Date(),
        },
      });

      const existingCareTeam = await tx.patientCareTeamMember.findFirst({
        where: { patientId: p.id, userId: doctor.id, relationship: 'primary_doctor' },
      });
      if (!existingCareTeam) {
        await tx.patientCareTeamMember.create({
          data: { patientId: p.id, userId: doctor.id, relationship: 'primary_doctor' },
        });
      }

      // --- Past visit: appointment done + closed encounter + prescription + signed record + reminder
      const pastDurationDays = patient.pastMedications.reduce(
        (m, med) => Math.max(m, med.durationDays),
        7,
      );
      const pastStart = atHour(daysAgo(pastDurationDays + 10), 9);
      const pastEnd = atHour(pastStart, 9, 30);

      const pastAppointment = await tx.appointment.create({
        data: {
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          patientId: p.id,
          doctorId: doctor.id,
          department: DEPARTMENT_NAME,
          consultationType: patient.chiefComplaint,
          mode: 'in_person',
          status: 'done',
          startAt: pastStart,
          endAt: pastEnd,
        },
      });

      const pastEncounter = await tx.medicalEncounter.create({
        data: {
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          patientId: p.id,
          appointmentId: pastAppointment.id,
          type: 'standard',
          origin: 'appointment',
          status: 'closed',
          department: DEPARTMENT_NAME,
          currentDoctorId: doctor.id,
        },
      });

      const prescription = await tx.prescription.create({
        data: {
          encounterId: pastEncounter.id,
          doctorId: doctor.id,
          medications: patient.pastMedications as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.medicalRecord.create({
        data: {
          encounterId: pastEncounter.id,
          status: 'signed',
          prescriptionId: prescription.id,
          signedBy: doctor.id,
          signedAt: pastEnd,
        },
      });

      const firstMed = patient.pastMedications[0];
      await tx.medicationReminder.create({
        data: {
          patientId: p.id,
          prescriptionId: prescription.id,
          medicationName: firstMed.name,
          schedule: {
            timezone: 'Asia/Ho_Chi_Minh',
            startDate: pastStart.toISOString().slice(0, 10),
            times: ['08:00', '20:00'],
          },
          active: false,
        },
      });

      // --- Today's visit: appointment upcoming + checked-in encounter + queue ticket
      if (patient.today) {
        ticketSeq += 1;
        const todayStart = atHour(new Date(), 8 + ticketSeq, 0);
        const todayEnd = atHour(todayStart, 8 + ticketSeq, 30);

        const todayAppointment = await tx.appointment.create({
          data: {
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            patientId: p.id,
            doctorId: doctor.id,
            department: DEPARTMENT_NAME,
            consultationType: 'Tái khám',
            mode: 'in_person',
            status: 'upcoming',
            startAt: todayStart,
            endAt: todayEnd,
          },
        });

        const todayEncounter = await tx.medicalEncounter.create({
          data: {
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            patientId: p.id,
            appointmentId: todayAppointment.id,
            type: 'standard',
            origin: 'appointment',
            status: patient.today.queueStatus === 'completed' ? 'closed' : 'checked_in',
            department: DEPARTMENT_NAME,
            currentDoctorId: doctor.id,
          },
        });

        const status = patient.today.queueStatus;
        const issuedAt = atHour(new Date(), 7, 30);
        await tx.queueTicket.create({
          data: {
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            appointmentId: todayAppointment.id,
            patientId: p.id,
            encounterId: todayEncounter.id,
            number: `${ticketPrefix(DEPARTMENT_NAME)}${String(ticketSeq).padStart(3, '0')}`,
            department: DEPARTMENT_NAME,
            serviceStation: DEPARTMENT_NAME,
            waitingArea: DEPARTMENT_NAME,
            status,
            issuedAt,
            calledAt: ['called', 'acknowledged', 'in_service', 'completed'].includes(status)
              ? atHour(new Date(), 8, 0)
              : null,
            acknowledgedAt: ['acknowledged', 'in_service', 'completed'].includes(status)
              ? atHour(new Date(), 8, 2)
              : null,
            serviceStartedAt: ['in_service', 'completed'].includes(status)
              ? atHour(new Date(), 8, 5)
              : null,
            completedAt: status === 'completed' ? atHour(new Date(), 8, 20) : null,
          },
        });
      }

      // --- Future appointment (scheduling only, no encounter yet)
      if (patient.future) {
        const futureStart = atHour(daysFromNow(patient.future.inDays), 10);
        const futureEnd = atHour(futureStart, 10, 30);
        await tx.appointment.create({
          data: {
            organizationId: organization.id,
            clinicLocationId: clinicLocation.id,
            patientId: p.id,
            doctorId: doctor.id,
            department: DEPARTMENT_NAME,
            consultationType: patient.future.reason,
            mode: 'in_person',
            status: 'upcoming',
            startAt: futureStart,
            endAt: futureEnd,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'admin.demo_patient_seeded',
          resourceType: 'patient',
          resourceId: p.id,
          organizationId: organization.id,
          clinicLocationId: clinicLocation.id,
          result: 'success',
          reason: 'Demo clinical data seeded via scripts/seed-demo-clinical-data.ts',
          sourceModule: 'seed-demo-clinical-data',
        },
      });

      summary.push(
        `OK ${patient.name} (${patient.code}) - past visit${patient.today ? ' + today queue:' + patient.today.queueStatus : ''}${patient.future ? ' + future appt' : ''}`,
      );
    });
  }

  console.log(summary.join('\n'));
  console.log(
    `\nSeeded clinical data for ${PATIENTS.length} demo patient(s) in organization "${ORG_CODE}".`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Demo clinical data seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
