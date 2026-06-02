import { Module } from '@nestjs/common';
import { ContactController } from './contact/contact.controller';
import { ContactService } from './contact/contact.service';
import { CampaignController } from './campaign/campaign.controller';
import { CampaignService } from './campaign/campaign.service';
import { OpportunityController } from './opportunity/opportunity.controller';
import { OpportunityService } from './opportunity/opportunity.service';
import { CareHistoryController } from './care-history/care-history.controller';
import { CareHistoryService } from './care-history/care-history.service';
import { MarketingAutomationController } from './marketing-automation/marketing-automation.controller';
import { MarketingAutomationService } from './marketing-automation/marketing-automation.service';
import { ContractModule } from './contract/contract.module';
import { SaleflowModule } from './saleflow/saleflow.module';
import { KpiModule } from './kpi/kpi.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SurveyModule } from './survey/survey.module';
import { BusinessPartnerModule } from './business-partner/business-partner.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ContractWarrantyModule } from './contract-warranty/contract-warranty.module';
import { GuaranteeModule } from './guarantee/guarantee.module';

@Module({
  imports: [ContractModule, SaleflowModule, KpiModule, ScheduleModule, SurveyModule, BusinessPartnerModule, InvoiceModule, ContractWarrantyModule, GuaranteeModule],
  controllers: [
    ContactController,
    CampaignController,
    OpportunityController,
    CareHistoryController,
    MarketingAutomationController,
  ],
  providers: [
    ContactService,
    CampaignService,
    OpportunityService,
    CareHistoryService,
    MarketingAutomationService,
  ],
  exports: [CampaignService, ContactService],
})
export class CrmModule {}
