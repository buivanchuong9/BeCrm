import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
// ThrottlerGuard registered below; JwtAuthGuard + RolesGuard in IdentityAccessModule

import { DatabaseModule } from './shared/database/database.module';
import { HealthModule } from './shared/health/health.module';

// Domain modules
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { CrmModule } from './modules/crm/crm.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { BpmModule } from './modules/bpm/bpm.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PlatformUploadModule } from './modules/platform-upload/platform-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          {
            ttl: cfg.get<number>('THROTTLE_TTL', 60000),
            limit: cfg.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    DatabaseModule,
    HealthModule,

    // Domain modules
    IdentityAccessModule,
    OrganizationModule,
    CrmModule,
    TicketModule,
    WarrantyModule,
    BpmModule,
    NotificationModule,
    PlatformUploadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
