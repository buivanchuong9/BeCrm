import { OperationsService } from './operations.service';

const principal = {
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'patient@example.com',
  displayName: 'Patient',
  memberships: [
    {
      organizationId: '22222222-2222-4222-8222-222222222222',
      clinicLocationId: null,
      departmentId: null,
      role: 'patient',
    },
  ],
} as any;

describe('OperationsService direct uploads', () => {
  let prisma: any;
  let storage: any;
  let audit: any;
  let service: OperationsService;

  beforeEach(() => {
    prisma = {
      uploadObject: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: '33333333-3333-4333-8333-333333333333',
          ...data,
        })),
        findFirst: jest.fn(),
      },
    };
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      verifyLocalDownload: jest.fn(),
      openLocalObject: jest.fn(),
    };
    audit = { write: jest.fn().mockResolvedValue(undefined) };
    service = new OperationsService(prisma, {} as any, {} as any, audit, storage);
  });

  it('stores a real avatar before recording a confirmed upload', async () => {
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('test'),
    };

    const result = await service.directUpload(principal, 'avatar', file, {});

    expect(storage.putObject).toHaveBeenCalledWith(
      expect.stringMatching(`${principal.userId}/avatar/`),
      'image/png',
      file.buffer,
    );
    expect(prisma.uploadObject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: principal.userId,
        fileName: 'avatar.png',
        contentType: 'image/png',
        context: 'avatar',
        status: 'confirmed',
        fileHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
    expect(result.data).toEqual(
      expect.objectContaining({
        fileId: '33333333-3333-4333-8333-333333333333',
        size: 4,
      }),
    );
  });

  it('rejects unsupported avatar content before writing to disk', async () => {
    await expect(
      service.directUpload(
        principal,
        'avatar',
        {
          originalname: 'payload.pdf',
          mimetype: 'application/pdf',
          size: 4,
          buffer: Buffer.from('test'),
        },
        {},
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    expect(storage.putObject).not.toHaveBeenCalled();
  });
});
