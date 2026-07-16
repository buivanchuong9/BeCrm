import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { NotFoundAppError } from '../../common/errors/app-error';
import { KioskDevicesRepository } from './kiosk-devices.repository';
import {
  assertClinicInScope,
  assertQueueViewScope,
  RECEPTION_ROLES,
} from './policies/queue-policies';
import { RegisterKioskDeviceRequest } from './dto/register-kiosk-device.dto';
import {
  KioskDeviceRegisteredResponseDto,
  KioskDeviceResponseDto,
} from './dto/responses/kiosk-device-response.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

function toResponse(device: {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  label: string;
  status: string;
  createdAt: Date;
}): KioskDeviceResponseDto {
  return {
    id: device.id,
    organizationId: device.organizationId,
    clinicLocationId: device.clinicLocationId,
    label: device.label,
    status: device.status as KioskDeviceResponseDto['status'],
    createdAt: device.createdAt.toISOString(),
  };
}

@Injectable()
export class KioskDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: KioskDevicesRepository,
    private readonly audit: AuditService,
  ) {}

  async register(
    principal: AuthenticatedPrincipal,
    dto: RegisterKioskDeviceRequest,
    context: RequestContext,
  ): Promise<{ data: KioskDeviceRegisteredResponseDto }> {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: dto.clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, RECEPTION_ROLES, clinicLocation.organizationId);

    const { device, rawSecret } = await this.devices.create({
      organizationId: clinicLocation.organizationId,
      clinicLocationId: dto.clinicLocationId,
      label: dto.label,
      registeredBy: principal.userId,
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'kiosk_device.registered',
      resourceType: 'kiosk_device',
      resourceId: device.id,
      organizationId: clinicLocation.organizationId,
      clinicLocationId: dto.clinicLocationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return { data: { ...toResponse(device), deviceSecret: rawSecret } };
  }

  async list(principal: AuthenticatedPrincipal, clinicLocationId?: string) {
    const orgIds = assertQueueViewScope(principal, RECEPTION_ROLES);
    const rows = await this.devices.list(orgIds.length > 0 ? orgIds : null, clinicLocationId);
    return { data: rows.map(toResponse) };
  }

  async deactivate(principal: AuthenticatedPrincipal, deviceId: string, context: RequestContext) {
    const device = await this.devices.findById(deviceId);
    if (!device) {
      throw new NotFoundAppError('Kiosk device not found.');
    }
    assertClinicInScope(principal, RECEPTION_ROLES, device.organizationId);
    await this.devices.deactivate(deviceId);
    await this.audit.write({
      actorId: principal.userId,
      action: 'kiosk_device.deactivated',
      resourceType: 'kiosk_device',
      resourceId: deviceId,
      organizationId: device.organizationId,
      clinicLocationId: device.clinicLocationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: { deactivated: true } };
  }

  async rotateSecret(principal: AuthenticatedPrincipal, deviceId: string, context: RequestContext) {
    const device = await this.devices.findById(deviceId);
    if (!device || device.status !== 'active') {
      throw new NotFoundAppError('Active kiosk device not found.');
    }
    assertClinicInScope(principal, RECEPTION_ROLES, device.organizationId);
    const rotated = await this.devices.rotateSecret(deviceId);
    await this.audit.write({
      actorId: principal.userId,
      action: 'kiosk_device.secret_rotated',
      resourceType: 'kiosk_device',
      resourceId: deviceId,
      organizationId: device.organizationId,
      clinicLocationId: device.clinicLocationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: { ...toResponse(rotated.device), deviceSecret: rotated.rawSecret } };
  }
}
