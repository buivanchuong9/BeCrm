# Missing Endpoints

**Total missing: 207**  
**After external/stub exclusions: ~150 real gaps**

---

## Saleflow Module (14 missing)

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/saleflowApproach/list` | GET | P1 |
| `/adminapi/saleflowApproach/get` | GET | P1 |
| `/adminapi/saleflowApproach/update/sla` | POST | P2 |
| `/adminapi/saleflowActivity/list` | GET | P1 |
| `/adminapi/saleflowExchange/list` | GET | P1 |
| `/adminapi/saleflowExchange/get` | GET | P1 |
| `/adminapi/saleflowInvoice/get` | GET | P1 |
| `/adminapi/saleflowInvoice/delete` | DELETE | P1 |
| `/adminapi/saleflowInvoice/update/approach` | POST | P1 |
| `/adminapi/saleflowInvoice/update/cancel` | POST | P1 |
| `/adminapi/saleflowInvoice/update/success` | POST | P1 |
| `/adminapi/saleflowSale/get/byApproachId` | GET | P1 |
| `/adminapi/saleflowSale/update` | POST | P1 |
| `/adminapi/saleflowEform/get/criteria` | GET | P2 |

---

## KPI Module (21 missing)

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/kpi/update` | POST | P2 |
| `/adminapi/kpi/delete` | DELETE | P2 |
| `/adminapi/kpiApply/list` | GET | P2 |
| `/adminapi/kpiApply/update` | POST | P2 |
| `/adminapi/kpiApply/delete` | DELETE | P2 |
| `/adminapi/kpiApply/get/byCampaignId` | GET | P2 |
| `/adminapi/kpiGoal/list` | GET | P2 |
| `/adminapi/kpiGoal/get` | GET | P2 |
| `/adminapi/kpiObject/get` | GET | P2 |
| `/adminapi/kpiObject/get/byObject` | GET | P2 |
| `/adminapi/kpiObject/employee/result` | GET | P2 |
| `/adminapi/kpiObject/update/web` | POST | P2 |
| `/adminapi/kpiSetupObject/list/byKotId` | GET | P2 |
| `/adminapi/kpiSetupObject/update/web` | POST | P2 |
| `/adminapi/kpiTemplateGoal/list` | GET | P2 |
| `/adminapi/kpiExchange/get` | GET | P2 |
| `/adminapi/kpiExchange/update` | POST | P2 |
| `/adminapi/kpiExchange/delete` | DELETE | P2 |
| `/adminapi/kpiDatasource/update` | POST | P2 |
| `/adminapi/kpiDatasource/delete` | DELETE | P2 |
| `/adminapi/campaignSale/interaction/kpis` | GET | P2 |

---

## Treatment Module (9 missing)

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/treatmentHistory/list_all` | GET | P1 |
| `/adminapi/treatmentHistory/list_by_customer` | GET | P1 |
| `/adminapi/treatmentHistory/get` | GET | P1 |
| `/adminapi/treatmentRoom/get` | GET | P1 |
| `/adminapi/treatmentRoom/check` | GET | P2 |
| `/adminapi/treatmentTime/list_schedule_next` | GET | P1 |
| `/adminapi/treatmentTime/get_byscheduler` | GET | P1 |
| `/adminapi/treatmentTime/update_next` | POST | P1 |
| `/adminapi/treatmentTime/update_caring_employee` | POST | P1 |

---

## Campaign Dashboard (9 missing)

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/campaignOpportunity/statisticConvertRate` | GET | P2 |
| `/adminapi/campaignOpportunity/totalByApproach/dashboard` | GET | P2 |
| `/adminapi/campaignOpportunity/totalByDate/dashboard` | GET | P2 |
| `/adminapi/campaignOpportunity/totalExpectedRevenue/dashboard` | GET | P2 |
| `/adminapi/campaignOpportunity/totalExpectedRevenue/dashboard/detail` | GET | P2 |
| `/adminapi/campaignOpportunity/totalByApproach/dashboard` | GET | P2 |
| `/adminapi/campaignOpportunity/check` | GET | P2 |
| `/adminapi/campaign/sale-point-config/get` | GET | P2 |
| `/adminapi/campaign/sale-point-config/update` | POST | P2 |

---

## Mailbox Module (7 missing — entire module)

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/mailbox/list` | GET | P2 |
| `/adminapi/mailbox/get` | GET | P2 |
| `/adminapi/mailbox/update` | POST | P2 |
| `/adminapi/mailbox/delete` | DELETE | P2 |
| `/adminapi/mailbox/viewer` | GET | P2 |
| `/adminapi/mailbox/update/viewer` | POST | P2 |
| `/adminapi/mailboxExchange/update` | POST | P2 |
| `/adminapi/mailboxExchange/delete` | DELETE | P2 |

---

## Scattered P1 Missing

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/adminapi/scheduleConsultant/get` | GET | P1 |
| `/adminapi/scheduleTreatment/get` | GET | P2 |
| `/notification/notificationHistory/get` | GET | P2 |
| `/adminapi/contactPipeline/get` | GET | P2 |
| `/adminapi/contactStatus/get` | GET | P2 |
| `/adminapi/opportunityExchange/get` | GET | P2 |
| `/adminapi/workOrder/report` | GET | P2 |

---

## Scattered P2 Missing (~100 more)

See `API_COVERAGE_AUDIT.md` for full list.  
Most are `get`/`detail` variants of existing list endpoints, or action variants (approve/cancel/clone) of mutation endpoints.
