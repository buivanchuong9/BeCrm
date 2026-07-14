import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfiguration } from '../../config/configuration';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Owns the raw ioredis connection so it can be closed on module destroy.
 * A bare `useFactory: () => new Redis(...)` provider (the previous shape of
 * this module) has no lifecycle hook and leaves the TCP connection + ioredis
 * reconnect timers open after `app.close()`, which is why tests needed
 * `--forceExit` — see docs/BACKEND_DEVIATIONS.md DEV-005.
 */
@Injectable()
class RedisClientHolder implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService<AppConfiguration, true>) {
    this.client = new Redis(config.get('redis', { infer: true }).url, {
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}

@Global()
@Module({
  providers: [
    RedisClientHolder,
    {
      provide: REDIS_CLIENT,
      useFactory: (holder: RedisClientHolder) => holder.client,
      inject: [RedisClientHolder],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
