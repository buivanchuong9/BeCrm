import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEMO_CUSTOMER_PREFIX = 'DEMO-C-';
const DEMO_CAMPAIGN_PREFIX = 'CP-DEMO-';
const DEMO_WO_PREFIX = 'WO-DEMO-';
const DEMO_BPM_PREFIX = 'DEMO_BPM_';

const VI_FIRST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ'];
const VI_MID = ['Văn', 'Thị', 'Hữu', 'Minh', 'Thu', 'Anh', 'Quốc', 'Đức', 'Thanh', 'Lan'];
const VI_LAST = ['An', 'Bình', 'Chi', 'Dung', 'Giang', 'Hà', 'Khánh', 'Linh', 'Mai', 'Nam'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function demoName(i: number): string {
  return `${pick(VI_FIRST, i)} ${pick(VI_MID, i + 3)} ${pick(VI_LAST, i + 7)}`;
}

export type SeedContext = {
  prisma: PrismaClient;
  tenantId: string;
  adminUserId: string;
  saleUserId: string;
  salesDeptId: string;
  supportDeptId: string;
  vipGroupId: string;
  standardGroupId: string;
  websiteSourceId: string;
  referralSourceId: string;
};

export async function seedDemoVolume(ctx: SeedContext): Promise<Record<string, number | string | boolean>> {
  const { prisma, tenantId, adminUserId, saleUserId, salesDeptId, supportDeptId } = ctx;
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  const existingDemoCustomers = await prisma.customer.count({
    where: { tenantId, code: { startsWith: DEMO_CUSTOMER_PREFIX } },
  });

  if (existingDemoCustomers >= 50) {
    console.log('⏭️  Demo volume already seeded — skipping bulk insert');
    return await countDemoRecords(prisma, tenantId);
  }

  console.log('\n📦 Seeding demo volume dataset...');

  const defaultHash = await bcrypt.hash('Sale@123456', 10);
  const employeeUserIds: string[] = [adminUserId, saleUserId];

  // ── 20 Employees (18 additional) ───────────────────────────────────────────
  for (let i = 3; i <= 20; i++) {
    const username = `emp${String(i).padStart(2, '0')}`;
    try {
      const user = await prisma.user.upsert({
        where: { tenantId_username: { tenantId, username } },
        update: {},
        create: {
          tenantId,
          username,
          email: `${username}@carefolllow.vn`,
          name: demoName(i),
          passwordHash: defaultHash,
          isActive: true,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      const deptId = i % 2 === 0 ? salesDeptId : supportDeptId;
      await prisma.employee.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          tenantId,
          userId: user.id,
          departmentId: deptId,
          code: `EMP-${String(i).padStart(3, '0')}`,
          name: user.name,
          email: user.email,
          position: i % 2 === 0 ? 'Sales Executive' : 'Support Agent',
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      employeeUserIds.push(user.id);
    } catch (e) {
      errors.push(`employee ${username}: ${(e as Error).message}`);
    }
  }
  counts.employees = await prisma.employee.count({ where: { tenantId, deletedAt: null } });

  // ── 50 Customers ───────────────────────────────────────────────────────────
  const customerIds: string[] = [];
  for (let i = 1; i <= 50; i++) {
    const code = `${DEMO_CUSTOMER_PREFIX}${String(i).padStart(3, '0')}`;
    const assigneeId = employeeUserIds[i % employeeUserIds.length];
    try {
      const c = await prisma.customer.create({
        data: {
          tenantId,
          code,
          name: demoName(i + 10),
          phone: `09${String(10000000 + i).slice(-8)}`,
          email: `demo.customer${i}@example.com`,
          gender: i % 2 === 0 ? 'female' : 'male',
          customerGroupId: i % 3 === 0 ? ctx.vipGroupId : ctx.standardGroupId,
          customerSourceId: i % 2 === 0 ? ctx.websiteSourceId : ctx.referralSourceId,
          iamEmployeeId: assigneeId,
          status: 0,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      customerIds.push(c.id);
    } catch (e) {
      errors.push(`customer ${code}: ${(e as Error).message}`);
    }
  }
  counts.customers = await prisma.customer.count({ where: { tenantId, deletedAt: null } });

  // ── Work project & type ────────────────────────────────────────────────────
  const workProject = await prisma.workProject.upsert({
    where: { id: '33333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333333',
      tenantId,
      code: 'PRJ-DEMO',
      name: 'Demo Customer Care Project',
      status: 'active',
      iamManagerId: adminUserId,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  });

  const workType = await prisma.workType.upsert({
    where: { id: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444444',
      tenantId,
      code: 'WT-DEMO',
      name: 'Follow-up Task',
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  });

  const statuses = ['pending', 'in_progress', 'completed', 'pending', '5'];
  const bpmTemplateIds: string[] = [];

  // Collect existing BPM templates + create up to 10 total
  const existingBpm = await prisma.bpmProcessTemplate.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true },
  });
  bpmTemplateIds.push(...existingBpm.map((t) => t.id));

  for (let t = bpmTemplateIds.length + 1; t <= 10; t++) {
    const code = `${DEMO_BPM_PREFIX}${String(t).padStart(2, '0')}`;
    try {
      const tmpl = await prisma.bpmProcessTemplate.create({
        data: {
          tenantId,
          code,
          name: `Demo Process ${t}`,
          category: t % 2 === 0 ? 'CRM' : 'HR',
          description: `Automated demo workflow template ${t}`,
          status: 'published',
          version: 1,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      const start = await prisma.bpmNode.create({
        data: {
          tenantId,
          templateId: tmpl.id,
          nodeKey: 'start',
          nodeType: 'Start',
          name: 'Start',
          positionX: 80,
          positionY: 120,
          createdBy: adminUserId,
        },
      });
      const task = await prisma.bpmNode.create({
        data: {
          tenantId,
          templateId: tmpl.id,
          nodeKey: 'task_1',
          nodeType: 'UserTask',
          name: 'Review',
          positionX: 280,
          positionY: 120,
          config: { assigneeRole: 'sale' },
          createdBy: adminUserId,
        },
      });
      const end = await prisma.bpmNode.create({
        data: {
          tenantId,
          templateId: tmpl.id,
          nodeKey: 'end',
          nodeType: 'End',
          name: 'End',
          positionX: 480,
          positionY: 120,
          createdBy: adminUserId,
        },
      });
      await prisma.bpmEdge.createMany({
        data: [
          { tenantId, templateId: tmpl.id, edgeKey: 'e1', fromNodeId: start.id, toNodeId: task.id, createdBy: adminUserId },
          { tenantId, templateId: tmpl.id, edgeKey: 'e2', fromNodeId: task.id, toNodeId: end.id, createdBy: adminUserId },
        ],
      });
      bpmTemplateIds.push(tmpl.id);
    } catch (e) {
      errors.push(`bpm ${code}: ${(e as Error).message}`);
    }
  }
  counts.bpmTemplates = await prisma.bpmProcessTemplate.count({ where: { tenantId, deletedAt: null } });

  const bpmInstances: string[] = [];
  for (let i = 0; i < 15 && bpmTemplateIds.length > 0; i++) {
    try {
      const inst = await prisma.bpmProcessInstance.create({
        data: {
          tenantId,
          templateId: bpmTemplateIds[i % bpmTemplateIds.length],
          refType: 'customer',
          refId: customerIds[i % customerIds.length],
          status: i % 3 === 0 ? 'completed' : 'running',
          businessKey: `DEMO-INST-${String(i + 1).padStart(3, '0')}`,
          iamStartedBy: adminUserId,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      bpmInstances.push(inst.id);
    } catch (e) {
      errors.push(`bpm instance ${i}: ${(e as Error).message}`);
    }
  }

  // ── 100 Work Orders ────────────────────────────────────────────────────────
  for (let i = 1; i <= 100; i++) {
    const code = `${DEMO_WO_PREFIX}${String(i).padStart(3, '0')}`;
    const customerId = customerIds[(i - 1) % customerIds.length];
    const assigneeId = employeeUserIds[i % employeeUserIds.length];
    const linkBpm = i % 5 === 0 && bpmInstances.length > 0;
    try {
      await prisma.workOrder.create({
        data: {
          tenantId,
          workProjectId: workProject.id,
          workTypeId: workType.id,
          code,
          title: `Demo work order #${i} — ${demoName(i)}`,
          content: `Follow-up and care task for customer ${code}.`,
          customerId,
          iamAssigneeId: assigneeId,
          iamManagerId: adminUserId,
          status: statuses[i % statuses.length],
          priority: i % 3,
          dueDate: new Date(Date.now() + i * 86400000),
          startDate: new Date(),
          bpmInstanceId: linkBpm ? bpmInstances[i % bpmInstances.length] : undefined,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
    } catch (e) {
      errors.push(`workOrder ${code}: ${(e as Error).message}`);
    }
  }
  counts.workOrders = await prisma.workOrder.count({ where: { tenantId, deletedAt: null } });

  // ── 20 Campaigns + opportunities ───────────────────────────────────────────
  const campaignIds: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const code = `${DEMO_CAMPAIGN_PREFIX}${String(i).padStart(2, '0')}`;
    try {
      const camp = await prisma.campaign.create({
        data: {
          tenantId,
          code,
          name: `Demo Campaign Q2-${i}`,
          type: i % 2 === 0 ? 'sales' : 'retention',
          status: 'active',
          iamOwnerId: employeeUserIds[i % employeeUserIds.length],
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          position: i,
          approachNote: `Demo marketing campaign ${i}`,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      const approach = await prisma.campaignApproach.create({
        data: {
          tenantId,
          campaignId: camp.id,
          name: 'First Touch',
          step: 1,
          slaHours: 24,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      campaignIds.push(camp.id);

      for (let j = 0; j < 2; j++) {
        const custIdx = (i * 2 + j) % customerIds.length;
        await prisma.opportunity.create({
          data: {
            tenantId,
            campaignId: camp.id,
            campaignApproachId: approach.id,
            customerId: customerIds[custIdx],
            refType: 'customer',
            iamOwnerId: adminUserId,
            iamSaleId: saleUserId,
            expectedRevenue: 5000000 + i * 100000 + j * 50000,
            percent: 10 + j * 20,
            status: j === 0 ? 'open' : 'qualified',
            note: `Opportunity for campaign ${code}`,
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });
      }
    } catch (e) {
      errors.push(`campaign ${code}: ${(e as Error).message}`);
    }
  }
  counts.campaigns = await prisma.campaign.count({ where: { tenantId, deletedAt: null } });
  counts.opportunities = await prisma.opportunity.count({ where: { tenantId, deletedAt: null } });

  // ── 50 Notifications ───────────────────────────────────────────────────────
  const notifyUsers = [adminUserId, saleUserId, ...employeeUserIds.slice(2, 12)];
  for (let i = 1; i <= 50; i++) {
    const userId = notifyUsers[i % notifyUsers.length];
    const woIdx = i % 100;
    try {
      await prisma.notificationHistory.create({
        data: {
          tenantId,
          userId,
          title: `Demo notification #${i}`,
          body: `Work order or campaign update for UAT scenario ${i}.`,
          isRead: i % 4 === 0,
          refType: i % 2 === 0 ? 'work_order' : 'campaign',
          data: { workId: `${DEMO_WO_PREFIX}${String(woIdx).padStart(3, '0')}`, demo: true },
        },
      });
    } catch (e) {
      errors.push(`notification ${i}: ${(e as Error).message}`);
    }
  }
  counts.notifications = await prisma.notificationHistory.count({ where: { tenantId, deletedAt: null } });

  if (errors.length) {
    console.warn(`⚠️  Demo seed completed with ${errors.length} non-fatal error(s)`);
  } else {
    console.log('✅ Demo volume seed completed without errors');
  }

  return { ...counts, failedInserts: errors.length, errors: errors.slice(0, 10).join('; ') };
}

async function countDemoRecords(prisma: PrismaClient, tenantId: string) {
  return {
    customers: await prisma.customer.count({ where: { tenantId, deletedAt: null } }),
    employees: await prisma.employee.count({ where: { tenantId, deletedAt: null } }),
    workOrders: await prisma.workOrder.count({ where: { tenantId, deletedAt: null } }),
    campaigns: await prisma.campaign.count({ where: { tenantId, deletedAt: null } }),
    opportunities: await prisma.opportunity.count({ where: { tenantId, deletedAt: null } }),
    notifications: await prisma.notificationHistory.count({ where: { tenantId, deletedAt: null } }),
    bpmTemplates: await prisma.bpmProcessTemplate.count({ where: { tenantId, deletedAt: null } }),
    failedInserts: 0,
    skipped: true,
  };
}
