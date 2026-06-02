import { Module } from '@nestjs/common';
import { BusinessPartnerController } from './business-partner.controller';
import { BusinessPartnerService } from './business-partner.service';

@Module({ controllers: [BusinessPartnerController], providers: [BusinessPartnerService], exports: [BusinessPartnerService] })
export class BusinessPartnerModule {}
