import { Injectable } from '@nestjs/common';
import { Prisma, UserPreference } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictAppError } from '../../common/errors/app-error';

export interface PreferenceDocument {
  locale: string;
  timezone: string;
  dateFormat: string;
  theme: string;
  notificationChannels: Prisma.InputJsonValue;
  deviceSettings: Prisma.InputJsonValue;
}

const DEFAULTS: PreferenceDocument = {
  locale: 'vi-VN',
  timezone: 'Asia/Ho_Chi_Minh',
  dateFormat: 'DD/MM/YYYY',
  theme: 'system',
  notificationChannels: { inApp: true, email: true, sms: false, push: false },
  deviceSettings: { biometricLogin: false, mobileNotifications: true },
};

@Injectable()
export class UserPreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrDefault(userId: string): Promise<UserPreference> {
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    if (existing) return existing;
    return { userId, ...DEFAULTS, version: 1, updatedAt: new Date() } as UserPreference;
  }

  /** Full-document PUT. First write for a user creates the row (starting at
   * version 1, ignoring any client-sent version); subsequent writes require the
   * caller to send the current version for optimistic concurrency. */
  async upsert(userId: string, version: number, data: PreferenceDocument): Promise<UserPreference> {
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    if (!existing) {
      return this.prisma.userPreference.create({
        data: { userId, ...data, version: 1 },
      });
    }
    const result = await this.prisma.userPreference.updateMany({
      where: { userId, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'Preferences were modified by another request.',
      );
    }
    const updated = await this.prisma.userPreference.findUnique({ where: { userId } });
    return updated as UserPreference;
  }
}
