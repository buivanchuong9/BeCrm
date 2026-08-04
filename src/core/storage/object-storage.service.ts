import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createReadStream, ReadStream } from 'fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import { AppConfiguration } from '../configuration/configuration';
import { AppError } from '../errors/app-error';

@Injectable()
export class ObjectStorageService implements OnModuleDestroy {
  private readonly client: S3Client | null;
  private readonly publicClient: S3Client | null;
  private readonly bucket: string | null;
  private readonly localPath: string;
  private readonly publicUrl: string;
  private readonly signingSecret: string;
  private bucketReady?: Promise<void>;

  constructor(config: ConfigService<AppConfiguration, true>) {
    const storage = config.get('storage', { infer: true });
    this.localPath = resolve(storage.localPath);
    this.publicUrl = storage.publicUrl;
    this.signingSecret = storage.signingSecret;
    if (!storage.endpoint || !storage.bucket || !storage.accessKey || !storage.secretKey) {
      this.client = null;
      this.publicClient = null;
      this.bucket = null;
      return;
    }
    this.bucket = storage.bucket;
    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: storage.region || 'us-east-1',
      forcePathStyle: storage.forcePathStyle,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
    });
    this.publicClient = new S3Client({
      endpoint: storage.publicEndpoint || storage.endpoint,
      region: storage.region || 'us-east-1',
      forcePathStyle: storage.forcePathStyle,
      credentials: {
        accessKeyId: storage.accessKey,
        secretAccessKey: storage.secretKey,
      },
    });
  }

  usesLocalStorage(): boolean {
    return !this.client;
  }

  async putObject(storageKey: string, contentType: string, body: Buffer): Promise<void> {
    if (this.usesLocalStorage()) {
      const objectPath = this.localObjectPath(storageKey);
      const metadataPath = `${objectPath}.metadata.json`;
      const suffix = randomUUID();
      const temporaryObjectPath = `${objectPath}.${suffix}.tmp`;
      const temporaryMetadataPath = `${metadataPath}.${suffix}.tmp`;
      await mkdir(dirname(objectPath), { recursive: true });
      try {
        await writeFile(temporaryObjectPath, body, { flag: 'wx' });
        await writeFile(
          temporaryMetadataPath,
          JSON.stringify({ contentType, contentLength: body.length }),
          { flag: 'wx' },
        );
        await rename(temporaryObjectPath, objectPath);
        await rename(temporaryMetadataPath, metadataPath);
      } catch (error) {
        await Promise.all([
          rm(temporaryObjectPath, { force: true }),
          rm(temporaryMetadataPath, { force: true }),
        ]);
        throw error;
      }
      return;
    }

    await this.ensureBucket();
    const { client, bucket } = this.configured();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        ContentType: contentType,
        Body: body,
      }),
    );
  }

  async deleteObject(storageKey: string): Promise<void> {
    if (this.usesLocalStorage()) {
      const objectPath = this.localObjectPath(storageKey);
      await Promise.all([
        rm(objectPath, { force: true }),
        rm(`${objectPath}.metadata.json`, { force: true }),
      ]);
      return;
    }

    await this.ensureBucket();
    const { client, bucket } = this.configured();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
  }

  async presignPut(storageKey: string, contentType: string): Promise<string> {
    await this.ensureBucket();
    const { publicClient, bucket } = this.configured();
    return getSignedUrl(
      publicClient,
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        ContentType: contentType,
      }),
      { expiresIn: 15 * 60 },
    );
  }

  async presignGet(storageKey: string, fileId?: string): Promise<string> {
    if (this.usesLocalStorage()) {
      if (!fileId) {
        throw new AppError(
          'LOCAL_STORAGE_FILE_ID_REQUIRED',
          'A file id is required to create a local download URL.',
          500,
        );
      }
      const expires = Math.floor(Date.now() / 1000) + 60 * 60;
      const signature = this.localSignature('GET', fileId, storageKey, expires);
      return `${this.publicUrl}/api/v1/uploads/${encodeURIComponent(fileId)}/content?expires=${expires}&signature=${signature}`;
    }

    await this.ensureBucket();
    const { publicClient, bucket } = this.configured();
    return getSignedUrl(publicClient, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), {
      expiresIn: 60 * 60,
    });
  }

  /**
   * A same-origin URL signed by the API. Unlike a direct S3/MinIO presigned
   * URL it remains usable when the frontend is HTTPS but the storage endpoint
   * is private, on a different origin, or only reachable from the API.
   */
  signApiDownload(fileId: string, storageKey: string, expiresInSeconds = 60 * 60): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = this.localSignature('GET', fileId, storageKey, expires);
    return `${this.publicUrl}/api/v1/uploads/${encodeURIComponent(fileId)}/content?expires=${expires}&signature=${signature}`;
  }

  async inspectObject(storageKey: string) {
    if (this.usesLocalStorage()) {
      const objectPath = this.localObjectPath(storageKey);
      try {
        const [objectStat, metadata] = await Promise.all([
          stat(objectPath),
          readFile(`${objectPath}.metadata.json`, 'utf8'),
        ]);
        const parsed = JSON.parse(metadata) as { contentType?: unknown };
        return {
          contentLength: objectStat.size,
          contentType: typeof parsed.contentType === 'string' ? parsed.contentType : null,
        };
      } catch {
        throw new AppError(
          'UPLOAD_OBJECT_MISSING',
          'The uploaded object was not found in storage.',
          409,
        );
      }
    }

    await this.ensureBucket();
    const { client, bucket } = this.configured();
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
      return {
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch {
      throw new AppError(
        'UPLOAD_OBJECT_MISSING',
        'The uploaded object was not found in storage.',
        409,
      );
    }
  }

  async sha256Object(storageKey: string): Promise<string> {
    const bytes = await this.readObjectBytes(storageKey);
    return createHash('sha256').update(bytes).digest('hex');
  }

  async readObjectBytes(storageKey: string): Promise<Uint8Array> {
    if (this.usesLocalStorage()) {
      try {
        return await readFile(this.localObjectPath(storageKey));
      } catch {
        throw new AppError(
          'UPLOAD_OBJECT_MISSING',
          'The uploaded object was not found in storage.',
          409,
        );
      }
    }

    await this.ensureBucket();
    const { client, bucket } = this.configured();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (!result.Body) {
      throw new AppError('UPLOAD_OBJECT_MISSING', 'The uploaded object is empty.', 409);
    }
    return result.Body.transformToByteArray();
  }

  verifyLocalDownload(
    fileId: string,
    storageKey: string,
    expires: number,
    signature: string,
  ): void {
    if (!this.usesLocalStorage()) {
      throw new AppError('LOCAL_STORAGE_DISABLED', 'Local file serving is disabled.', 404);
    }
    if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
      throw new AppError('UPLOAD_URL_EXPIRED', 'The file URL has expired.', 403);
    }
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      throw new AppError('UPLOAD_URL_INVALID', 'The file URL signature is invalid.', 403);
    }
    const expected = Buffer.from(this.localSignature('GET', fileId, storageKey, expires), 'hex');
    const supplied = Buffer.from(signature, 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new AppError('UPLOAD_URL_INVALID', 'The file URL signature is invalid.', 403);
    }
  }

  async openLocalObject(storageKey: string): Promise<{
    stream: ReadStream;
    contentLength: number;
  }> {
    if (!this.usesLocalStorage()) {
      throw new AppError('LOCAL_STORAGE_DISABLED', 'Local file serving is disabled.', 404);
    }
    const objectPath = this.localObjectPath(storageKey);
    try {
      const objectStat = await stat(objectPath);
      return {
        stream: createReadStream(objectPath),
        contentLength: objectStat.size,
      };
    } catch {
      throw new AppError('UPLOAD_OBJECT_MISSING', 'The uploaded object was not found.', 404);
    }
  }

  async openObject(storageKey: string): Promise<{
    bytes: Uint8Array;
  }> {
    return { bytes: await this.readObjectBytes(storageKey) };
  }

  onModuleDestroy() {
    this.client?.destroy();
    this.publicClient?.destroy();
  }

  private ensureBucket(): Promise<void> {
    this.configured();
    if (!this.bucketReady) {
      this.bucketReady = this.ensureBucketExists().catch((error) => {
        this.bucketReady = undefined;
        throw error;
      });
    }
    return this.bucketReady;
  }

  private async ensureBucketExists() {
    const { client, bucket } = this.configured();
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status !== 404) throw error;
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  private configured(): {
    client: S3Client;
    publicClient: S3Client;
    bucket: string;
  } {
    if (!this.client || !this.publicClient || !this.bucket) {
      throw new AppError(
        'STORAGE_NOT_CONFIGURED',
        'Object storage is not configured for this deployment.',
        503,
      );
    }
    return {
      client: this.client,
      publicClient: this.publicClient,
      bucket: this.bucket,
    };
  }

  private localObjectPath(storageKey: string): string {
    const target = resolve(this.localPath, storageKey);
    if (target !== this.localPath && !target.startsWith(`${this.localPath}${sep}`)) {
      throw new AppError('INVALID_STORAGE_KEY', 'Invalid object storage key.', 400);
    }
    return target;
  }

  private localSignature(
    method: 'GET',
    fileId: string,
    storageKey: string,
    expires: number,
  ): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${method}\n${fileId}\n${storageKey}\n${expires}`)
      .digest('hex');
  }
}
