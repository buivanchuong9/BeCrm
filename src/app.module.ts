import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';

import { validateEnv } from './config/env.validation';
import { buildConfiguration, AppConfiguration } from './config/configuration';

import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';

import { AuditModule } from './common/audit/audit.module';
import { OutboxModule } from './common/outbox/outbox.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/authorization/roles.guard';

import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PatientsModule } from './modules/patients/patients.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { QueueModule } from './modules/queue/queue.module';
import { AiAssessmentModule } from './modules/ai-assessment/ai-assessment.module';
import { DoctorDecisionModule } from './modules/doctor-decision/doctor-decision.module';
import { ClinicalOrdersModule } from './modules/clinical-orders/clinical-orders.module';
import { HealthModule } from './modules/health/health.module';
import { PractitionersModule } from './modules/practitioners/practitioners.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { OperationsModule } from './modules/operations/operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => buildConfiguration(validateEnv(raw)),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => ({
        pinoHttp: {
          level: config.get('logLevel', { infer: true }),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
              'req.body.token',
              'req.body.refreshToken',
              'req.body.accessToken',
              'req.body.mfaSecret',
              'req.body.otp',
            ],
            censor: '[REDACTED]',
          },
          autoLogging: true,
          customProps: (req) => ({ requestId: (req as { requestId?: string }).requestId }),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => ({
        connection: { url: config.get('redis', { infer: true }).url },
      }),
    }),

    PrismaModule,
    RedisModule,
    AuditModule,
    OutboxModule,
    IdempotencyModule,

    IdentityModule,
    OrganizationsModule,
    PatientsModule,
    PractitionersModule,
    EncountersModule,
    AppointmentsModule,
    QueueModule,
    AiAssessmentModule,
    DoctorDecisionModule,
    ClinicalOrdersModule,
    WorkflowModule,
    MedicalRecordsModule,
    OperationsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
