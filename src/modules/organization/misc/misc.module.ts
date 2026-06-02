import { Module } from '@nestjs/common';
import { MiscController } from './misc.controller';
import { MiscService } from './misc.service';
import { RootController } from './root.controller';
import { FintechController } from './fintech.controller';

@Module({
  controllers: [MiscController, RootController, FintechController],
  providers: [MiscService],
  exports: [MiscService],
})
export class MiscModule {}
