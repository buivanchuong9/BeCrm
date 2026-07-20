import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';

import { validateEnv } from './core/configuration/env.validation';
import { buildConfiguration, AppConfiguration } from './core/configuration/configuration';

import { PrismaModule } from './core/database/prisma.module';
import { RedisModule } from './core/cache/redis.module';

import { AuditModule } from './core/audit/audit.module';
import { OutboxModule } from './core/outbox/outbox.module';
import { IdempotencyModule } from './core/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './core/idempotency/idempotency.interceptor';
import { createRequestId } from './core/http/request-id.middleware';
import { CsrfOriginGuard } from './core/http/csrf-origin.guard';
import { JwtAuthGuard } from './core/security/jwt-auth.guard';
import { RolesGuard } from './common/authorization/roles.guard';
import { AuthorizationModule } from './common/authorization/authorization.module';
import { PermissionsGuard } from './common/authorization/permissions.guard';

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
import { OwnerGovernanceModule } from './modules/owner-governance/owner-governance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';

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
              'req.body.deviceSecret',
              'req.body.mfaCode',
              'req.body.mfaSecret',
              'req.body.otp',
              'req.body.*.password',
              'req.body.*.token',
            ],
            censor: '[REDACTED]',
          },
          autoLogging: true,
          genReqId: (req, res) => {
            const requestId = createRequestId(req.headers['x-request-id'] as string | undefined);
            res.setHeader('x-request-id', requestId);
            return requestId;
          },
          customProps: (req) => ({ requestId: req.id }),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => {
        const rateLimit = config.get('rateLimit', { infer: true });
        return { throttlers: [{ ttl: rateLimit.ttlMs, limit: rateLimit.max }] };
      },
    }),
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
    AuthorizationModule,

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
    OwnerGovernanceModule,
    NotificationsModule,
    CarePlansModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: CsrfOriginGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
