import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../shared/database/prisma.service';
import { LoginDto, LoginResponseDto } from './auth.dto';
import { JwtPayload } from '../../../shared/guards/jwt.strategy';

type UserRoleWithPermissions = {
  role: {
    code: string;
    permissions: Array<{ resourceCode: string; action: string }>;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, hostname?: string): Promise<LoginResponseDto> {
    const tenant = hostname
      ? await this.prisma.tenant.findFirst({
          where: { OR: [{ domain: hostname }, { code: hostname }], deletedAt: null },
        })
      : await this.prisma.tenant.findFirst({ where: { deletedAt: null } });

    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const user = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, username: dto.username, deletedAt: null },
      include: {
        userRoles: {
          where: { deletedAt: null },
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const userRoles = user.userRoles as UserRoleWithPermissions[];
    const roles = userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.permissions.map((p) => `${p.resourceCode}:${p.action}`),
        ),
      ),
    ];

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: tenant.id,
      username: user.username,
      roles,
      permissions,
    };

    const token = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    // Log login
    await this.prisma.userLoginLog.create({
      data: { tenantId: tenant.id, userId: user.id },
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar ?? undefined,
        roles,
        permissions,
        tenantId: tenant.id,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { deletedAt: null },
          include: { role: { include: { permissions: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const userRoles = user.userRoles as UserRoleWithPermissions[];
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      gender: user.gender,
      roles: userRoles.map((ur) => ur.role.code),
      permissions: [
        ...new Set(
          userRoles.flatMap((ur) =>
            ur.role.permissions.map((p) => `${p.resourceCode}:${p.action}`),
          ),
        ),
      ],
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      });
      const newPayload: JwtPayload = {
        sub: payload.sub,
        tenantId: payload.tenantId,
        username: payload.username,
        roles: payload.roles,
        permissions: payload.permissions,
      };
      return { token: this.jwt.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getAdminProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { deletedAt: null },
          include: { role: { select: { code: true } } },
        },
        employee: {
          select: { id: true, departmentId: true, position: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const firstRole = user.userRoles[0]?.role?.code ?? 'user';
    // Return nested under `user` key as expected by FE (docs.md response contract)
    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        avatar: user.avatar ?? '',
        gender: user.gender === 'female' ? 0 : 1,
        role: firstRole,
        username: user.username,
        email: user.email ?? '',
        employeeId: user.employee?.id ?? null,
        departmentId: user.employee?.departmentId ?? null,
        position: user.employee?.position ?? null,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, updatedBy: userId },
    });

    return { message: 'Password changed successfully' };
  }
}
