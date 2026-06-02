import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException, ConflictException } from '../../../shared/exceptions/domain.exception';
import { CreateUserDto, UpdateUserDto, ListUserDto, ResetPasswordDto, FcmDeviceDto } from './user.dto';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: RequestUser) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId: actor.tenantId, username: dto.username, deletedAt: null },
    });
    if (exists) throw new ConflictException('Username already exists in this tenant');

    const hash = await bcrypt.hash(dto.password!, 10);
    return this.prisma.user.create({
      data: {
        tenantId: actor.tenantId,
        username: dto.username,
        passwordHash: hash,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        avatar: dto.avatar,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async adminUpdate(userId: string, dto: UpdateUserDto, actor: RequestUser) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId: actor.tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User', userId);

    const updateData: Record<string, unknown> = {
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    if (dto.name) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({ where: { id: userId }, data: updateData });
  }

  async list(dto: ListUserDto, tenantId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (dto.name) where.name = { contains: dto.name, mode: 'insensitive' };
    if (dto.phone) where.phone = { contains: dto.phone };
    if (dto.isActive !== undefined) where.isActive = dto.isActive === 'true';

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          gender: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getById(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      include: {
        userRoles: {
          where: { deletedAt: null },
          include: { role: true },
        },
        employee: true,
      },
    });
    if (!user) throw new NotFoundException('User', userId);
    return user;
  }

  async getBasicInfo(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, avatar: true, phone: true, email: true },
    });
  }

  async selectUsers(tenantId: string, name?: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, avatar: true, phone: true },
      take: 50,
    });
  }

  async delete(userId: string, actor: RequestUser) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'User deleted' };
  }

  async resetPassword(dto: ResetPasswordDto, actor: RequestUser) {
    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { passwordHash: hash, updatedBy: actor.id },
    });
    return { message: 'Password reset successfully' };
  }

  async upsertFcmDevice(dto: FcmDeviceDto, actor: RequestUser) {
    const existing = await this.prisma.fcmDevice.findFirst({
      where: { userId: actor.id, fcmToken: dto.fcmToken, deletedAt: null },
    });

    if (existing) {
      return this.prisma.fcmDevice.update({
        where: { id: existing.id },
        data: { isActive: true, deviceType: dto.deviceType, updatedAt: new Date() },
      });
    }

    return this.prisma.fcmDevice.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        fcmToken: dto.fcmToken,
        deviceType: dto.deviceType,
      },
    });
  }
}
