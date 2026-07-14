import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OutboxService } from './outbox.service';
import { OutboxDispatcherService, OUTBOX_QUEUE } from './outbox-dispatcher.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: OUTBOX_QUEUE })],
  providers: [OutboxService, OutboxDispatcherService],
  exports: [OutboxService],
})
export class OutboxModule {}
