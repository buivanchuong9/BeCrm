import { Module } from '@nestjs/common';
import { GuaranteeController } from './guarantee.controller';
import { GuaranteeService } from './guarantee.service';

@Module({ controllers: [GuaranteeController], providers: [GuaranteeService], exports: [GuaranteeService] })
export class GuaranteeModule {}
