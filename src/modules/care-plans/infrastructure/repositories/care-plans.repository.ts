import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';

interface CreateFollowUpActivityInput {
  carePlanId: string;
  type: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: string;
  status: string;
  automationMode?: string;
  automationAction?: string;
}

@Injectable()
export class CarePlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.crmCarePlan.findUnique({ where: { id } });
  }

  findLatestForPatient(patientId: string) {
    return this.prisma.crmCarePlan.findFirst({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(patientId: string, encounterId: string) {
    const plan = await this.prisma.crmCarePlan.create({ data: { patientId, encounterId } });

    // Comprehensive production follow-up activities for dermatology patients
    const initialActivities = [
      {
        carePlanId: plan.id,
        type: 'medication_reminder',
        title: 'Nhắc uống thuốc kháng Histamine & bôi kem dưỡng ẩm dịu da',
        description:
          'Tự động gửi thông báo ứng dụng & SMS nhắc nhở dùng thuốc 2 lần/ngày (08:00 & 20:00).',
        dueDate: new Date(Date.now() + 12 * 3600000), // 12h later
        priority: 'high',
        status: 'due',
        automationMode: 'automatic',
        automationAction: 'Gửi SMS & Zalo OA nhắc lịch thuốc',
      },
      {
        carePlanId: plan.id,
        type: 'symptom_questionnaire',
        title: 'Khảo sát chỉ số ngứa VAS & mức độ bong tróc da sau 48h',
        description: 'Gửi bảng khảo sát tự đánh giá ngứa (VAS 0-10) và triệu chứng toàn thân.',
        dueDate: new Date(Date.now() + 48 * 3600000),
        priority: 'medium',
        status: 'scheduled',
        automationMode: 'automatic',
        automationAction: 'Gửi khảo sát theo dõi tiến triển',
      },
      {
        carePlanId: plan.id,
        type: 'patient_education',
        title: 'Hướng dẫn chăm sóc da thương tổn & chống nắng đúng cách',
        description:
          'Cung cấp bài viết chuẩn Y khoa về quy trình làm sạch dịu nhẹ và sử dụng kem chống nắng.',
        dueDate: new Date(Date.now() + 72 * 3600000),
        priority: 'low',
        status: 'scheduled',
        automationMode: 'automatic',
        automationAction: 'Gửi tài liệu giáo dục sức khỏe',
      },
      {
        carePlanId: plan.id,
        type: 'adherence_check',
        title: 'Cập nhật ảnh tổn thương da theo dõi tiến triển 7 ngày',
        description:
          'Bệnh nhân chụp và tải lên 1 ảnh vùng tổn thương để hệ thống AI phân tích đối chiếu.',
        dueDate: new Date(Date.now() + 168 * 3600000),
        priority: 'high',
        status: 'due',
        automationMode: 'patient_action',
        automationAction: 'Bệnh nhân cập nhật hình ảnh',
      },
      {
        carePlanId: plan.id,
        type: 'coordinator_call',
        title: 'Điều phối viên liên hệ hỗ trợ & xác nhận lịch tái khám',
        description: 'Điện thoại trực tiếp đánh giá sự hài lòng và nhắc hẹn tái khám theo phác đồ.',
        dueDate: new Date(Date.now() + 240 * 3600000),
        priority: 'medium',
        status: 'scheduled',
        automationMode: 'human_review',
        automationAction: 'Điều phối viên gọi điện',
      },
    ];

    await this.prisma.followUpActivity.createMany({
      data: initialActivities,
    });

    return plan;
  }

  listActivities(carePlanId: string) {
    return this.prisma.followUpActivity.findMany({
      where: { carePlanId },
      orderBy: { dueDate: 'asc' },
    });
  }

  createActivity(input: CreateFollowUpActivityInput) {
    return this.prisma.followUpActivity.create({ data: input });
  }

  findActivityById(id: string) {
    return this.prisma.followUpActivity.findUnique({ where: { id } });
  }

  updateActivityStatus(id: string, status: string, versionIncrement: number) {
    return this.prisma.followUpActivity.update({
      where: { id },
      data: { status, version: { increment: versionIncrement } },
    });
  }

  /** Optimistic-concurrency transition for `POST
   * /follow-up-activities/{id}/transitions`: the `version`+`status` guard in
   * `where` means the update only lands if nobody else moved the card first;
   * `count === 0` tells the caller to raise 409 CONCURRENCY_CONFLICT. */
  transitionActivityStatus(id: string, fromStatus: string, toStatus: string, version: number) {
    return this.prisma.followUpActivity.updateMany({
      where: { id, status: fromStatus, version },
      data: { status: toStatus, version: { increment: 1 } },
    });
  }

  findAutomationCandidates(carePlanId: string) {
    return this.prisma.followUpActivity.findMany({
      where: { carePlanId, status: { in: ['scheduled', 'due'] } },
    });
  }

  /** Applies the automation run's status transition (due -> completed,
   * scheduled unchanged) plus automation bookkeeping, then returns the
   * updated rows for the response payload. */
  async applyAutomationRun(dueIds: string[], scheduledIds: string[]) {
    const now = new Date();
    if (dueIds.length) {
      await this.prisma.followUpActivity.updateMany({
        where: { id: { in: dueIds } },
        data: {
          status: 'completed',
          lastAutomatedAt: now,
          automationRunCount: { increment: 1 },
          version: { increment: 1 },
        },
      });
    }
    if (scheduledIds.length) {
      await this.prisma.followUpActivity.updateMany({
        where: { id: { in: scheduledIds } },
        data: { lastAutomatedAt: now, automationRunCount: { increment: 1 } },
      });
    }
    const ids = [...dueIds, ...scheduledIds];
    if (!ids.length) return [];
    return this.prisma.followUpActivity.findMany({ where: { id: { in: ids } } });
  }
}
