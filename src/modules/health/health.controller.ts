import { Controller, Get, HttpStatus, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Public } from '../../common/auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('ready')
  async ready(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', database: 'unreachable' });
    }
  }
}
