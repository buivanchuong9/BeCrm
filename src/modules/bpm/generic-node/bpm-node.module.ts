import { Module } from '@nestjs/common';
import { BpmNodeController } from './bpm-node.controller';
import { BpmNodeService } from './bpm-node.service';

@Module({
  controllers: [BpmNodeController],
  providers: [BpmNodeService],
  exports: [BpmNodeService],
})
export class BpmNodeModule {}
