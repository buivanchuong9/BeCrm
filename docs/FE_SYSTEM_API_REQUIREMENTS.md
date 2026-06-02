# CRM FE - System and API Requirements

Tai lieu nay duoc lap tu viec quet folder `crm/src` ngay 2026-06-02. Muc tieu la mo ta toan bo he thong FE CRM va cac nhom API BE can cung cap de FE chay du.

## 1. Tong quan ky thuat

- App: React 17 + TypeScript + Vite.
- Entry: `src/main.tsx`, app shell: `src/App.tsx`, layout dang nhap: `src/pages/layout.tsx`.
- Routing: `src/app/routes.tsx`; menu/sidebar: `src/app/menu.tsx`; path constants: default export trong `src/configs/urls.ts`.
- API URL registry: `src/configs/urls.ts`, object `urlsApi`.
- API call layer: `src/services/*.ts`, `src/services/fintech/*.ts`.
- Mock: MSW trong `src/mocks`; bat bang `VITE_USE_MOCKS=true`.
- UI/libs chinh: antd, ag-grid, react-router-dom v6, react-big-calendar, reactflow, bpmn-js, form-js, highcharts, slate, firebase messaging, WebRTC/SIP.

Quy mo quet:

- `src/configs/urls.ts`: 3348 dong, chua hon 200 nhom endpoint.
- `src/services`: 220 service file.
- `api_scan_services.csv`: 1671 loi goi API duoc trich xuat tu service layer.

## 2. Cach FE goi API

Tat ca request `fetch` di qua `src/configs/fetchConfig.ts`.

Header mac dinh:

- `Authorization: Bearer <token>` neu co cookie `token`.
- `Selectedrole: <departmentId>_<roleId>` neu localStorage co `SelectedRole`.
- `Accept: application/json`.
- `Content-Type: application/json`, tru cac flow upload co helper rieng.
- `Hostname: location.hostname`.

Quy tac base URL:

- URL bat dau bang `/adminapi`:
  - localhost: ghep `process.env.APP_ADMIN_URL + url`.
  - domain that: ghep `process.env.APP_API_URL + url`.
- URL bat dau bang `/api`:
  - localhost: ghep `process.env.APP_API_URL + url`.
  - domain that: ghep `process.env.APP_API_URL + url`.
- URL con lai nhu `/authenticator`, `/notification`, `/system`, `/sale`, `/cs`, `/application`, `/hr`:
  - ghep `process.env.APP_AUTHENTICATOR_URL + url`.
- BPM dung `process.env.APP_BPM_URL + "/bpmapi"` ngay trong `urlsApi`.
- Mot so integration dang mock/hard-code external host: `https://mock.local/*`, `https://athena.mock.local/*`, favicon Google.

Response contract FE dang ky vong:

```ts
{
  code: number;      // 0 la thanh cong
  result: any;       // data payload
  message?: string;  // loi/thong bao hien toast
}
```

Nhieu man list ky vong `result` co du lieu phan trang, tong so ban ghi, hoac array tuy service. Khi BE lam moi nen giu format cu de tranh vo UI.

## 3. Auth, session va permission

Luong trong `src/App.tsx`:

1. Neu chua co `cookies.token`/`cookies.user`, FE redirect `/login?returnUrl=<path>`.
2. Sau dang nhap, FE goi `EmployeeService.info()` de lay thong tin nhan vien/to chuc/goi dich vu/default redirect.
3. FE goi `EmployeeService.takeRoles(token)` de lay danh sach vai tro; neu nhieu role thi hien modal chon role.
4. Permission luu localStorage va doc bang `getPermissions()`; menu/item can code permission tu `src/app/menu.tsx`.
5. Khi response HTTP 401, FE xoa cookie `user`, `token`, localStorage `permissions`, `user.root`.

API BE can co cho auth/session:

- Dang nhap/dang xuat/profile user trong nhom `urlsApi.user`.
- `EmployeeService.info`: thong tin nhan vien hien tai, chi nhanh, goi app, default redirect.
- `EmployeeService.takeRoles`: roles theo token.
- Permission/role/department APIs cho man hinh cau hinh phong ban, vai tro, phan quyen.
- FCM device va notification unread count cho realtime notification.

## 4. Routing va module FE

Route chinh nam trong `src/app/routes.tsx`. FE gom cac vung nghiep vu:

- Dashboard/trang chu.
- Ca nhan: lich, thu noi bo, KPI.
- Khach hang: ho so khach hang, phan khuc, nguoi lien he, setting customer/contact.
- Cham soc khach hang: tong dai, email CSKH, warranty, ticket, feedback, survey/CXM.
- Bao cao: tai chinh, khach hang, login, dashboard/report config.
- Phong kham/van hanh: co so, chi nhanh, phong ban, vai tro, nhan su, lich dieu tri/tu van, cham cong.
- Du an/ca benh/cong viec: patient case, work project, work order, task lists.
- BPM: quan ly quy trinh, tao BPMN, form/eform, participant, business rule, decision table, process simulation.
- Sales/marketing: campaign, CRM campaign, marketing automation, SMS, Email, Zalo, social CRM Facebook/Zalo.
- Kho/san pham/dich vu/the/goi: product, service, card, inventory, warehouse, invoice/payment.
- Bao hanh/ho tro: warranty/ticket list, kanban process, collect public link, detail.
- Tich hop: webhook, Gmail/Outlook, Facebook fanpage, Zalo OA, HRIS, app install.
- Fintech mock modules: loan/deposit/service charge/report/transaction.

## 5. Nhom API BE can cung cap

### 5.1 Core customer/contact/partner

Nhom `urlsApi.customer`, `contact`, `partner`, `customerAttribute`, `contactAttribute`, `customerGroup`, `customerSource`, `career`, `relationShip`, `customerView`, `customerExtraInfo`.

Can co:

- CRUD/list/detail/delete/import/export customer, contact, partner.
- Loc nang cao, saved filters, dynamic attributes, listFilter.
- View phone/email bi che.
- Customer exchange/attachment/care history.
- Bulk update group/source/employee/relationship.
- Customer dashboard/classification/suggestion endpoints.
- Zalo OA follow info, send SMS/email/zalo parser va send.

### 5.2 Employee, organization, permission

Nhom `employee`, `department`, `role`, `permission`, `rolePermission`, `teamEmployee`, `beautyBranch`, `beautySalon`, `position`, `functionalManagement`, `subsystemAdministration`.

Can co:

- Thong tin nhan vien hien tai, danh sach nhan vien, role theo token.
- CRUD phong ban, chi nhanh, vai tro, chuc vu, nhom nhan vien.
- Gan/go quyen theo role va department.
- Cau hinh module/chuc nang he thong.

### 5.3 Clinic schedule and medical flow

Nhom `scheduleConsultant`, `scheduleTreatment`, `scheduleCommon`, `treatment`, `treatmentRoom`, `treatmentHistory`, `diarySurgery`, `doctorQnA`.

Can co:

- Lich tu van, lich dieu tri, lich tong hop.
- Phong dieu tri, lieu trinh, lich su dieu tri, nhat ky phau thuat.
- Tong dai/hoi dap bac si, call history, customer arrival.

### 5.4 Sales, finance, invoice, cashbook

Nhom `invoice`, `paymentHistory`, `cashbook`, `earnings`, `estimate`, `order`, `boughtService`, `boughtProduct`, `boughtCard`, `saleflow`, `saleflowInvoice`.

Can co:

- Hoa don, thanh toan, lich su thanh toan, so quy.
- Dich vu/san pham/the da mua.
- Tinh hoa hong/earnings.
- Bao gia/estimate, order/request.

### 5.5 Product, service, card, warehouse

Nhom `product`, `service`, `card`, `cardService`, `categoryService`, `category`, `unit`, `inventory`, `warehouse`, `material`, `supplier`.

Can co:

- CRUD san pham/dich vu/the/goi, danh muc, don vi.
- Ton kho, kho, vat tu, nha cung cap.
- Import/export/download file loi neu UI co import.

### 5.6 Marketing and communication

Nhom `crmCampaign`, `campaign`, `campaignMarketing`, `campaignOpportunity`, `customerMarketingLead`, `marketingAutomation`, `sendSMS`, `sendEmail`, `templateSMS`, `templateEmail`, `templateZalo`, `templateCategory`, `brandName`, `partnerSMS`, `partnerEmail`, `partnerCall`, `emailConfig`, `mailBox`, `zaloOA`, `fanpageFacebook`, `notificationHistory`, `notificationTemplate`.

Can co:

- Campaign/CRM campaign/opportunity/pipeline CRUD.
- Gui SMS/email/zalo va parser template.
- Template/category/brandname/partner channel config.
- Mailbox, email config, internal mail/chat.
- Fanpage Facebook, Zalo OA connect/sync.
- Notification count/read/unread/readAll.

### 5.7 Warranty and ticket

Nhom `warranty`, `warrantyCategory`, `warrantyProc`, `warrantyStep`, `ticket`, `ticketCategory`, `ticketProc`, `ticketStep`, `supportCommon`.

Can co:

- List/detail/update/delete warranty/ticket.
- Kanban process, step/procedure/category config.
- Transfer executor, collect public link, attachments/history.
- Support common lookup cho warranty/ticket.

### 5.8 Work/project/task

Nhom `workProject`, `workOrder`, `workCategory`, `workType`, `projectCatalog`, `processedObject`, `objectGroup`, `objectAttribute`, `objectExtraInfo`, `objectFeature`, `userTask`.

Can co:

- Ca benh/du an, attachment, cong viec, task assignment/status.
- Middle/pending/completed/priority task lists.
- Object/process metadata, dynamic object fields.

### 5.9 BPM, form, rule engine

Nhom `businessProcess`, `bpmForm`, `bpmFormProcess`, `bpmFormArtifact`, `bpmParticipant`, `bpmEformMapping`, `bpmFormMapping`, `businessRule`, `businessRuleItem`, `decisionTableInput`, `decisionTableOutput`, `formCategory`, `grid`, `document`, `reasonListBpm`.

Can co:

- CRUD quy trinh BPMN, deploy/version/history/view process.
- Form/eform builder, mapping, artifact, upload document.
- Participant/rule/decision table/OLA-SLA configs.
- Dynamic grid rows/columns/import/export.
- `RestService.post` goi `urlsApi.rest.callApi` de FE submit dynamic form/action qua core.

### 5.10 KPI and reporting

Nhom `kpi`, `kpiApply`, `kpiObject`, `kpiDatasource`, `kpiGoal`, `kpiSetup`, `kpiTemplate`, `kpiTemplateGoal`, `report`, `reportChart`, `reportCustomer`, `reportTemplate`, `reportManagement`.

Can co:

- KPI framework, apply task, object tracking, goal/template/setup/datasource.
- Chart/dashboard dynamic fields, report templates, customer reports.

### 5.11 Integration and public utilities

Nhom `webhook`, `connectGmail`, `installApp`, `integrationPartner`, `hris`, `file`, `image`, `qrCode`, `feedback`, `chatbot`, `surveyForm`, `cxmSurvey`, `cxmQuestion`, `cxmOption`.

Can co:

- Upload/download file/image, QR code.
- Webhook config, app install/integration partner.
- Gmail/Outlook/Facebook/Zalo/HRIS connectors.
- Feedback/chatbot/survey/CXM APIs.
- Public routes `/link_survey`, `/upload_document`, `/collect_ticket`, `/collect_warranty` phai cho phep token/public token tuy flow.

### 5.12 Fintech mock/external modules

Nhom `src/services/fintech`: `netLoan`, `netDeposit`, `netServiceCharge`, `productDemand`, `briefFinancialReport`, `fullFinancialReport`, `loanInformation`, `transactionInformation`.

Hien URL dang tro `https://mock.local/finance`. Neu can production, BE/API gateway phai thay the bang endpoint that va giu response shape.

## 6. Danh sach service co nhieu API nhat

Theo scan tu `api_scan_services.csv`:

| Service | So API |
| --- | ---: |
| BusinessProcessService | 200 |
| CustomerService | 91 |
| ContractService | 43 |
| WorkOrderService | 39 |
| UserTaskService | 27 |
| CampaignOpportunityService | 24 |
| CampaignMarketingService | 22 |
| TenderPackageService | 22 |
| MarketingAutomationService | 21 |
| ProcessedObjectService | 21 |
| PurchaseRequestService | 21 |
| CampaignService | 20 |
| ApprovalService | 19 |
| SupportCommonService | 19 |
| EmployeeService | 17 |
| WorkTimeService | 17 |
| FanpageFacebookService | 14 |
| KpiService | 14 |
| PartnerService | 14 |
| ReportChartService | 14 |

## 7. Cach doc phu luc API chi tiet

File `api_scan_services.csv` o root `crm` co format:

```csv
Service,Function,Method,UrlRef,File
```

Vi du:

- `CustomerService,list,GET,urlsApi.customer.filter,...`
- `WarrantyService,update,POST,urlsApi.warranty.update,...`
- `BusinessProcessService,...,GET/POST/DELETE,urlsApi.businessProcess.*,...`

`UrlRef` la reference den `urlsApi`. De lay URL that, tra cung key trong `src/configs/urls.ts`. Cach nay tranh sai sot vi FE dang dung registry tap trung, va giup BE mapping theo tung module.

## 8. Checklist API toi thieu de CRM boot duoc

De app login va vao layout:

- Auth login endpoint ghi cookie/user/token theo luong Login.
- `EmployeeService.info`.
- `EmployeeService.takeRoles`.
- Permission/menu data trong localStorage hoac API login tra ve.
- `NotificationService.countUnread`.
- Cac API dashboard/customer route mac dinh neu `defaultRedirect` la `/customer`.

De chay day du module:

- Implement tat ca endpoint trong `src/configs/urls.ts` dang duoc goi tu `api_scan_services.csv`.
- Giu response `{ code, result, message }`.
- Ho tro `GET` query string tu `convertParamsToString(params)`.
- Ho tro `POST` JSON body.
- Ho tro `DELETE ?id=<id>` va cac bien the query nhu `employeeId/campaignId`.
- Ho tro upload FormData va download file/blob o cac service file/image/import/export.
- Ho tro public-token/no-auth cho cac route public neu BE yeu cau.

## 9. Rủi ro/tồn tại phát hiện khi quét

- Co nhieu endpoint hard-code mock/external host; can thay bang env/API gateway truoc production.
- `urlsApi` rat lon, nhieu module cu/moi cung ton tai; can doi chieu `api_scan_services.csv` de biet endpoint nao that su duoc service goi.
- Mot so API duoc goi truc tiep trong page bang dynamic `fetch(link)`; BE can dam bao cac link cau hinh trong BPM/filter tra ve URL hop le va cung response shape.
- Fetch interceptor hien gan `Content-Type: application/json` mac dinh; cac upload can helper xoa header neu can multipart.
- App dung cookie + localStorage permission; BE 401 se lam FE xoa session va redirect.
