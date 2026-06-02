import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CareFollow database...');

  // ── Tenant ───────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { code: 'demo' },
    update: {},
    create: {
      code: 'demo',
      name: 'CareFollow Demo',
      domain: 'localhost',
      isActive: true,
      plan: 'enterprise',
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'super_admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Super Admin',
      code: 'super_admin',
      isSystem: true,
      createdBy: '00000000-0000-0000-0000-000000000000',
      updatedBy: '00000000-0000-0000-0000-000000000000',
    },
  });

  const saleRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'sale' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Sales',
      code: 'sale',
      isSystem: false,
      createdBy: '00000000-0000-0000-0000-000000000000',
      updatedBy: '00000000-0000-0000-0000-000000000000',
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'support' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Support',
      code: 'support',
      isSystem: false,
      createdBy: '00000000-0000-0000-0000-000000000000',
      updatedBy: '00000000-0000-0000-0000-000000000000',
    },
  });
  console.log(`✅ Roles: admin, sale, support`);

  // ── Admin User ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@carefolllow.vn',
      name: 'System Administrator',
      passwordHash: adminHash,
      isActive: true,
      isSuperAdmin: true,
      createdBy: '00000000-0000-0000-0000-000000000000',
      updatedBy: '00000000-0000-0000-0000-000000000000',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      roleId: adminRole.id,
      createdBy: adminUser.id,
    },
  });
  console.log(`✅ Admin user: admin / Admin@123456`);

  // ── Demo Sale User ────────────────────────────────────────────────────────
  const saleHash = await bcrypt.hash('Sale@123456', 10);
  const saleUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'sale1' } },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'sale1',
      email: 'sale1@carefolllow.vn',
      name: 'Nguyễn Văn Sales',
      passwordHash: saleHash,
      isActive: true,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: saleUser.id, roleId: saleRole.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: saleUser.id,
      roleId: saleRole.id,
      createdBy: adminUser.id,
    },
  });
  console.log(`✅ Sale user: sale1 / Sale@123456`);

  // ── Department ────────────────────────────────────────────────────────────
  const salesDept = await prisma.department.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      tenantId: tenant.id,
      name: 'Sales Department',
      code: 'SALES',
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const supportDept = await prisma.department.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      tenantId: tenant.id,
      name: 'Support Department',
      code: 'SUPPORT',
      position: 2,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Departments: Sales, Support`);

  // ── Employees ─────────────────────────────────────────────────────────────
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      departmentId: salesDept.id,
      code: 'EMP-001',
      name: 'System Administrator',
      email: 'admin@carefolllow.vn',
      position: 'Director',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: saleUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: saleUser.id,
      departmentId: salesDept.id,
      code: 'EMP-002',
      name: 'Nguyễn Văn Sales',
      email: 'sale1@carefolllow.vn',
      position: 'Sales Executive',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Employees seeded`);

  // ── Customer Group & Source ───────────────────────────────────────────────
  const vipGroup = await prisma.customerGroup.upsert({
    where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      tenantId: tenant.id,
      name: 'VIP',
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const standardGroup = await prisma.customerGroup.upsert({
    where: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    update: {},
    create: {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      tenantId: tenant.id,
      name: 'Standard',
      position: 2,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const websiteSource = await prisma.customerSource.upsert({
    where: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    update: {},
    create: {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      tenantId: tenant.id,
      name: 'Website',
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const referralSource = await prisma.customerSource.upsert({
    where: { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    update: {},
    create: {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      tenantId: tenant.id,
      name: 'Referral',
      position: 2,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Customer groups & sources seeded`);

  // ── Sample Customers ──────────────────────────────────────────────────────
  const customers = [
    { name: 'Trần Thị Hoa', phone: '0901234567', email: 'hoa@example.com', gender: 'female', customerGroupId: vipGroup.id, customerSourceId: websiteSource.id },
    { name: 'Lê Văn Nam', phone: '0912345678', email: 'nam@example.com', gender: 'male', customerGroupId: standardGroup.id, customerSourceId: referralSource.id },
    { name: 'Phạm Thị Lan', phone: '0923456789', email: 'lan@example.com', gender: 'female', customerGroupId: vipGroup.id, customerSourceId: websiteSource.id },
  ];

  for (const cust of customers) {
    await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        iamEmployeeId: saleUser.id,
        ...cust,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ ${customers.length} sample customers seeded`);

  // ── CRM Campaign ──────────────────────────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      code: 'CP-001',
      name: 'Q2 2026 Sales Campaign',
      type: 'sales',
      status: 'active',
      iamOwnerId: adminUser.id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      position: 1,
      approachNote: 'Focus on VIP customers',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const approach1 = await prisma.campaignApproach.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      name: 'Initial Contact',
      step: 1,
      slaHours: 24,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.campaignApproach.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      name: 'Follow-up',
      step: 2,
      slaHours: 48,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Campaign seeded: ${campaign.name}`);

  // ── Ticket Category ───────────────────────────────────────────────────────
  await prisma.ticketCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Technical Issue',
      type: 1,
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.ticketCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Billing',
      type: 2,
      position: 2,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Ticket categories seeded`);

  // ── Warranty Categories ───────────────────────────────────────────────────
  await prisma.warrantyCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Pending',
      categoryType: 1,
      colorHex: '#fbbf24',
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.warrantyCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'In Progress',
      categoryType: 1,
      colorHex: '#3b82f6',
      position: 2,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.warrantyCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Hardware Defect',
      categoryType: 2,
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log(`✅ Warranty categories seeded`);

  // ── BPM Demo Template ─────────────────────────────────────────────────────
  const bpmTemplate = await prisma.bpmProcessTemplate.create({
    data: {
      tenantId: tenant.id,
      code: 'LEAVE_APPROVAL',
      name: 'Leave Approval Process',
      category: 'HR',
      description: 'Standard leave request approval workflow',
      status: 'published',
      version: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const startNode = await prisma.bpmNode.create({
    data: {
      tenantId: tenant.id,
      templateId: bpmTemplate.id,
      nodeKey: 'start',
      nodeType: 'Start',
      name: 'Start',
      positionX: 100,
      positionY: 200,
      createdBy: adminUser.id,
    },
  });

  const reviewTask = await prisma.bpmNode.create({
    data: {
      tenantId: tenant.id,
      templateId: bpmTemplate.id,
      nodeKey: 'manager_review',
      nodeType: 'UserTask',
      name: 'Manager Review',
      positionX: 350,
      positionY: 200,
      config: { assigneeRole: 'manager' },
      createdBy: adminUser.id,
    },
  });

  const endNode = await prisma.bpmNode.create({
    data: {
      tenantId: tenant.id,
      templateId: bpmTemplate.id,
      nodeKey: 'end',
      nodeType: 'End',
      name: 'End',
      positionX: 600,
      positionY: 200,
      createdBy: adminUser.id,
    },
  });

  await prisma.bpmEdge.create({
    data: {
      tenantId: tenant.id,
      templateId: bpmTemplate.id,
      edgeKey: 'start_to_review',
      fromNodeId: startNode.id,
      toNodeId: reviewTask.id,
      createdBy: adminUser.id,
    },
  });

  await prisma.bpmEdge.create({
    data: {
      tenantId: tenant.id,
      templateId: bpmTemplate.id,
      edgeKey: 'review_to_end',
      fromNodeId: reviewTask.id,
      toNodeId: endNode.id,
      label: 'Approved',
      createdBy: adminUser.id,
    },
  });
  console.log(`✅ BPM demo template seeded: ${bpmTemplate.name}`);

  // ── Contact Pipeline ──────────────────────────────────────────────────────
  const pipeline = await prisma.contactPipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'B2B Sales Pipeline',
      position: 1,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  for (const [i, statusName] of ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'].entries()) {
    await prisma.contactStatus.create({
      data: {
        tenantId: tenant.id,
        contactPipelineId: pipeline.id,
        name: statusName,
        position: i + 1,
        colorHex: ['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'][i],
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ Contact pipeline seeded: ${pipeline.name}`);

  // ── Marketing Source ──────────────────────────────────────────────────────
  for (const [i, name] of ['Facebook Ads', 'Google Ads', 'Email Campaign', 'Cold Call'].entries()) {
    await prisma.marketingSource.create({
      data: {
        tenantId: tenant.id,
        name,
        position: i + 1,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ Marketing sources seeded`);

  // ── Care Categories ───────────────────────────────────────────────────────
  for (const [i, name] of ['Phone Call', 'Email', 'Meeting', 'WhatsApp'].entries()) {
    await prisma.careCategory.create({
      data: {
        tenantId: tenant.id,
        name,
        position: i + 1,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ Care categories seeded`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('─'.repeat(50));
  console.log('🔑 Login credentials:');
  console.log('   admin / Admin@123456   (Super Admin)');
  console.log('   sale1 / Sale@123456    (Sales)');
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
