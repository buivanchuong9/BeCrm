import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../core/http/api-envelope.decorator';
import {
  KioskDeviceRegisteredResponseDto,
  KioskDeviceResponseDto,
} from './dto/responses/kiosk-device-response.dto';
import { RegisterKioskDeviceRequest } from './dto/register-kiosk-device.dto';
import { KioskDevicesService } from './kiosk-devices.service';

class ListKioskDevicesQuery {
  @IsOptional() @IsUUID() clinicLocationId?: string;
}

@ApiTags('kiosk-devices')
@Controller({ path: 'kiosk-devices', version: '1' })
export class KioskDevicesController {
  constructor(private readonly kioskDevicesService: KioskDevicesService) {}

  @ApiCreatedEnvelope(KioskDeviceRegisteredResponseDto)
  @RequireIdempotencyKey()
  @Post()
  async register(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: RegisterKioskDeviceRequest,
    @Req() req: Request,
  ) {
    return this.kioskDevicesService.register(principal, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkListEnvelope(KioskDeviceResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListKioskDevicesQuery,
  ) {
    return this.kioskDevicesService.list(principal, query.clinicLocationId);
  }

  @ApiOkEnvelope(KioskDeviceResponseDto)
  @Post(':deviceId/deactivations')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Req() req: Request,
  ) {
    return this.kioskDevicesService.deactivate(principal, deviceId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkEnvelope(KioskDeviceRegisteredResponseDto)
  @RequireIdempotencyKey()
  @Post(':deviceId/credential-rotations')
  @HttpCode(HttpStatus.OK)
  async rotateSecret(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Req() req: Request,
  ) {
    return this.kioskDevicesService.rotateSecret(principal, deviceId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
