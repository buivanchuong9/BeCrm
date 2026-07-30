import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService local fallback', () => {
  let localPath: string;

  beforeEach(async () => {
    localPath = await mkdtemp(join(tmpdir(), 'dermahealth-storage-'));
  });

  afterEach(async () => {
    await rm(localPath, { recursive: true, force: true });
  });

  const createStorage = () =>
    new ObjectStorageService({
      get: jest.fn().mockReturnValue({
        endpoint: '',
        publicEndpoint: '',
        region: 'us-east-1',
        bucket: '',
        accessKey: '',
        secretKey: '',
        forcePathStyle: true,
        localPath,
        publicUrl: 'https://dermahealth.example',
        signingSecret: 'test-signing-secret',
      }),
    } as any);

  it('does not prevent the application from starting without S3', () => {
    expect(() => createStorage()).not.toThrow();
  });

  it('keeps legacy direct-to-S3 presigning disabled without S3 credentials', async () => {
    const storage = createStorage();

    await expect(storage.presignPut('avatars/user-1.png', 'image/png')).rejects.toMatchObject({
      code: 'STORAGE_NOT_CONFIGURED',
      status: 503,
    });
  });

  it('persists and serves an object from local disk through a signed URL', async () => {
    const storage = createStorage();
    const storageKey = 'user-1/avatar/object-1';
    const contents = Buffer.from('real-image-bytes');

    await storage.putObject(storageKey, 'image/png', contents);

    await expect(storage.inspectObject(storageKey)).resolves.toEqual({
      contentLength: contents.length,
      contentType: 'image/png',
    });
    await expect(storage.sha256Object(storageKey)).resolves.toMatch(/^[a-f0-9]{64}$/);

    const signedUrl = new URL(await storage.presignGet(storageKey, 'file-1'));
    const expires = Number(signedUrl.searchParams.get('expires'));
    const signature = signedUrl.searchParams.get('signature') ?? '';
    expect(() =>
      storage.verifyLocalDownload('file-1', storageKey, expires, signature),
    ).not.toThrow();

    const opened = await storage.openLocalObject(storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(contents);
  });

  it('rejects a storage key that escapes the configured volume', async () => {
    const storage = createStorage();

    await expect(
      storage.putObject('../outside', 'image/png', Buffer.from('x')),
    ).rejects.toMatchObject({
      code: 'INVALID_STORAGE_KEY',
    });
  });
});
