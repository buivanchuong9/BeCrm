import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService without S3 configuration', () => {
  const config = {
    get: jest.fn().mockReturnValue({
      endpoint: '',
      publicEndpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKey: '',
      secretKey: '',
      forcePathStyle: true,
    }),
  } as any;

  it('does not prevent the application from starting', () => {
    expect(() => new ObjectStorageService(config)).not.toThrow();
  });

  it('fails only when an object-storage operation is requested', async () => {
    const storage = new ObjectStorageService(config);

    await expect(storage.presignPut('avatars/user-1.png', 'image/png')).rejects.toMatchObject({
      code: 'STORAGE_NOT_CONFIGURED',
    });

    await expect(storage.presignPut('avatars/user-1.png', 'image/png')).rejects.toHaveProperty(
      'status',
      503,
    );
  });
});
