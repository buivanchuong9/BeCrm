import { Controller, Get, HttpStatus, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Public } from '../../common/auth/public.decorator';
import { AppError } from '../../common/errors/app-error';

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
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new AppError(
        'DEPENDENCY_UNAVAILABLE',
        'Database readiness check failed.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
