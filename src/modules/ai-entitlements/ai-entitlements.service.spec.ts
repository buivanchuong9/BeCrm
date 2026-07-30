import { AiEntitlementsService } from './ai-entitlements.service';

const plan = {
  code: 'free',
  name: 'Free',
  annualPriceVnd: 0,
  monthlyIncludedCredits: 3,
  extraCreditUnitPriceVnd: 6_900,
  description: 'Free plan',
  features: [],
};

describe('AiEntitlementsService quota ledger', () => {
  let prisma: any;
  let tx: any;
  let service: AiEntitlementsService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      patientAiEntitlement: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      aiUsageEvent: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma = {
      patientAiEntitlement: {
        upsert: jest.fn().mockResolvedValue({
          patientId: 'patient-1',
          planCode: 'free',
          extraCreditBalance: 0,
          plan,
        }),
      },
      $transaction: jest.fn(async (callback: (transaction: any) => unknown) => callback(tx)),
    };
    service = new AiEntitlementsService(
      prisma,
      { findByUserId: jest.fn() } as any,
      { write: jest.fn() } as any,
    );
  });

  it('reserves an included credit while monthly plan quota remains', async () => {
    tx.patientAiEntitlement.findUniqueOrThrow.mockResolvedValue({
      plan,
      extraCreditBalance: 0,
    });
    tx.aiUsageEvent.count.mockResolvedValue(2);

    await expect(service.reserve('patient-1', 'user-1', 'request-1')).resolves.toEqual({
      id: 'usage-1',
    });

    expect(tx.aiUsageEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ allowanceKind: 'included' }),
      }),
    );
    expect(tx.patientAiEntitlement.update).not.toHaveBeenCalled();
    expect(tx.aiUsageEvent.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        actorId: 'user-1',
        requestId: 'request-1',
        allowanceKind: 'included',
      },
      select: { id: true },
    });
  });

  it('atomically consumes one purchased credit after included quota is exhausted', async () => {
    tx.patientAiEntitlement.findUniqueOrThrow.mockResolvedValue({
      plan,
      extraCreditBalance: 2,
    });
    tx.aiUsageEvent.count.mockResolvedValue(3);

    await service.reserve('patient-1', 'user-1');

    expect(tx.patientAiEntitlement.update).toHaveBeenCalledWith({
      where: { patientId: 'patient-1' },
      data: {
        extraCreditBalance: { decrement: 1 },
        version: { increment: 1 },
      },
    });
    expect(tx.aiUsageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ allowanceKind: 'purchased' }),
      }),
    );
  });

  it('rejects before inference when both included and purchased quota are exhausted', async () => {
    tx.patientAiEntitlement.findUniqueOrThrow.mockResolvedValue({
      plan,
      extraCreditBalance: 0,
    });
    tx.aiUsageEvent.count.mockResolvedValue(3);

    await expect(service.reserve('patient-1', 'user-1')).rejects.toMatchObject({
      code: 'AI_QUOTA_EXHAUSTED',
      status: 402,
    });

    expect(tx.aiUsageEvent.create).not.toHaveBeenCalled();
  });
});
