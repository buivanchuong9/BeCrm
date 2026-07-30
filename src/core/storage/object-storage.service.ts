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
  private readonly client: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;
  private bucketReady?: Promise<void>;

  constructor(config: ConfigService<AppConfiguration, true>) {
    const storage = config.get('storage', { infer: true });
    if (!storage.endpoint || !storage.bucket || !storage.accessKey || !storage.secretKey) {
      throw new Error('S3 storage endpoint, bucket and credentials must be configured.');
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
    return getSignedUrl(
      this.publicClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: contentType,
      }),
      { expiresIn: 15 * 60 },
    );
  }

  async presignGet(storageKey: string): Promise<string> {
    await this.ensureBucket();
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      { expiresIn: 60 * 60 },
    );
  }

  async inspectObject(storageKey: string) {
    await this.ensureBucket();
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
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
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    if (!result.Body) {
      throw new AppError('UPLOAD_OBJECT_MISSING', 'The uploaded object is empty.', 409);
    }
    const bytes = await result.Body.transformToByteArray();
    return createHash('sha256').update(bytes).digest('hex');
  }

  onModuleDestroy() {
    this.client.destroy();
    this.publicClient.destroy();
  }

  private ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.ensureBucketExists().catch((error) => {
        this.bucketReady = undefined;
        throw error;
      });
    }
    return this.bucketReady;
  }

  private async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status !== 404) throw error;
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
