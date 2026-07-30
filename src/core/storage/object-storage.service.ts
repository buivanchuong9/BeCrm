import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AppConfiguration } from '../configuration/configuration';
import { AppError } from '../errors/app-error';

@Injectable()
export class ObjectStorageService implements OnModuleDestroy {
  private readonly client: S3Client | null;
  private readonly publicClient: S3Client | null;
  private readonly bucket: string | null;
  private bucketReady?: Promise<void>;

  constructor(config: ConfigService<AppConfiguration, true>) {
    const storage = config.get('storage', { infer: true });
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

  async presignGet(storageKey: string): Promise<string> {
    await this.ensureBucket();
    const { publicClient, bucket } = this.configured();
    return getSignedUrl(publicClient, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), {
      expiresIn: 60 * 60,
    });
  }

  async inspectObject(storageKey: string) {
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
    await this.ensureBucket();
    const { client, bucket } = this.configured();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (!result.Body) {
      throw new AppError('UPLOAD_OBJECT_MISSING', 'The uploaded object is empty.', 409);
    }
    const bytes = await result.Body.transformToByteArray();
    return createHash('sha256').update(bytes).digest('hex');
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
}
