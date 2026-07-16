import { Injectable } from '@nestjs/common';
import { KioskDevice, Prisma } from '@prisma/client';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export function generateDeviceSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDeviceSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function secretMatches(device: KioskDevice, rawSecret: string): boolean {
  const candidate = Buffer.from(hashDeviceSecret(rawSecret), 'hex');
  const stored = Buffer.from(device.secretHash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

@Injectable()
export class KioskDevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    clinicLocationId: string;
    label: string;
    registeredBy: string;
  }): Promise<{ device: KioskDevice; rawSecret: string }> {
    const rawSecret = generateDeviceSecret();
    const device = await this.prisma.kioskDevice.create({
      data: { ...data, secretHash: hashDeviceSecret(rawSecret) },
    });
    return { device, rawSecret };
  }

  findById(id: string): Promise<KioskDevice | null> {
    return this.prisma.kioskDevice.findUnique({ where: { id } });
  }

  list(organizationIds: string[] | null, clinicLocationId?: string): Promise<KioskDevice[]> {
    const where: Prisma.KioskDeviceWhereInput = {
      ...(organizationIds ? { organizationId: { in: organizationIds } } : {}),
      ...(clinicLocationId ? { clinicLocationId } : {}),
    };
    return this.prisma.kioskDevice.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  deactivate(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.kioskDevice.updateMany({
      where: { id, status: 'active' },
      data: { status: 'inactive' },
    });
  }

  async rotateSecret(id: string): Promise<{ device: KioskDevice; rawSecret: string }> {
    const rawSecret = generateDeviceSecret();
    const device = await this.prisma.kioskDevice.update({
      where: { id },
      data: { secretHash: hashDeviceSecret(rawSecret) },
    });
    return { device, rawSecret };
  }
}
