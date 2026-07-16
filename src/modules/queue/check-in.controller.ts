import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { ApiOkEnvelope } from '../../common/http/api-envelope.decorator';
import { CreateCheckInRequest } from './dto/create-check-in.dto';
import { CheckInResponseDto } from './dto/responses/check-in-response.dto';
import { CheckInService } from './check-in.service';

@ApiTags('check-in')
@Controller({ path: 'check-ins', version: '1' })
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  // Public: called by unauthenticated kiosk terminals and the reception desk
  // terminal alike — authorization is device-credential-based, not JWT-based
  // (docs/api.md section 21 APT-9, section 40 SEC-10). Idempotent-replay
  // scans and its own device rate limit (docs/api.md section 42) are its
  // substitute for the normal Idempotency-Key contract.
  //
  // 200, not 201: a repeated scan of the same token must return the exact
  // same status/shape as the first scan (docs/api.md section 4 principle 3 /
  // section 21 APT-9) — the response only differs in `repeated`, never in
  // HTTP status, since the client cannot know in advance which case it is.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkEnvelope(CheckInResponseDto)
  @Post()
  @HttpCode(HttpStatus.OK)
  async checkIn(@Body() dto: CreateCheckInRequest, @Req() req: Request) {
    return this.checkInService.checkIn(dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}

@ApiTags('check-in')
@Controller({ path: 'check-in', version: '1' })
export class CheckInAliasController {
  constructor(private readonly checkInService: CheckInService) {}
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  checkIn(@Body() dto: CreateCheckInRequest, @Req() req: Request) {
    return this.checkInService.checkIn(dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
