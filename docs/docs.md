# Backend API Contract Specification

> **Generated from Frontend source code (MSW + Service Layer + TypeScript Models)**
> 
> **Total endpoints:** 1492 | **Business modules:** 21 | **API modules (urls.ts):** 246
> 
> **Naming convention:** Frontend uses **camelCase** for all JSON field names. Backend MUST return camelCase. Do NOT convert to snake_case.

---

## Table of Contents

1. [Global Conventions](#global-conventions)
2. [Response Wrapper Standard](#response-wrapper-standard)
3. [Pagination, Filtering & Sorting](#pagination-filtering--sorting)
4. [MSW Mocked Endpoints (Full Contract)](#msw-mocked-endpoints-full-contract)
5. [Module API Reference](#module-api-reference)
6. [DTO Definitions](#dto-definitions)
7. [Enum & Status Values](#enum--status-values)

---

# Global Conventions

## Base URL Prefixes

| Prefix Variable | Resolved Path | Usage |
|-----------------|---------------|-------|
| `prefixAdmin` | `/adminapi` | CRM, Customer, Employee, Order, etc. |
| `prefixBpm` | `${APP_BPM_URL}/bpmapi` | BPM engine APIs |
| `prefixApi` | `/api` | Public/shared APIs |
| `prefixAuthenticator` | `/authenticator` | Auth & user management |
| `prefixNotification` | `/notification` | Push notifications |
| `prefixSale` | `/sale` | Sales module |
| `prefixSystem` | `/system` | System config |
| `prefixCs` | `/cs` | Customer service |
| `prefixApplication` | `/application` | Application config |
| `prefixHr` | `/hr` | HR integration |
| `prefixOperation` | `https://mock.local/operation` | Facility/space management |
| `prefixFinance` | `https://mock.local/finance` | Finance |
| `prefixWarehouse` | `https://mock.local/warehouse` | Warehouse |

## Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes (authenticated routes) | `Bearer <token>` |
| Content-Type | Yes (POST/PUT with body) | `application/json` |

## HTTP Method Conventions (Frontend Service Layer)

| Pattern in `urlsApi` action key | Typical HTTP Method |
|-----------------------------------|---------------------|
| `list`, `filter`, `detail`, `get`, `count`, `search`, `select`, `info`, `init` | GET |
| `update`, `create`, `insert`, `approve`, `cancel`, `assign`, `send`, `import`, `export`, `link`, `activate` | POST |
| `delete` | DELETE |

## Frontend Response Handling

Frontend checks `response.code === 0` for success. List APIs read from `response.result.items` (paginated) or `response.result` (detail/count).

Source: `src/utils/apiSelectCommon.ts`, `src/utils/selectCommon.ts`, `src/utils/document.ts`

---

# Response Wrapper Standard

## Success Response

```json
{
  "code": 0,
  "message": "Success",
  "result": {}
}
```

## List Response (Paginated)

```json
{
  "code": 0,
  "message": "Success",
  "result": {
    "items": [],
    "loadMoreAble": false,
    "total": 0,
    "totalCount": 0,
    "page": 1,
    "limit": 10
  },
  "total": 0,
  "totalCount": 0,
  "recordsTotal": 0,
  "recordsFiltered": 0
}
```

Source: `src/mocks/handlers/utils.ts` — `buildListResponse`, `filterAndPaginate`

## Detail Response

```json
{
  "code": 0,
  "message": "Success",
  "result": {}
}
```

## Count Response

```json
{
  "code": 0,
  "message": "Success",
  "result": 0
}
```

## Mutation Success Response

```json
{
  "code": 0,
  "message": "Success",
  "success": true,
  "result": {}
}
```

## Error Response

```json
{
  "code": 1001,
  "message": "Validation Error",
  "result": null
}
```

---

# Pagination, Filtering & Sorting

## Query Parameters (List APIs)

Extracted from `src/mocks/handlers/utils.ts` `filterAndPaginate`:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number, default 1 |
| limit | number | No | Page size, default 10 |
| name | string | No | Search keyword (alias: keyword, reason, keyWord) |
| keyword | string | No | Search keyword |
| status | number | No | Filter by status (-1 = all) |
| isPriority | number | No | Priority filter (2, 3, 4 levels) |
| businessRuleId | number | No | Filter business rule items |
| processId | number | No | Filter by process (-1 = all) |
| employeeId | number | No | Filter by employee |
| customerId | number | No | Filter by customer |
| stateCode | string | No | Filter state mapping |
| nodeId | string | No | BPM node ID (String, e.g. Task_1) |
| potId | string | No | Process object ID |

## Pagination Rules

- Backend MUST NOT return bare arrays for list endpoints
- Backend MUST wrap in `result.items` + metadata
- `loadMoreAble`: `true` when `page * limit < total`

---

# MSW Mocked Endpoints (Full Contract)

## MSW Handler Architecture

MSW handlers are registered in `src/mocks/handlers/index.ts`:

```
handlers = [...bpmHandlers, ...employeeHandlers, ...customerHandlers, ...commonHandlers]
```

Catch-all handler in `common.ts` intercepts: `/adminapi/`, `/api/`, `/authenticator/`, `/notification/`, `/bpmapi/`, `/sale/`, `/system/`, `/cs/`, `/application/`, `/hr/`

---

# Authentication Module (MSW)

## 1. General Information

### API Name
Lấy thông tin profile user đăng nhập

### Method & Endpoint
GET `/adminapi/user/profile` (also matched via `/authenticator/user/me` in urls.ts)

### Description
Trả về thông tin user hiện tại cho header/sidebar.

---

## 2. Request Contract

### Required Headers
| Header | Required |
|--------|----------|
| Authorization | Yes |

### Query Parameters
None

### Request Body
None

---

## 3. Response Contract

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "user": {
      "id": 1,
      "name": "Bùi Văn Chương",
      "phone": "0369062042",
      "avatar": "",
      "gender": 0,
      "role": "mock"
    }
  }
}
```

### Response Field Specification
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| code | number | No | 0 = success |
| message | string | No | Status message |
| result.user.id | number | No | User ID |
| result.user.name | string | No | Full name |
| result.user.phone | string | No | Phone number |
| result.user.avatar | string | No | Avatar URL (empty string if none) |
| result.user.gender | number | No | Gender code |
| result.user.role | string | No | Role identifier |

---

## 4. Backend Implementation Notes

### Frontend Dependency Impact
- Global layout, user menu, profile display

---

# Employee Module (MSW)

## 1. Lấy thông tin nhân viên đăng nhập

### Method & Endpoint
GET `/adminapi/employee/info`

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "id": 1,
    "name": "Bùi Văn Chương",
    "email": "buivanchuong991510@gmail.com",
    "phone": "0369062042",
    "lstOrgApp": [{}]
  }
}
```

### Response Field Specification (detail variant from common handler)
When accessed via common handler detail path `/employee/info`:
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Employee ID |
| name | string | No | Employee name |
| branchId | number | No | Branch ID |
| branchName | string | No | Branch name |
| lstOrgApp | array | No | Organization apps |
| lstOrgApp[].endDate | string | No | ISO8601 end date |
| lstOrgApp[].packageName | string | No | Package name |

---

## 2. Danh sách nhân viên

### Method & Endpoint
GET `/adminapi/employee/list`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Page size |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "items": [
      {
        "id": 1,
        "name": "Bùi Văn Chương",
        "email": "buivanchuong991510@gmail.com",
        "phone": "0369062042",
        "lstOrgApp": [{}]
      },
      {
        "id": 2,
        "name": "Đào văn dương",
        "email": "daovanduong.mock@gmail.com",
        "phone": "0369062042",
        "lstOrgApp": [{}]
      }
    ],
    "loadMoreAble": false,
    "total": 2,
    "totalCount": 2,
    "page": 1,
    "limit": 10
  },
  "total": 2,
  "totalCount": 2,
  "recordsTotal": 2,
  "recordsFiltered": 2
}
```

---

## 3. Danh sách role nhân viên

### Method & Endpoint
GET `/adminapi/employee/roles`

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": [
    {
      "id": 1,
      "departmentId": 1,
      "title": "Mock Role",
      "departmentName": "Mock Department"
    }
  ]
}
```

---

## 4. Khởi tạo employee

### Method & Endpoint
GET `/adminapi/employee/init`

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "value": 1
  }
}
```

---

# Customer / Patient Module (MSW)

## 1. Danh sách khách hàng / bệnh nhân

### Method & Endpoint
GET `/adminapi/customer/list`

Also used by Frontend service: GET `/adminapi/customer/list_paid` (CustomerService.filter)

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | number | No | Page number, default 1 |
| limit | number | No | Page size, default 10 |
| name | string | No | Search by name |
| keyword | string | No | Search keyword |
| status | number | No | Filter status |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "items": [
      {
        "id": 1,
        "name": "Nguyễn Minh Anh",
        "phone": "0901234567",
        "email": "minhanh@gmail.com",
        "gender": 0,
        "birthday": "1990-03-15",
        "customerCode": "KH-0001",
        "custType": 0,
        "address": "12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
        "note": "Bệnh nhân nhạy cảm với một số loại hóa chất",
        "relationshipId": 2,
        "relationshipName": "Khách hàng tiềm năng",
        "relationshipColor": "#FFBF00",
        "branchId": 1,
        "branchName": "Chi nhánh Hà Nội - Trụ sở chính",
        "employeeId": 1,
        "employeeName": "Bùi Văn Chương",
        "createdTime": "2026-01-10T08:00:00Z",
        "lstCustomerExtraInfo": [],
        "medicalHistory": "Viêm da cơ địa từ nhỏ, không dị ứng thuốc",
        "currentDiagnosis": "Nám sâu vùng má",
        "skinType": "Da hỗn hợp thiên dầu"
      }
    ],
    "loadMoreAble": false,
    "total": 5,
    "totalCount": 5,
    "page": 1,
    "limit": 10
  },
  "total": 5,
  "totalCount": 5,
  "recordsTotal": 5,
  "recordsFiltered": 5
}
```

### Customer List Item Field Specification
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Customer ID |
| name | string | No | Full name |
| phone | string | No | Phone number |
| email | string | No | Email |
| gender | number | No | 0=female, 1=male |
| birthday | string | No | Date YYYY-MM-DD |
| customerCode | string | No | Customer code |
| custType | number | No | 0=individual, 1=business |
| address | string | No | Address |
| note | string | Yes | Notes (can be empty string) |
| relationshipId | number | No | CRM pipeline stage ID |
| relationshipName | string | No | Pipeline stage name |
| relationshipColor | string | No | Hex color |
| branchId | number | No | Branch ID |
| branchName | string | No | Branch name |
| employeeId | number | No | Assigned employee ID |
| employeeName | string | No | Assigned employee name |
| createdTime | string | No | ISO8601 datetime |
| lstCustomerExtraInfo | array | No | Extra attributes (empty array) |
| medicalHistory | string | Yes | Medical history |
| currentDiagnosis | string | Yes | Current diagnosis |
| skinType | string | Yes | Skin type |

### Special Analysis
- Pagination: Yes (page, limit)
- Filtering: Yes (name, keyword, status)
- Search keyword: Yes
- Soft delete: DELETE endpoint exists
- Frontend expects exact field names in camelCase

---

## 2. Danh sách khách hàng theo ID

### Method & Endpoint
GET `/adminapi/customer/list_by_id`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| lstId | string | Yes | Comma-separated IDs (from ICustomerRequest) |
| page | number | No | Page |
| limit | number | No | Limit |

### Response
Same list wrapper as customer list with filtered mockCustomers.

---

## 3. Chi tiết khách hàng

### Method & Endpoint
GET `/adminapi/customer/get`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | Customer ID |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "id": 1,
    "name": "Nguyễn Minh Anh",
    "phone": "0901234567",
    "email": "minhanh@gmail.com",
    "gender": 0,
    "birthday": "1990-03-15",
    "customerCode": "KH-0001",
    "custType": 0,
    "address": "12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    "note": "Bệnh nhân nhạy cảm với một số loại hóa chất",
    "relationshipId": 2,
    "relationshipName": "Khách hàng tiềm năng",
    "relationshipColor": "#FFBF00",
    "branchId": 1,
    "branchName": "Chi nhánh Hà Nội - Trụ sở chính",
    "employeeId": 1,
    "employeeName": "Bùi Văn Chương",
    "createdTime": "2026-01-10T08:00:00Z",
    "lstCustomerExtraInfo": [],
    "medicalHistory": "Viêm da cơ địa từ nhỏ, không dị ứng thuốc",
    "currentDiagnosis": "Nám sâu vùng má",
    "skinType": "Da hỗn hợp thiên dầu"
  }
}
```

---

## 4. Tạo / Cập nhật khách hàng

### Method & Endpoint
POST `/adminapi/customer/update`

### Request Body
Frontend sends `ICustomerRequest` merged with existing fields on update:

```json
{
  "id": 0,
  "name": "Nguyễn Minh Anh",
  "phone": "0901234567",
  "email": "minhanh@gmail.com",
  "gender": "0",
  "birthday": "1990-03-15",
  "branchId": 1,
  "careerId": 1,
  "employeeId": 1,
  "avatar": "",
  "firstCall": "",
  "height": "",
  "weight": "",
  "custType": 0,
  "trademark": "",
  "taxCode": "",
  "maritalStatus": 0,
  "isExternal": 0,
  "relationIds": [],
  "customerExtraInfos": []
}
```

### Request Field Specification (ICustomerRequest)
| Field | Type | Required | Nullable | Description |
|-------|------|----------|----------|-------------|
| id | number | No | Yes | 0 or omit for create |
| name | string | Yes | No | Full name |
| sourceId | number | No | Yes | Source ID |
| code | string | No | Yes | Customer code |
| gender | string | No | Yes | Gender |
| address | string | No | Yes | Address |
| phone | string | No | Yes | Phone |
| birthday | string | No | Yes | Birthday |
| branchId | number | No | Yes | Branch |
| careerId | number | Yes | No | Career ID |
| employeeId | number | No | Yes | Employee |
| avatar | string | Yes | No | Avatar URL |
| email | string | No | Yes | Email |
| firstCall | string | Yes | No | First call date |
| height | string | Yes | No | Height |
| weight | string | Yes | No | Weight |
| custType | number/string | Yes | No | Customer type |
| trademark | string | Yes | No | Trademark |
| taxCode | string | Yes | No | Tax code |
| maritalStatus | number | Yes | No | Marital status |
| isExternal | number/string | Yes | No | External flag |
| relationIds | any | Yes | No | Relation IDs |
| customerExtraInfos | any | Yes | No | Extra info array |

### Response Example (create)
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 101
  }
}
```

### Response Example (update)
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 1
  }
}
```

---

## 5. Xóa khách hàng

### Method & Endpoint
DELETE `/adminapi/customer/delete`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | Customer ID |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 1,
    "deleted": true
  }
}
```

---

## 6. Lịch hẹn / Scheduler

### Method & Endpoint
GET `/adminapi/customerScheduler/list`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| customerId | number | No | Filter by customer |
| page | number | No | Page |
| limit | number | No | Limit |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "items": [
      {
        "id": 1,
        "customerId": 1,
        "customerName": "Nguyễn Minh Anh",
        "serviceId": 1,
        "serviceName": "Liệu trình chăm sóc chuyên sâu 5 buổi",
        "employeeId": 1,
        "employeeName": "Bùi Văn Chương",
        "appointmentDate": "2026-06-05T09:00:00Z",
        "status": 1,
        "statusName": "Đã xác nhận",
        "note": "Tái khám lần 2"
      }
    ],
    "loadMoreAble": false,
    "total": 5,
    "totalCount": 5,
    "page": 1,
    "limit": 10
  }
}
```

### Appointment Item Fields
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Appointment ID |
| customerId | number | No | Customer ID |
| customerName | string | No | Customer name |
| serviceId | number | No | Service ID |
| serviceName | string | No | Service name |
| employeeId | number | No | Employee ID |
| employeeName | string | No | Employee name |
| appointmentDate | string | No | ISO8601 datetime |
| status | number | No | 0=pending, 1=confirmed, 2=completed |
| statusName | string | No | Status label |
| note | string | Yes | Note (can be empty string) |

---

## 7. Cập nhật lịch hẹn

### Method & Endpoint
POST `/adminapi/customerScheduler/update`

### Request Body
From `ICustomerSchedulerRequest`:
```json
{
  "name": "Lịch tái khám",
  "customerId": 1,
  "consultantId": 1,
  "fmtScheduleDate": "2026-06-05",
  "content": "",
  "note": "",
  "status": "1"
}
```

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 150
  }
}
```

---

## 8. Chăm sóc sau khám (Care After Visit)

### Method & Endpoint
GET `/adminapi/careAfterVisit/list`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| customerId | number | No | Filter by customer |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "items": [
      {
        "id": 1,
        "customerId": 1,
        "customerName": "Nguyễn Minh Anh",
        "processId": 1,
        "processName": "Quy trình tiếp nhận - khám ngoại trú",
        "date": "2026-05-25T10:00:00Z",
        "note": "Hướng dẫn chăm sóc da tại nhà, dùng kem dưỡng ẩm 2 lần/ngày",
        "employeeName": "Bùi Văn Chương",
        "status": 1
      }
    ],
    "loadMoreAble": false,
    "total": 3,
    "totalCount": 3,
    "page": 1,
    "limit": 10
  }
}
```

---

## 9. Hồ sơ y tế khách hàng

### Method & Endpoint
GET `/adminapi/customer/medical_record`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| customerId | number | No | Customer ID |
| id | number | No | Alternative ID param |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "customerId": 1,
    "customerName": "Nguyễn Minh Anh",
    "medicalHistory": "Viêm da cơ địa từ nhỏ, không dị ứng thuốc",
    "currentDiagnosis": "Nám sâu vùng má",
    "skinType": "Da hỗn hợp thiên dầu",
    "treatmentHistory": [
      {
        "date": "2026-04-10",
        "treatment": "Laser Fractional CO2",
        "result": "Cải thiện 60%",
        "doctor": "Bùi Văn Chương"
      },
      {
        "date": "2026-05-01",
        "treatment": "Peel da tế bào chết",
        "result": "Tốt",
        "doctor": "Đào văn dương"
      }
    ]
  }
}
```

---

# BPM Module (MSW)

## 1. Chi tiết quy trình nghiệp vụ

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/businessprocess/detail` or `/businessprocess/get`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | Process ID |
| processId | number | No | Alternative param |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "id": 1,
    "code": "QT-KCB-001",
    "name": "Quy trình tiếp nhận - khám ngoại trú",
    "employeeId": 1,
    "employeeName": "Bùi Văn Chương",
    "status": 1,
    "opType": "EX",
    "createdTime": "2026-05-20T08:30:00Z",
    "config": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "nodes": [
      {
        "id": 1001,
        "processId": 1,
        "typeNode": "input",
        "name": "Bắt đầu",
        "code": "start",
        "position": { "x": 80, "y": 220 },
        "point": null,
        "configData": null
      }
    ],
    "configs": [
      {
        "id": 6001,
        "fromNodeId": 1001,
        "toNodeId": 1002,
        "condition": 0
      }
    ]
  }
}
```

### Process Field Specification
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Process ID |
| code | string | No | Process code |
| name | string | No | Process name |
| employeeId | number | No | Owner employee ID |
| employeeName | string | No | Owner name |
| status | number | No | 0=inactive, 1=active |
| opType | string | No | Operation type (EX) |
| createdTime | string | No | ISO8601 |
| config | string | No | BPMN XML string |
| nodes | array | No | Designer nodes |
| nodes[].id | number | No | Node numeric ID |
| nodes[].processId | number | No | Process ID |
| nodes[].typeNode | string | No | input/default/output |
| nodes[].name | string | No | Display name |
| nodes[].code | string | No | start/do/condition/done |
| nodes[].position | object | No | {x, y} coordinates |
| nodes[].point | null | Yes | Always null in mock |
| nodes[].configData | object/null | Yes | Node configuration |
| configs | array | No | Edge connections |
| configs[].id | number | No | Config ID |
| configs[].fromNodeId | number | No | Source node ID |
| configs[].toNodeId | number | No | Target node ID |
| configs[].condition | number | No | 0=default, 1=conditional |

### Data Type Risks
⚠️ `processId` is Integer
⚠️ BPMN `nodeId` in task APIs is String (Task_1, Gateway_1)
⚠️ `config` is raw BPMN XML string — do NOT parse to JSON

---

## 2. Danh sách quy trình

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/businessprocess/list`

### Response items (mockProcesses)
```json
{
  "id": 1,
  "code": "QT-KCB-001",
  "name": "Quy trình tiếp nhận - khám ngoại trú",
  "employeeId": 1,
  "employeeName": "Bùi Văn Chương",
  "status": 1,
  "opType": "EX",
  "createdTime": "2026-05-20T08:30:00Z"
}
```

All 9 mock processes: IDs 1-9, codes QT-KCB-001 through QT-KCB-008 and QT-CSK-001.

---

## 3. Cập nhật BPMN config

### Method & Endpoint
POST `{APP_BPM_URL}/bpmapi/businessprocess/update/config`

### Request Body
```json
{
  "id": 1,
  "config": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
}
```

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 1,
    "config": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
  }
}
```

---

## 4. Danh sách hồ sơ xử lý (Processed Object)

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/processedobject/list`

### Response Item Fields (mockProcessedObjects)
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Record ID |
| name | string | No | Record title |
| code | string | No | Record code |
| potId | string | No | Process object ID |
| customerName | string | No | Customer name |
| patientName | string | No | Patient name |
| mainDiagnosis | string | No | Main diagnosis |
| priority | string | No | urgent/high/normal |
| employeeId | number | No | Handler employee ID |
| employeeName | string | No | Handler name |
| status | number | No | 0-4 status codes |
| processId | number | No | Process ID |
| processName | string | No | Process name |
| createdTime | string | No | ISO8601 |
| startTime | string | No | ISO8601 |
| endTime | string | Yes | Empty string if ongoing |
| sheetId | number | No | Sheet ID |

---

## 5. Danh sách Work Order

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/workorder/list`

### Response Item Fields (mockWorkOrders - 36 items)
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | number | No | Work order ID |
| name | string | No | Task title |
| content | string | No | Task content |
| startTime | string | No | ISO8601 |
| endTime | string | Yes | Empty if not done |
| workLoad | number | No | Workload value |
| workLoadUnit | string | No | Unit (giờ) |
| wteId | number | No | Work type element ID |
| docLink | string | No | Document link |
| projectId | number | No | Project/process ID |
| projectName | string | No | Project name |
| opportunityId | number | No | Opportunity ID |
| managerId | number | No | Manager ID |
| managerName | string | No | Manager name |
| employeeId | number | No | Assignee ID |
| employeeName | string | No | Assignee name |
| participants | string | No | Participants |
| customers | string | No | Customer names |
| status | number | No | 0,1,2,4 |
| percent | number | No | Completion 0-100 |
| priorityLevel | number | No | 0-4 |
| nodeName | string | No | BPM node name |
| iteration | number | No | Iteration count |
| processId | number | No | Process ID |
| potId | string | No | Process object ID |

---

## 6. Chi tiết BPM Node

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/bpmconfignode/get`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| nodeId | string | Yes | BPMN node ID e.g. Task_1 |
| id | string | No | Alternative |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "id": "Task_1",
    "nodeId": "Task_1",
    "processId": 1,
    "childProcessId": 1,
    "formId": 1,
    "bpmFormId": 1,
    "name": "Khám lâm sàng",
    "title": "Khám lâm sàng",
    "typeNode": "bpmn:UserTask",
    "assigneeType": "EMPLOYEE",
    "employeeId": 1,
    "employeeName": "Bùi Văn Chương",
    "departmentId": 1,
    "departmentName": "Khoa Da liễu",
    "businessRuleId": 1,
    "businessRuleName": "Luật phân loại mức ưu tiên ca",
    "serviceCode": "AI_SKIN_ANALYSIS",
    "config": "{}"
  }
}
```

---

## 7. BPM Form Data by Node

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/bpmformdata/getbynodeid`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| nodeId | string | Yes | e.g. Task_1 |
| potId | string | No | e.g. HS-0001 |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "nodeId": "Task_1",
    "potId": "HS-0001",
    "data": {
      "patientName": "Bùi Văn Chương",
      "diagnosis": "Viêm da cơ địa",
      "priority": "high",
      "aiScore": 82
    }
  }
}
```

---

## 8. State Mapping

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/statemapping/list`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| stateCode | string | No | Filter by code |
| keyword | string | No | Search name/code |
| page | number | No | Page |
| limit | number | No | Limit |

### Response Items
```json
{
  "id": 1,
  "stateCode": "NEW",
  "stateName": "Mới tiếp nhận",
  "color": "#64748B"
}
```

### POST Update
POST `{APP_BPM_URL}/bpmapi/statemapping/update`

Request Body:
```json
{
  "id": 0,
  "stateCode": "NEW",
  "stateName": "Mới tiếp nhận",
  "color": "#64748B"
}
```

---

## 9. Workflow Steps

### POST Update
POST `{APP_BPM_URL}/bpmapi/workflow/update`

Request Body:
```json
{
  "id": 0,
  "processId": 1,
  "stepName": "Tiếp nhận",
  "stepNumber": 1,
  "stateCode": "NEW",
  "stateName": "Mới tiếp nhận"
}
```

---

## 10. Process Permission

### POST Update
POST `{APP_BPM_URL}/bpmapi/process-permission/update`

Request Body:
```json
{
  "id": 0,
  "name": "Mặc định tiếp nhận ngoại trú",
  "uri": "/treatmentHistory/",
  "processCode": "QT-KCB-001",
  "processName": "Quy trình tiếp nhận - khám ngoại trú"
}
```

---

## 11. BPM Trigger Activate

### Method & Endpoint
GET/POST `{APP_BPM_URL}/bpmapi/bpmtrigger/activate`

### Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | Trigger ID |

### Response Example
```json
{
  "code": 0,
  "message": "mock",
  "success": true,
  "result": {
    "id": 1,
    "activated": true,
    "status": 2
  }
}
```

---

## 12. Error Logs (findbycriteria)

### Method & Endpoint
GET `{APP_BPM_URL}/bpmapi/processedobjectlog/findbycriteria`

### Response Item (mockProcessErrorLogs)
| Field | Type | Description |
|-------|------|-------------|
| id | number | Log ID |
| processId | number | Process ID |
| processName | string | Process name |
| nodeId | number | Node ID (numeric in logs) |
| nodeName | string | Node name |
| potId | string | Process object ID |
| patientName | string | Patient name |
| errorCode | string | AI_TIMEOUT or RULE_VALIDATION_FAILED |
| message | string | Error message |
| createdTime | string | ISO8601 |
| stackTrace | string | Stack trace string |

---

## 13. Business Rules Mock Data

### mockBusinessRules item
```json
{
  "id": 1,
  "name": "Luật phân loại mức ưu tiên ca",
  "code": "RULE-PRIORITY",
  "linkedCount": 2
}
```

### mockBusinessRuleItems (businessRuleId=1)
```json
{
  "id": 1,
  "businessRuleId": 1,
  "inputs": "{\"age\":65,\"severity\":\"cao\"}",
  "outputs": "{\"priorityLevel\":4}"
}
```

⚠️ `inputs` and `outputs` are JSON **strings**, not objects.

---

## 14. Variable Declares

### mockVariableDeclares item
```json
{
  "id": 1,
  "processId": 1,
  "name": "Tên bệnh nhân",
  "code": "patientName",
  "dataType": "String",
  "defaultValue": "Bùi Văn Chương"
}
```

---

## 15. Artifacts / Form Categories

### mockArtifacts item
```json
{
  "id": 1,
  "name": "Bảng thông tin bệnh nhân",
  "code": "ART-PATIENT-INFO",
  "status": 1,
  "type": "grid"
}
```

Artifact types: `grid`, `upload`, `comment`, `signature`

---

# Common Catch-All Handler (MSW)

For unmatched internal API paths, `common.ts` returns generic mock data based on URL path segment:

| Path contains | Mock list item shape |
|---------------|---------------------|
| beautybranch | `{id, name, headquarter, code}` |
| relationship | `{id, name, color, colorText, position}` |
| customer | `{id, name, phone, email, gender, customerCode, custType, lstCustomerExtraInfo, relationshipName, relationshipColor}` |
| opportunity | `{id, productName/serviceName, customerName, contactName, name, status}` |
| workproject | `{id, name, status, createdTime}` |
| cashbook | `{id, code, name, amount, type, createdTime}` |
| order | `{id, code, customerName, totalAmount, status, createdTime}` |
| cxmsurvey | `{id, title, status, createdTime}` |
| product | `{id, name, price, code, status}` |
| service | `{id, name, price, code, status}` |
| employee | `{id, name, code, email, phone}` |
| campaign | `{id, name, status, createdTime}` |
| /adminapi/common/list | Artifact list items |

### Beauty Salon Domain
GET `/api/beautysalon/get_bydomain`

Response:
```json
{
  "code": 0,
  "message": "mock",
  "result": {
    "isBeauty": true,
    "logo": "",
    "logoTransparent": ""
  }
}
```

### Permission Resource
GET `/adminapi/permission/resource`

Response:
```json
{
  "code": 0,
  "message": "mock",
  "result": []
}
```

---

# CRM Pipeline (relationship) Mock

```json
[
  { "id": 1, "name": "Khách hàng mới", "color": "#007FFF", "colorText": "#FFFFFF", "position": 1 },
  { "id": 2, "name": "Khách hàng tiềm năng", "color": "#FFBF00", "colorText": "#000000", "position": 2 },
  { "id": 3, "name": "Đang tư vấn", "color": "#9966CC", "colorText": "#FFFFFF", "position": 3 },
  { "id": 4, "name": "Đã ký hợp đồng", "color": "#ACE1AF", "colorText": "#000000", "position": 4 }
]
```

---

# Branch Mock (beautybranch)

```json
[
  { "id": 1, "name": "Chi nhánh Hà Nội - Trụ sở chính", "headquarter": 1, "code": "HN01" },
  { "id": 2, "name": "Chi nhánh TP. Hồ Chí Minh", "headquarter": 0, "code": "HCM01" }
]
```


---

# Module API Reference


# Authentication Module


## user (`user`)

**Service file:** `src/services/UserService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| create | POST | `/authenticator/user/create` | - |  |
| update | POST | `/authenticator/user/admin_update` | - |  |
| profile | GET | `/authenticator/user/me` | - |  |
| detail | GET | `/authenticator/user/get` | - |  |
| basicInfo | GET | `/authenticator/user/basic_info` | - |  |
| selectUsers | GET | `/authenticator/user/select` | - |  |
| resetPass | POST | `/authenticator/user/reset_pass` | - |  |
| changePass | GET | `/authenticator/user/change_pass` | - |  |
| checkLogin | POST | `/adminapi/userLogin/list` | - |  |
| detailTimeLogin | POST | `/adminapi/userLogin/daily/list` | - |  |
| list | GET | `/authenticator/user/list` | - |  |
| delete | DELETE | `/authenticator/user/delete` | - |  |
| fcmDevice | GET | `/notification/fcmDevice/update` | - |  |

### Related DTOs

#### ICustomerLinkUserRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| userId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ILinkEmployeeUserRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| userId | number | No |

Source: `src/model/employee/EmployeeRequestModel.ts`

#### IAddTipUserModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITipUserResponse | Yes |
| tipType | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### AddTipUserToTipUserEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| groupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### ShowTipUserToTipUserEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| showGroupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`


# Notification Module


## notificationHistory (`notificationHistory`)

**Service file:** `src/services/NotificationHistoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/notification/notificationHistory/list` | src/services/NotificationService.ts |  |
| update | POST | `/notification/notificationHistory/update` | src/services/NotificationService.ts |  |
| detail | GET | `/notification/notificationHistory/get` | src/services/NotificationService.ts |  |
| delete | DELETE | `/notification/notificationHistory/delete` | src/services/NotificationService.ts |  |
| updateUnread | POST | `/notification/notificationHistory/update/unread` | src/services/NotificationService.ts |  |
| updateReadAll | POST | `/notification/notificationHistory/update/readAll` | src/services/NotificationService.ts |  |
| countUnread | GET | `/notification/notificationHistory/count` | src/services/NotificationService.ts |  |

# Customer Module


## contact (`contact`)

**Service file:** `src/services/ContactService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contact/list` | src/services/ContactService.ts |  |
| update | POST | `/adminapi/contact/update` | src/services/ContactService.ts |  |
| detail | GET | `/adminapi/contact/get` | src/services/ContactService.ts |  |
| delete | DELETE | `/adminapi/contact/delete` | src/services/ContactService.ts |  |
| fieldTable | GET | `/adminapi/contactAttribute/listFilter` | src/services/ContactService.ts |  |
| contactExchange | GET | `/adminapi/contactExchange/list` | src/services/ContactService.ts |  |
| deleteContactExchange | DELETE | `/adminapi/contactExchange/delete` | src/services/ContactService.ts |  |
| addContactExchange | POST | `/adminapi/contactExchange/update` | src/services/ContactService.ts |  |
| updateContactExchange | POST | `/adminapi/contactExchange/get` | src/services/ContactService.ts |  |
| exAttributes | GET | `/adminapi/contact/export/attributes` | src/services/ContactService.ts |  |
| numberFieldContact | POST | `/adminapi/contact/export/randomContacts` | src/services/ContactService.ts |  |
| autoProcess | POST | `/adminapi/contact/import/autoProcess` | src/services/ContactService.ts |  |
| downloadFile | GET | `/adminapi/contact/import` | src/services/ContactService.ts |  |

### Related DTOs

#### IContactFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| pipelineId | number | Yes |
| statusId | number | Yes |
| customerId | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |
| fmtStartEndDate | any | Yes |
| fmtEndEndDate | any | Yes |

Source: `src/model/contact/ContactRequestModel.ts`

#### IContactFieldFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contact/ContactRequestModel.ts`

#### IContactRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| phone | string | No |
| note | string | No |
| avatar | string | No |
| employeeId | number | string | No |
| positionId | number | string | No |
| contactExtraInfos | any | No |
| bsnId | number | No |
| customers | any | No |
| emails | any | No |
| pipelineId | number | string | No |
| statusId | number | string | No |
| cardvisitFront | string | No |
| cardvisitBack | string | No |
| department | string | No |
| coordinators | any | No |
| primaryCustomerId | any | No |

Source: `src/model/contact/ContactRequestModel.ts`

#### IContactResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| phone | string | No |
| note | string | No |
| avatar | string | No |
| employeeId | number | string | No |
| positionId | number | string | No |
| positionName | string | No |
| employeeName | string | No |
| customers | string | No |
| emails | string | No |
| bsnId | number | No |
| contactExtraInfos | any | No |
| statusName | string | No |
| cardvisitFront | string | No |
| cardvisitBack | string | No |
| department | string | No |
| coordinators | any | No |
| primaryCustomerId | any | No |

Source: `src/model/contact/ContactResponseModel.ts`

#### AddContactModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IContactResponse | Yes |
| idCustomer | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contact/PropsModel.ts`


## contactAttribute (`contactAttribute`)

**Service file:** `src/services/ContactAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contactAttribute/list` | src/services/ContactAttributeService.ts |  |
| update | POST | `/adminapi/contactAttribute/update` | src/services/ContactAttributeService.ts |  |
| delete | DELETE | `/adminapi/contactAttribute/delete` | src/services/ContactAttributeService.ts |  |
| listAll | GET | `/adminapi/contactAttribute/listAll` | src/services/ContactAttributeService.ts |  |
| checkDuplicated | POST | `/adminapi/contactAttribute/checkDuplicated` | src/services/ContactAttributeService.ts |  |

### Related DTOs

#### AddContactAttributeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| dataContactAttribute | IContactAttributeResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contactAttribute/PropsModel.ts`

#### IContactAttributeListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/contactAttribute/PropsModel.ts`


## contactExtraInfo (`contactExtraInfo`)

**Service file:** `src/services/ContactExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contactExtraInfo/list` | src/services/ContactExtraInfoService.ts |  |

## contactPipeline (`contactPipeline`)

**Service file:** `src/services/ContactPipelineService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contactPipeline/list` | src/services/ContactPipelineService.ts |  |
| update | POST | `/adminapi/contactPipeline/update` | src/services/ContactPipelineService.ts |  |
| detail | GET | `/adminapi/contactPipeline/get` | src/services/ContactPipelineService.ts |  |
| delete | DELETE | `/adminapi/contactPipeline/delete` | src/services/ContactPipelineService.ts |  |

### Related DTOs

#### IContactPipelineFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contactPipeline/ContactPipelineRequestModel.ts`

#### IContactPipelineRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |

Source: `src/model/contactPipeline/ContactPipelineRequestModel.ts`

#### IContactPipelineResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |
| bsnId | number | Yes |

Source: `src/model/contactPipeline/ContactPipelineResponseModel.ts`

#### AddContactPipelineModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IContactPipelineResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contactPipeline/PropsModel.ts`

#### IContactPipelineListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/contactPipeline/PropsModel.ts`


## contactStatus (`contactStatus`)

**Service file:** `src/services/ContactStatusService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contactStatus/list` | src/services/ContactStatusService.ts |  |
| update | POST | `/adminapi/contactStatus/update` | src/services/ContactStatusService.ts |  |
| detail | GET | `/adminapi/contactStatus/get` | src/services/ContactStatusService.ts |  |
| delete | DELETE | `/adminapi/contactStatus/delete` | src/services/ContactStatusService.ts |  |

### Related DTOs

#### IContactStatusFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| pipelineId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contactStatus/ContactStatusRequestModel.ts`

#### IContactStatusRequest

| Field | Type | Optional |
|-------|------|----------|
| pipelineId | number | No |
| name | string | No |
| position | number | No |

Source: `src/model/contactStatus/ContactStatusRequestModel.ts`

#### IContactStatusResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| pipelineId | number | No |
| name | string | No |
| position | number | No |

Source: `src/model/contactStatus/ContactStatusResponseModel.ts`

#### IContactStatusModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| infoPipeline | any | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contactStatus/PropsModel.ts`

#### IAddContactStatusProps

| Field | Type | Optional |
|-------|------|----------|
| data | IContactStatusResponse | No |
| infoPipeline | any | No |
| onReload | (reload: boolean) => void | No |

Source: `src/model/contactStatus/PropsModel.ts`


## crmCareHistory (`crmCareHistory`)

**Service file:** `src/services/CrmCareHistoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/crmCareHistory/list` | src/services/CrmCareHistoryService.ts |  |
| update | POST | `/adminapi/crmCareHistory/update` | src/services/CrmCareHistoryService.ts |  |
| delete | DELETE | `/adminapi/crmCareHistory/delete` | src/services/CrmCareHistoryService.ts |  |

### Related DTOs

#### ICrmCareHistoryRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| customerId | number | No |
| employeeId | number | No |
| campaignId | number | No |
| status | number | Yes |
| content | string | Yes |
| objectType | string | Yes |
| objectId | number | Yes |

Source: `src/model/crmCareHistory/CrmCareHistoryRequestModel.ts`

#### ICrmCareHistoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| employeeId | number | No |
| objectType | string | Yes |

Source: `src/model/crmCareHistory/CrmCareHistoryRequestModel.ts`

#### ICrmCareHistoryResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| campaignId | number | No |
| campaignName | string | No |
| content | string | No |
| createdTime | string | No |
| customerId | number | No |
| employeeId | number | No |
| employeeName | string | No |
| objectId | number | No |
| objectType | string | No |
| status | number | No |

Source: `src/model/crmCareHistory/CrmCareHistoryResponseModel.ts`


## customer (`customer`)

**Service file:** `src/services/CustomerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filter | GET | `/adminapi/customer/list_paid` | src/services/CustomerService.ts |  |
| listshared | GET | `/adminapi/customer/list_paid/shared` | src/services/CustomerService.ts |  |
| update | POST | `/adminapi/customer/update` | src/services/CustomerService.ts |  |
| telesaleCallList | GET | `/adminapi/telesaleCall/list` | src/services/CustomerService.ts |  |
| telesaleCallUpdate | POST | `/adminapi/telesaleCall/update` | src/services/CustomerService.ts |  |
| updateByField | POST | `/adminapi/customer/update/byField` | src/services/CustomerService.ts |  |
| delete | DELETE | `/adminapi/customer/delete` | src/services/CustomerService.ts |  |
| deleteAll | DELETE | `/adminapi/customer/delete` | src/services/CustomerService.ts |  |
| checkInProcess | POST | `/adminapi/customer/checkInProcess` | src/services/CustomerService.ts |  |
| link | POST | `/adminapi/customer/link_user` | src/services/CustomerService.ts |  |
| detail | GET | `/adminapi/customer/get` | src/services/CustomerService.ts |  |
| area | GET | `/api/area/child` | src/services/CustomerService.ts |  |
| listById | GET | `/adminapi/customer/list_by_id` | src/services/CustomerService.ts |  |
| updateCustomerGroup | POST | `/adminapi/customer/update_batch/customer_group` | src/services/CustomerService.ts |  |
| updateOneRelationship | POST | `/adminapi/customer/update/relationship` | src/services/CustomerService.ts |  |
| updateCustomeRelationship | POST | `/adminapi/customer/update_batch/relationship` | src/services/CustomerService.ts |  |
| updateCustomerSource | POST | `/adminapi/customer/update_batch/customer_source` | src/services/CustomerService.ts |  |
| updateCustomerEmployee | POST | `/adminapi/customer/update_batch/employee` | src/services/CustomerService.ts |  |
| updateScheduler | POST | `/adminapi/customerScheduler/update` | src/services/CustomerService.ts |  |
| filterScheduler | GET | `/adminapi/customerScheduler/list` | src/services/CustomerService.ts |  |
| cancelScheduler | POST | `/adminapi/customerScheduler/cancel` | src/services/CustomerService.ts |  |
| detailScheduler | GET | `/adminapi/customerScheduler/get` | src/services/CustomerService.ts |  |
| customerExchangeList | GET | `/adminapi/customerExchange/list` | src/services/CustomerService.ts |  |
| customerExchangeUpdate | POST | `/adminapi/customerExchange/update` | src/services/CustomerService.ts |  |
| customerExchangeDelete | DELETE | `/adminapi/customerExchange/delete` | src/services/CustomerService.ts |  |
| customerSendSMS | POST | `/adminapi/customer/send/sms` | src/services/CustomerService.ts |  |
| customerSendEmail | POST | `/adminapi/customer/send/email` | src/services/CustomerService.ts |  |
| customerSendZalo | POST | `/adminapi/customer/send/zalo` | src/services/CustomerService.ts |  |
| parserSms | GET | `/adminapi/customer/send/sms/parser` | src/services/CustomerService.ts |  |
| parserEmail | GET | `/adminapi/customer/send/email/parser` | src/services/CustomerService.ts |  |
| parserZalo | GET | `/adminapi/customer/send/zalo/parser` | src/services/CustomerService.ts |  |
| viewPhone | GET | `/adminapi/customer/get/phone` | src/services/CustomerService.ts |  |
| viewFullPhone | GET | `/adminapi/customer/get/phones` | src/services/CustomerService.ts |  |
| viewEmail | GET | `/adminapi/customer/get/email` | src/services/CustomerService.ts |  |
| addOther | POST | `/adminapi/customerViewer/update` | src/services/CustomerService.ts |  |
| addCustomerViewer | GET | `/adminapi/customerViewer/update` | src/services/CustomerService.ts |  |
| lstCustomerViewer | GET | `/adminapi/customerViewer/list` | src/services/CustomerService.ts |  |
| deleteCustomerViewer | DELETE | `/adminapi/customerViewer/delete` | src/services/CustomerService.ts |  |
| addCustomerMA | POST | `/adminapi/maCustomer/insertList` | src/services/CustomerService.ts |  |
| numberFieldCustomer | POST | `/adminapi/customer/export/randomCustomers` | src/services/CustomerService.ts |  |
| autoProcess | POST | `/adminapi/customer/import/autoProcess` | src/services/CustomerService.ts |  |
| manualProcess | GET | `/adminapi/customer/import/manualProcess` | src/services/CustomerService.ts |  |
| downloadFile | GET | `/adminapi/customer/import` | src/services/CustomerService.ts |  |
| customerReport | GET | `/adminapi/customerReport/summaryAction` | src/services/CustomerService.ts |  |
| detailCustomerReport | GET | `/adminapi/customerReport/summaryAction/detail` | src/services/CustomerService.ts |  |
| lstAttachments | GET | `/adminapi/customerExchange/attachment/list` | src/services/CustomerService.ts |  |
| descCustomerReport | GET | `/adminapi/customerReport/action/list` | src/services/CustomerService.ts |  |
| customerZaloOA | GET | `/adminapi/customer/zalo/oa` | src/services/CustomerService.ts |  |
| filterAdvanced | GET | `/adminapi/filter-setting/list` | src/services/CustomerService.ts |  |
| createFilterAdvanced | POST | `/adminapi/filter-setting/update` | src/services/CustomerService.ts |  |
| deleteFilterAdvanced | DELETE | `/adminapi/filter-setting/delete` | src/services/CustomerService.ts |  |
| customerAttributes | GET | `/adminapi/filter-setting/customers/attributes` | src/services/CustomerService.ts |  |
| filterLstCustomer | GET | `/adminapi/filter-setting` | src/services/CustomerService.ts |  |
| filterTable | GET | `/adminapi/customerAttribute/listFilter` | src/services/CustomerService.ts |  |
| exAttributes | GET | `/adminapi/customer/export/attributes` | src/services/CustomerService.ts |  |
| createOpportunity | POST | `/adminapi/opportunity/update` | src/services/CustomerService.ts |  |
| lstOpportunity | GET | `/adminapi/opportunity/list` | src/services/CustomerService.ts |  |
| deleteOpportunity | DELETE | `/adminapi/opportunity/delete` | src/services/CustomerService.ts |  |
| detailOpportunity | GET | `/adminapi/opportunity/get` | src/services/CustomerService.ts |  |
| lstUpload | GET | `/adminapi/customerUpload/list` | src/services/CustomerService.ts |  |
| classifyAge | GET | `/adminapi/api/v1/customer/classify/age` | src/services/CustomerService.ts |  |
| classifyGender | GET | `/adminapi/api/v1/customer/classify/gender` | src/services/CustomerService.ts |  |
| classifyIdentify | GET | `/adminapi/api/v1/customer/classify/identify` | src/services/CustomerService.ts |  |
| classifyTopRevenue | GET | `/adminapi/api/v1/customer/classify/topRevenue` | src/services/CustomerService.ts |  |
| classifyTopBought | GET | `/adminapi/api/v1/customer/classify/topBought` | src/services/CustomerService.ts |  |
| classifyTopValueInvoice | GET | `/adminapi/api/v1/customer/classify/topValueInvoice` | src/services/CustomerService.ts |  |
| classifyNotInteractDay | GET | `/adminapi/api/v1/customer/classify/notInteractDay` | src/services/CustomerService.ts |  |
| classifyTopInteract | GET | `/adminapi/api/v1/customer/classify/topInteract` | src/services/CustomerService.ts |  |
| classifyCampaignJoined | GET | `/adminapi/api/v1/customer/classify/campaignJoined` | src/services/CustomerService.ts |  |
| classifyCustType | GET | `/adminapi/api/v1/customer/classify/custType` | src/services/CustomerService.ts |  |
| classifyCustGroup | GET | `/adminapi/api/v1/customer/classify/custGroup` | src/services/CustomerService.ts |  |
| classifyCustSource | GET | `/adminapi/api/v1/customer/classify/custSource` | src/services/CustomerService.ts |  |
| classifyCustCareer | GET | `/adminapi/api/v1/customer/classify/custCareer` | src/services/CustomerService.ts |  |
| classifyCustArea | GET | `/adminapi/api/v1/customer/classify/custArea` | src/services/CustomerService.ts |  |
| classifyCustomerCard | GET | `/adminapi/api/v1/customer/classify/customerCard` | src/services/CustomerService.ts |  |
| classifyInteractTimes | GET | `/adminapi/api/v1/customer/classify/interactTimes` | src/services/CustomerService.ts |  |
| serviceSuggestions | GET | `/adminapi/customerObject/list` | src/services/CustomerService.ts |  |
| serviceSuggestionsv2 | GET | `/adminapi/customerObject/getTop` | src/services/CustomerService.ts |  |
| fieldChart | GET | `/adminapi/customer/dashboard/fields` | src/services/CustomerService.ts |  |
| lstChartDynamicChart | GET | `/adminapi/customer/dashboard/list` | src/services/CustomerService.ts |  |
| updateChartDynamicChart | POST | `/adminapi/customer/dashboard/update` | src/services/CustomerService.ts |  |
| deleteChartDynamicChart | DELETE | `/adminapi/customer/dashboard/delete` | src/services/CustomerService.ts |  |
| detailChartDynamicChart | GET | `/adminapi/customer/dashboard/get` | src/services/CustomerService.ts |  |
| viewChartDynamicChart | GET | `/adminapi/customer/dashboard/fetchData` | src/services/CustomerService.ts |  |
| exportMulti | POST | `/adminapi/customer/export/multi` | src/services/CustomerService.ts |  |
| loginAccountAthena | POST | `https:` | src/services/CustomerService.ts | athena.mock.local/api/v1/account/login", |
| createCall | POST | `https:` | src/services/CustomerService.ts | athena.mock.local/api/v1/call-history/create-call", |
| getAccountCall | GET | `/adminapi/employeeAgent/employeeId` | src/services/CustomerService.ts |  |
| reloadData | POST | `/adminapi/customer/moveToEs` | src/services/CustomerService.ts |  |
| resetDataCustomer | POST | `/adminapi/customer/reset_to_new` | src/services/CustomerService.ts |  |
| customerAssign | POST | `/adminapi/customer/assign` | src/services/CustomerService.ts |  |

### Related DTOs

#### IInfoCustomerPurchaseProps

| Field | Type | Optional |
|-------|------|----------|
| data | IPurchaseResponseModel | No |

Source: `src/model/PurchaseRequest/PropsModel.ts`

#### AddBoughtCustomerCardModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |
| idCustomer | number | No |
| invoiceId | number | No |
| data | IBoughtCustomerCardResponse | No |

Source: `src/model/boughtCustomerCard/PropsModel.ts`

#### IBoughtServiceByCustomerResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| serviceId | number | No |
| serviceName | string | No |
| receiptDate | string | No |
| qty | number | No |
| priceDiscount | number | No |
| price | number | No |
| discount | number | No |
| fee | number | No |
| note | string | No |
| priceVariationId | string | No |
| saleEmployeeId | number | No |
| updatedTime | string | No |
| customerId | number | No |
| action | number | No |
| invoiceId | number | No |
| invoiceCode | number | No |
| treatmentNum | number | No |
| totalTreatment | number | No |
| cardNumber | number | No |
| serviceNumber | string | No |
| customerName | string | No |
| customerPhone | string | No |

Source: `src/model/boughtService/BoughtServiceResponseModel.ts`

#### ICustomerListProps

| Field | Type | Optional |
|-------|------|----------|
| tab | ITabModel | No |
| reload | boolean | No |

Source: `src/model/callCenter/PropsModel.ts`

#### ICustomerCardListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/card/PropsModel.ts`


## customerAttribute (`customerAttribute`)

**Service file:** `src/services/CustomerAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerAttribute/list` | src/services/CustomerAttributeService.ts |  |
| update | POST | `/adminapi/customerAttribute/update` | src/services/CustomerAttributeService.ts |  |
| delete | DELETE | `/adminapi/customerAttribute/delete` | src/services/CustomerAttributeService.ts |  |
| listAll | GET | `/adminapi/customerAttribute/listAll` | src/services/CustomerAttributeService.ts |  |
| checkDuplicated | POST | `/adminapi/customerAttribute/checkDuplicated` | src/services/CustomerAttributeService.ts |  |

### Related DTOs

#### AddCustomerAttributeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICustomerAttributeResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/customerAttribute/PropsModel.ts`

#### ICustomerAttributeListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/customerAttribute/PropsModel.ts`


## customerExtraInfo (`customerExtraInfo`)

**Service file:** `src/services/CustomerExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerExtraInfo/list` | src/services/CustomerExtraInfoService.ts |  |

## customerField (`customerField`)

**Service file:** `src/services/CustomerFieldService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerField/list` | src/services/CustomerFieldService.ts |  |
| update | POST | `/adminapi/customerField/update` | src/services/CustomerFieldService.ts |  |
| delete | DELETE | `/adminapi/customerField/delete` | src/services/CustomerFieldService.ts |  |

## customerGroup (`customerGroup`)

**Service file:** `src/services/CustomerGroupService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerGroup/list` | src/services/CustomerGroupService.ts |  |
| update | POST | `/adminapi/customerGroup/update` | src/services/CustomerGroupService.ts |  |
| delete | DELETE | `/adminapi/customerGroup/delete` | src/services/CustomerGroupService.ts |  |

### Related DTOs

#### IUpdateCustomerGroupRequest

| Field | Type | Optional |
|-------|------|----------|
| lstId | string | No |
| cgpId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerGroupFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/customerGroup/CustomerGroupRequestModel.ts`

#### ICustomerGroupRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| code | string | No |
| bsnId | number | No |
| createdTime | string | No |
| name | string | No |
| position | string | No |

Source: `src/model/customerGroup/CustomerGroupRequestModel.ts`

#### ICustomerGroupResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| code | string | No |
| bsnId | number | No |
| createdTime | string | No |
| name | string | No |
| position | number | No |

Source: `src/model/customerGroup/CustomerGroupResponseModel.ts`

#### AddCustomerGroupModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICustomerGroupResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/customerGroup/PropsModel.ts`


## customerMarketingLead (`customerMarketingLead`)

**Service file:** `src/services/CustomerMarketingLeadService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketingSource/list` | src/services/CustomerMarketingLeadService.ts |  |
| update | POST | `/adminapi/marketingSource/update` | src/services/CustomerMarketingLeadService.ts |  |
| delete | DELETE | `/adminapi/marketingSource/delete` | src/services/CustomerMarketingLeadService.ts |  |

## customerSource (`customerSource`)

**Service file:** `src/services/CustomerSourceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerSource/list` | src/services/CustomerSourceService.ts |  |
| update | POST | `/adminapi/customerSource/update` | src/services/CustomerSourceService.ts |  |
| delete | DELETE | `/adminapi/customerSource/delete` | src/services/CustomerSourceService.ts |  |

### Related DTOs

#### IUpdateCustomerSourceRequest

| Field | Type | Optional |
|-------|------|----------|
| lstId | string | No |
| sourceId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### AddCustomerSourceModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICustomerSourceResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/customerSource/PropsModel.ts`


## customerView (`customerView`)

**Service file:** `src/services/CustomerViewService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/customerView/list` | src/services/CustomerViewService.ts |  |
| update | POST | `/adminapi/customerView/update` | src/services/CustomerViewService.ts |  |
| delete | DELETE | `/adminapi/customerView/delete` | src/services/CustomerViewService.ts |  |

### Related DTOs

#### IAddCustomerViewerRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| customerId | number | No |
| employeeId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IAddCustomerViewerModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | () => void | No |
| dataCustomer | ICustomerResponse | No |

Source: `src/model/customer/CustomerRequestModel.ts`


## relationShip (`relationShip`)

**Service file:** `src/services/RelationShipService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/relationship/list` | src/services/RelationShipService.ts |  |
| update | POST | `/adminapi/relationship/update` | src/services/RelationShipService.ts |  |
| delete | DELETE | `/adminapi/relationship/delete` | src/services/RelationShipService.ts |  |

### Related DTOs

#### IUpdateOneRelationshipRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| relationshipId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IUpdateCustomeRelationshipRequest

| Field | Type | Optional |
|-------|------|----------|
| lstId | string | No |
| relationshipId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`


# Employee Module


## department (`department`)

**Service file:** `src/services/DepartmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/department/list` | src/services/DepartmentService.ts |  |
| update | POST | `/adminapi/department/update` | src/services/DepartmentService.ts |  |
| detail | GET | `/adminapi/department/get` | src/services/DepartmentService.ts |  |
| delete | DELETE | `/adminapi/department/delete` | src/services/DepartmentService.ts |  |
| list_branch | GET | `/adminapi/department/list/branch` | src/services/DepartmentService.ts |  |
| updateParent | POST | `/adminapi/department/update/parent` | src/services/DepartmentService.ts |  |

### Related DTOs

#### IDepartmentFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |
| branchId | number | Yes |

Source: `src/model/department/DepartmentRequestModel.ts`

#### IDepartmentRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | Yes |
| note | string | Yes |
| leadership | number | Yes |
| status | string | Yes |
| jobTitles | string | Yes |
| defaultRedirect | string | Yes |

Source: `src/model/department/DepartmentRequestModel.ts`

#### IDepartmentResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| note | string | No |
| leadership | number | No |
| status | number | No |
| jobTitles | any | Yes |
| branchId | number | Yes |
| parentId | number | Yes |
| parentName | string | Yes |
| managerId | number | Yes |
| managerName | string | Yes |
| totalEmployee | number | Yes |
| isSale | number | Yes |
| defaultRedirect | string | Yes |

Source: `src/model/department/DepartmentResponseModel.ts`

#### AddDepartmentModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idDepartment | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/department/PropsModel.ts`

#### IViewConfigDepartmentProps

| Field | Type | Optional |
|-------|------|----------|
| data | IDepartmentResponse | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/department/PropsModel.ts`


## employee (`employee`)

**Service file:** `src/services/EmployeeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/employee/list` | src/services/EmployeeService.ts |  |
| update | POST | `/adminapi/employee/update` | src/services/EmployeeService.ts |  |
| detail | GET | `/adminapi/employee/get` | src/services/EmployeeService.ts |  |
| delete | DELETE | `/adminapi/employee/delete` | src/services/EmployeeService.ts |  |
| linkEmployeeUser | POST | `/adminapi/employee/link_user` | src/services/EmployeeService.ts |  |
| init | GET | `/adminapi/employee/init` | src/services/EmployeeService.ts |  |
| info | GET | `/adminapi/employee/info` | src/services/EmployeeService.ts |  |
| takeRoles | GET | `/adminapi/employee/roles` | src/services/EmployeeService.ts |  |
| listExTip | GET | `/adminapi/employee/listExTip` | src/services/EmployeeService.ts |  |
| generateRandomPass | GET | `/adminapi/employee/random_pass` | src/services/EmployeeService.ts |  |
| list_department | GET | `/adminapi/employee/list/department` | src/services/EmployeeService.ts |  |
| updateToken | POST | `/adminapi/employee/update_token` | src/services/EmployeeService.ts | Cập nhật token của Outlook Mail |
| checkEmailConnection | POST | `/adminapi/employee/check_email_connection` | src/services/EmployeeService.ts |  |
| disconnectEmail | POST | `/adminapi/employee/disconnect_email` | src/services/EmployeeService.ts |  |
| updateRole | POST | `/adminapi/roleEmployee/insert-batch` | src/services/EmployeeService.ts |  |
| getListRoleEmployee | GET | `/adminapi/roleEmployee/list` | src/services/EmployeeService.ts |  |
| deleteRole | DELETE | `/adminapi/roleEmployee/delete` | src/services/EmployeeService.ts |  |

### Related DTOs

#### IChangeEmployeeRequestModel

| Field | Type | Optional |
|-------|------|----------|
| employeeId | number | No |
| refId | number | No |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### IUpdateCustomerEmployeeRequest

| Field | Type | Optional |
|-------|------|----------|
| lstId | string | No |
| employeeId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IViewEmployeeInDepartmentProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IDepartmentResponse | No |
| onHide | (reload: boolean) => void | No |
| handleNextPage | () => void | No |

Source: `src/model/department/PropsModel.ts`

#### IEmployeeFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| tipType | number | Yes |
| branchId | number | Yes |
| hasShip | number | Yes |
| departmentId | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| LstId | any | Yes |

Source: `src/model/employee/EmployeeRequestModel.ts`

#### IEmployeeRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | Yes |
| phone | string | Yes |
| address | string | Yes |
| jteId | number | Yes |
| managerId | number | Yes |
| status | number | string | Yes |
| viewMode | number | string | Yes |
| viewCustomerMode | number | string | Yes |
| viewContractMode | number | string | Yes |
| viewBusinessPartnerMode | number | string | Yes |
| viewProjectMode | number | string | Yes |
| position | number | Yes |
| userId | number | Yes |
| bsnId | number | Yes |
| serviceCount | number | Yes |
| title | string | Yes |
| isOwner | number | Yes |
| branchId | number | Yes |
| branchName | string | Yes |
| departmentId | number | Yes |
| departmentName | string | Yes |
| avatar | string | Yes |
| sip | string | Yes |
| idToken | string | Yes |
| accessToken | string | Yes |
| uniqueId | string | Yes |
| roles | string | Yes |
| code | string | Yes |

Source: `src/model/employee/EmployeeRequestModel.ts`


## employeeAgent (`employeeAgent`)

**Service file:** `src/services/EmployeeAgentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/employeeAgent/list` | src/services/EmployeeAgentService.ts |  |
| update | POST | `/adminapi/employeeAgent/update` | src/services/EmployeeAgentService.ts |  |
| delete | DELETE | `/adminapi/employeeAgent/delete` | src/services/EmployeeAgentService.ts |  |
| listAthena | GET | `/adminapi/athena/account-info` | src/services/EmployeeAgentService.ts |  |

## permission (`permission`)

**Service file:** `src/services/PermissionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| getPermissionResources | GET | `/adminapi/permission/resource` | src/services/PermissionService.ts |  |
| permissionDepartment | GET | `/adminapi/permission/info` | src/services/PermissionService.ts |  |
| rolePermission | GET | `/adminapi/rolePermission/info` | src/services/PermissionService.ts |  |
| permissionDepartmentAdd | POST | `/adminapi/permission/add` | src/services/PermissionService.ts |  |
| permissionRoleAdd | GET | `/adminapi/rolePermission/add` | src/services/PermissionService.ts |  |
| permissionDepartmentDelete | DELETE | `/adminapi/permission/remove` | src/services/PermissionService.ts |  |
| permissionClone | POST | `/adminapi/permission/clone` | src/services/PermissionService.ts |  |
| requestPermissionSource | GET | `/adminapi/requestPermission/list/source` | src/services/PermissionService.ts |  |
| updateRequestPermission | POST | `/adminapi/requestPermission/update` | src/services/PermissionService.ts |  |
| deleteRequestPermission | DELETE | `/adminapi/requestPermission/delete` | src/services/PermissionService.ts |  |
| requestPermissionTarget | GET | `/adminapi/requestPermission/list/target` | src/services/PermissionService.ts |  |
| updateApprovePermission | POST | `/adminapi/requestPermission/update/approved ` | src/services/PermissionService.ts |  |
| updateRejectPermission | POST | `/adminapi/requestPermission/update/rejected ` | src/services/PermissionService.ts |  |

### Related DTOs

#### IPermissionDepartmentAddRequest

| Field | Type | Optional |
|-------|------|----------|
| resourceId | number | No |
| departmentId | number | No |
| jteId | number | No |
| actions | string | No |

Source: `src/model/permission/PermissionRequestModel.ts`

#### IPermissionCloneRequest

| Field | Type | Optional |
|-------|------|----------|
| sourceDepartmentId | number | No |
| sourceJteId | number | No |
| targetDepartmentId | number | No |
| targetLstJteId | number[] | No |

Source: `src/model/permission/PermissionRequestModel.ts`


## position (`position`)

**Service file:** `src/services/PositionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/position/list` | src/services/PositionService.ts |  |
| update | POST | `/adminapi/position/update` | src/services/PositionService.ts |  |
| delete | DELETE | `/adminapi/position/delete` | src/services/PositionService.ts |  |

### Related DTOs

#### IPositionFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/position/PositionRequestModel.ts`

#### IPositionRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |
| bsnId | number | No |

Source: `src/model/position/PositionRequestModel.ts`

#### IPositionResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| bsnId | number | No |

Source: `src/model/position/PositionResponseModel.ts`

#### IAddPositionModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPositionResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/position/PropsModel.ts`

#### IPositionListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/position/PropsModel.ts`


## role (`role`)

**Service file:** `src/services/RoleService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/role/list` | src/services/RoleService.ts |  |
| update | POST | `/adminapi/role/update` | src/services/RoleService.ts |  |
| detail | GET | `/adminapi/role/get` | src/services/RoleService.ts |  |
| delete | DELETE | `/adminapi/role/delete` | src/services/RoleService.ts |  |
| list_branch | GET | `/adminapi/role/list/branch` | src/services/RoleService.ts |  |
| updateParent | POST | `/adminapi/role/update/parent` | src/services/RoleService.ts |  |

## rolePermission (`rolePermission`)

**Service file:** `src/services/RolePermissionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| getPermissionResources | GET | `/adminapi/permission/resource` | src/services/RolePermissionService.ts |  |
| rolePermission | GET | `/adminapi/rolePermission/info` | src/services/RolePermissionService.ts |  |
| packagePermission | GET | `/adminapi/packagePermission/info` | src/services/RolePermissionService.ts |  |
| packagePermissionAdd | POST | `/adminapi/packagePermission/add` | src/services/RolePermissionService.ts |  |
| permissionRoleAdd | POST | `/adminapi/rolePermission/add` | src/services/RolePermissionService.ts |  |
| permissionRoleDelete | DELETE | `/adminapi/rolePermission/remove` | src/services/RolePermissionService.ts |  |
| permissionClone | POST | `/adminapi/permission/clone` | src/services/RolePermissionService.ts |  |
| requestPermissionSource | GET | `/adminapi/requestPermission/list/source` | src/services/RolePermissionService.ts |  |
| updateRequestPermission | POST | `/adminapi/requestPermission/update` | src/services/RolePermissionService.ts |  |
| deleteRequestPermission | DELETE | `/adminapi/requestPermission/delete` | src/services/RolePermissionService.ts |  |
| requestPermissionTarget | GET | `/adminapi/requestPermission/list/target` | src/services/RolePermissionService.ts |  |
| updateApprovePermission | POST | `/adminapi/requestPermission/update/approved ` | src/services/RolePermissionService.ts |  |
| updateRejectPermission | POST | `/adminapi/requestPermission/update/rejected ` | src/services/RolePermissionService.ts |  |

## teamEmployee (`teamEmployee`)

**Service file:** `src/services/TeamEmployeeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/group/list` | src/services/TeamEmployeeService.ts |  |
| detail | GET | `/adminapi/group/get` | src/services/TeamEmployeeService.ts |  |
| update | POST | `/adminapi/group/update` | src/services/TeamEmployeeService.ts |  |
| delete | DELETE | `/adminapi/group/delete` | src/services/TeamEmployeeService.ts |  |
| listEmployee | GET | `/adminapi/groupEmployee/list` | src/services/TeamEmployeeService.ts |  |
| updateEmployee | POST | `/adminapi/groupEmployee/update` | src/services/TeamEmployeeService.ts |  |
| deleteEmployee | DELETE | `/adminapi/groupEmployee/delete` | src/services/TeamEmployeeService.ts |  |

# Clinic Module


## beautyBranch (`beautyBranch`)

**Service file:** `src/services/BeautyBranchService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/beautyBranch/list` | src/services/BeautyBranchService.ts |  |
| childList | GET | `/adminapi/beautyBranch/child` | src/services/BeautyBranchService.ts |  |
| detail | GET | `/adminapi/beautyBranch/get` | src/services/BeautyBranchService.ts |  |
| update | POST | `/adminapi/beautyBranch/update` | src/services/BeautyBranchService.ts |  |
| delete | DELETE | `/adminapi/beautyBranch/delete` | src/services/BeautyBranchService.ts |  |
| getBeautyBranchByCode | GET | `/adminapi/beautyBranch/get/byCode` | src/services/BeautyBranchService.ts |  |
| activate | POST | `/adminapi/beautyBranch/update/activate` | src/services/BeautyBranchService.ts |  |
| unActivate | POST | `/adminapi/beautyBranch/update/deactivate` | src/services/BeautyBranchService.ts |  |

### Related DTOs

#### IBeautyBranchFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/beautyBranch/BeautyBranchRequestModel.ts`

#### IBeautyBranchRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| parentId | number | No |
| name | string | No |
| phone | string | No |
| email | string | No |
| address | string | No |
| contact | string | No |
| description | string | No |
| alias | string | No |
| avatar | string | No |
| headquarter | number | No |
| foundingDay | string | number | No |
| foundingMonth | string | number | No |
| foundingYear | string | number | No |
| website | string | No |
| code | string | No |
| doctorNum | string | number | No |
| goodAt | string | No |

Source: `src/model/beautyBranch/BeautyBranchRequestModel.ts`

#### IBeautyBranchResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| parentId | number | No |
| parentName | string | No |
| name | string | No |
| phone | string | No |
| email | string | No |
| address | string | No |
| contact | string | No |
| description | string | No |
| alias | string | No |
| avatar | string | No |
| headquarter | number | No |
| foundingDay | string | number | No |
| foundingMonth | string | number | No |
| foundingYear | string | number | No |
| website | string | No |
| code | string | No |
| doctorNum | string | number | No |
| goodAt | string | No |
| status | number | No |
| inventoryAddress | string | No |

Source: `src/model/beautyBranch/BeautyBranchResponseModel.ts`

#### AddBeautyBranchModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IBeautyBranchResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/beautyBranch/PropsModel.ts`


## beautySalon (`beautySalon`)

**Service file:** `src/services/BeautySalonService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/beautySalon/list` | src/services/BeautySalonService.ts |  |
| approve | POST | `/api/beautySalon/approve` | src/services/BeautySalonService.ts |  |
| delete | DELETE | `/api/beautySalon/delete` | src/services/BeautySalonService.ts |  |

## building (`building`)

**Service file:** `src/services/BuildingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/building/list` | src/services/BuildingService.ts |  |
| update | POST | `https://mock.local/operation/building/update` | src/services/BuildingService.ts |  |
| detail | GET | `https://mock.local/operation/building/get` | src/services/BuildingService.ts |  |
| delete | DELETE | `https://mock.local/operation/building/delete` | src/services/BuildingService.ts |  |

## buildingFloor (`buildingFloor`)

**Service file:** `src/services/BuildingFloorService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/buildingFloor/list` | src/services/BuildingFloorService.ts |  |
| update | POST | `https://mock.local/operation/buildingFloor/update` | src/services/BuildingFloorService.ts |  |
| detail | GET | `https://mock.local/operation/buildingFloor/get` | src/services/BuildingFloorService.ts |  |
| delete | DELETE | `https://mock.local/operation/buildingFloor/delete` | src/services/BuildingFloorService.ts |  |

# Appointment Module


## diarySurgery (`diarySurgery`)

**Service file:** `src/services/DiarySurgeryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/diarySurgery/listAll` | src/services/DiarySurgeryService.ts |  |
| update | POST | `/adminapi/diarySurgery/update` | src/services/DiarySurgeryService.ts |  |
| detail | GET | `/adminapi/diarySurgery/get` | src/services/DiarySurgeryService.ts |  |
| delete | DELETE | `/adminapi/diarySurgery/delete` | src/services/DiarySurgeryService.ts |  |

### Related DTOs

#### IDiarySurgeryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/diarySurgery/DiarySurgeryRequestModel.ts`

#### IDiarySurgeryRequestModel

| Field | Type | Optional |
|-------|------|----------|
| thyId | number | No |
| diaryDate | string | No |
| medias | string | No |
| note | string | No |
| customerId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| cardNumber | string | No |

Source: `src/model/diarySurgery/DiarySurgeryRequestModel.ts`

#### IDiarySurgeryResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| thyId | number | No |
| diaryDate | string | No |
| medias | string | No |
| note | string | No |
| creatorId | number | No |
| creatorTime | string | No |
| customerId | number | No |
| customerName | string | No |
| employeeId | number | No |
| employeeName | string | No |
| treatmentStart | string | No |
| treatmentEnd | string | No |
| serviceId | number | No |
| serviceName | string | No |
| serviceNumber | string | No |
| cardNumber | string | No |

Source: `src/model/diarySurgery/DiarySurgeryResponseModel.ts`

#### IAddDiarySurgeryModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IDiarySurgeryResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/diarySurgery/PropsModel.ts`


## scheduleCommon (`scheduleCommon`)

**Service file:** `src/services/ScheduleCommonService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/schedule/list` | src/services/ScheduleCommonService.ts |  |
| listRelatedToCustomer | GET | `/adminapi/schedule/list/by_customer` | src/services/ScheduleCommonService.ts |  |

## scheduleConsultant (`scheduleConsultant`)

**Service file:** `src/services/ScheduleConsultantService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/scheduleConsultant/list` | src/services/ScheduleConsultantService.ts |  |
| update | POST | `/adminapi/scheduleConsultant/update` | src/services/ScheduleConsultantService.ts |  |
| detail | GET | `/adminapi/scheduleConsultant/get` | src/services/ScheduleConsultantService.ts |  |
| delete | DELETE | `/adminapi/scheduleConsultant/delete` | src/services/ScheduleConsultantService.ts |  |

### Related DTOs

#### IScheduleConsultantFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| consultantId | number | Yes |
| startTime | string | Yes |
| endTime | string | Yes |

Source: `src/model/scheduleConsultant/ScheduleConsultantRequestModel.ts`

#### IScheduleConsultantRequestModelProps

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| consultantId | number | No |
| services | string | No |
| content | string | No |
| customerId | number | No |
| note | string | No |
| startTime | string | No |
| endTime | string | No |
| type | number | string | No |
| notification | string | No |
| customerName | string | No |
| consultantName | string | No |
| potName | string | No |
| nodeId | string | No |
| lstVar | Array<{ key: string | No |

Source: `src/model/scheduleConsultant/ScheduleConsultantRequestModel.ts`

#### IScheduleConsultantResponseModelProps

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| consultantId | number | No |
| services | string | No |
| notification | string | No |
| content | string | No |
| customerId | number | No |
| note | string | No |
| startTime | Date | null | No |
| endTime | Date | null | No |
| type | number | No |
| bsnId | number | Yes |
| consultantName | string | Yes |
| customerName | string | Yes |
| lstService | ILstServiceProps[] | Yes |

Source: `src/model/scheduleConsultant/ScheduleConsultantResponseModel.ts`


## scheduleTreatment (`scheduleTreatment`)

**Service file:** `src/services/ScheduleTreatmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/scheduleTreatment/list` | src/services/ScheduleTreatmentService.ts |  |
| update | POST | `/adminapi/scheduleTreatment/update` | src/services/ScheduleTreatmentService.ts |  |
| detail | GET | `/adminapi/scheduleTreatment/get` | src/services/ScheduleTreatmentService.ts |  |
| delete | DELETE | `/adminapi/scheduleTreatment/delete` | src/services/ScheduleTreatmentService.ts |  |

### Related DTOs

#### IScheduleTreatmentResponseModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| startDate | any | No |
| endDate | any | No |
| onHide | (reload: boolean) => void | No |
| idData | number | No |
| idCustomer | number | Yes |

Source: `src/model/scheduleTreatment/PropsModel.ts`

#### IScheduleTreatmentFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| employeeId | number | Yes |
| customerId | number | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| status | number | Yes |
| branchId | number | Yes |

Source: `src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts`

#### IScheduleTreatmentRequestModal

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| customerId | number | No |
| services | string | No |
| employeeId | number | No |
| participants | string | No |
| startTime | string | No |
| endTime | string | No |
| content | string | No |
| note | string | No |
| roomId | number | No |
| notification | string | No |
| status | number | string | No |
| branchId | number | No |

Source: `src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts`

#### IScheduleTreatmentResponseModal

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| customerId | number | No |
| services | string | No |
| employeeId | number | No |
| participants | string | No |
| startTime | string | No |
| endTime | string | No |
| content | string | No |
| note | string | No |
| roomId | number | No |
| notification | string | No |
| status | number | No |
| branchId | number | No |

Source: `src/model/scheduleTreatment/ScheduleTreatmentResponseModel.ts`


## treatment (`treatment`)

**Service file:** `src/services/TreatmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filterSchedule | GET | `/adminapi/treatmentTime/list_schedule_next` | src/services/TreamentService.ts |  |
| filterByScheduler | GET | `/adminapi/treatmentTime/get_byscheduler` | src/services/TreamentService.ts |  |
| updateNext | POST | `/adminapi/treatmentTime/update_next` | src/services/TreamentService.ts |  |
| delete | DELETE | `/adminapi/treatmentTime/delete` | src/services/TreamentService.ts |  |
| updateCaringEmployee | POST | `/adminapi/treatmentTime/update_caring_employee` | src/services/TreamentService.ts |  |
| update | POST | `/adminapi/treatmentTime/update` | src/services/TreamentService.ts |  |

### Related DTOs

#### IScheduleTreatmentResponseModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| startDate | any | No |
| endDate | any | No |
| onHide | (reload: boolean) => void | No |
| idData | number | No |
| idCustomer | number | Yes |

Source: `src/model/scheduleTreatment/PropsModel.ts`

#### IScheduleTreatmentFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| employeeId | number | Yes |
| customerId | number | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| status | number | Yes |
| branchId | number | Yes |

Source: `src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts`

#### IScheduleTreatmentRequestModal

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| customerId | number | No |
| services | string | No |
| employeeId | number | No |
| participants | string | No |
| startTime | string | No |
| endTime | string | No |
| content | string | No |
| note | string | No |
| roomId | number | No |
| notification | string | No |
| status | number | string | No |
| branchId | number | No |

Source: `src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts`

#### IScheduleTreatmentResponseModal

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| customerId | number | No |
| services | string | No |
| employeeId | number | No |
| participants | string | No |
| startTime | string | No |
| endTime | string | No |
| content | string | No |
| note | string | No |
| roomId | number | No |
| notification | string | No |
| status | number | No |
| branchId | number | No |

Source: `src/model/scheduleTreatment/ScheduleTreatmentResponseModel.ts`

#### ShowServiceTreatmentProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITreamentSchedulerResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/treatment/PropsModel.ts`


## treatmentHistory (`treatmentHistory`)

**Service file:** `src/services/TreatmentHistoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/treatmentHistory/list_all` | src/services/TreatmentHistoryService.ts |  |
| update | POST | `/adminapi/treatmentHistory/update` | src/services/TreatmentHistoryService.ts |  |
| detail | GET | `/adminapi/treatmentHistory/get` | src/services/TreatmentHistoryService.ts |  |
| delete | DELETE | `/adminapi/treatmentHistory/delete` | src/services/TreatmentHistoryService.ts |  |
| listByCustomer | GET | `/adminapi/treatmentHistory/list_by_customer` | src/services/TreatmentHistoryService.ts |  |

### Related DTOs

#### UpdateTreatmentHistoryProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITreamentResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/treatment/PropsModel.ts`

#### IAddTreatmentHistoryModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idCustomer | number | Yes |
| data | ITreatmentHistoryResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/treatmentHistory/PropsModel.ts`

#### ITreatmentHistoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| serviceId | number | Yes |
| employeeId | number | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/treatmentHistory/TreatmentHistoryRequestModel.ts`

#### ITreatmentHistoryListByCustomerFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| serviceId | number | Yes |
| customerId | number | No |
| serviceNumber | string | No |
| cardNumber | string | No |

Source: `src/model/treatmentHistory/TreatmentHistoryRequestModel.ts`

#### ITreatmentHistoryRequestModel

| Field | Type | Optional |
|-------|------|----------|
| treatmentStart | string | No |
| treatmentEnd | string | No |
| treatmentTh | number | No |
| procDesc | string | No |
| note | string | No |
| scheduleNext | string | No |
| prevProof | string | No |
| afterProof | string | No |
| serviceId | number | No |
| employeeId | number | No |
| caringEmployeeId | number | No |
| sttId | number | No |
| customerId | number | No |
| serviceNumber | string | No |
| cardNumber | string | No |
| treatmentNum | number | No |
| totalTreatment | number | No |
| commits | string | No |
| customerPhone | string | No |

Source: `src/model/treatmentHistory/TreatmentHistoryRequestModel.ts`


## treatmentRoom (`treatmentRoom`)

**Service file:** `src/services/TreatmentRoomService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/treatmentRoom/list` | src/services/TreatmentRoomService.ts |  |
| update | POST | `/adminapi/treatmentRoom/update` | src/services/TreatmentRoomService.ts |  |
| detail | GET | `/adminapi/treatmentRoom/get` | src/services/TreatmentRoomService.ts |  |
| delete | DELETE | `/adminapi/treatmentRoom/delete` | src/services/TreatmentRoomService.ts |  |
| checkTreatmentRoom | POST | `/adminapi/treatmentRoom/check` | src/services/TreatmentRoomService.ts |  |

# Product Module


## boughtCard (`boughtCard`)

**Service file:** `src/services/BoughtCardService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/boughtCardService/list` | src/services/BoughtCardService.ts |  |
| listLoyaltyPoint | GET | `/adminapi/loyaltyPointLedger/list` | src/services/BoughtCardService.ts |  |
| add | POST | `/adminapi/boughtCardService/update` | src/services/BoughtCardService.ts |  |
| delete | DELETE | `/adminapi/boughtCardService/delete` | src/services/BoughtCardService.ts |  |
| update | POST | `/adminapi/boughtCardService/update/cardNumber` | src/services/BoughtCardService.ts |  |
| updateCustomerCard | POST | `/adminapi/boughtCard/update` | src/services/BoughtCardService.ts |  |
| listBoughtCardByCustomerId | GET | `/adminapi/boughtCardService/getBoughtCardServiceByCustomerId` | src/services/BoughtCardService.ts |  |

### Related DTOs

#### IBoughtCardFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| checkAccount | number | Yes |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| account | number | No |
| cardId | number | No |
| cardNumber | string | No |
| cash | number | No |
| customerId | number | No |
| fee | number | No |
| fmtOrderDate | string | No |
| note | string | No |
| qty | number | No |
| saleId | number | No |
| status | number | No |
| treatmentNum | number | Yes |
| serviceId | number | Yes |
| serviceCombo | string | No |
| accountCard | number | Yes |
| totalCard | number | Yes |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardUpdateRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| cardNumber | string | No |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| receiptDate | string | No |
| qty | number | No |
| fee | number | No |
| account | number | No |

Source: `src/model/boughtCard/BoughtCardResponseModel.ts`

#### ListBoughtCardServiceProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |
| tab | string | No |

Source: `src/model/customer/PropsModel.ts`


## boughtProduct (`boughtProduct`)

**Service file:** `src/services/BoughtProductService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/boughtProduct/list` | src/services/BoughtProductService.ts |  |
| addToInvoice | POST | `/adminapi/boughtProduct/update` | src/services/BoughtProductService.ts |  |
| delete | DELETE | `/adminapi/boughtProduct/delete` | src/services/BoughtProductService.ts |  |
| update | POST | `/adminapi/boughtProduct/update` | src/services/BoughtProductService.ts |  |
| detail | GET | `/adminapi/boughtProduct/get` | src/services/BoughtProductService.ts |  |
| getByCustomer | GET | `/adminapi/boughtProduct/getBoughtProductByCustomerId` | src/services/BoughtProductService.ts |  |

### Related DTOs

#### IBoughtProductFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | Yes |
| keyword | string | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| productId | number | No |
| batchNo | string | Yes |
| unitId | number | No |
| price | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| qty | number | No |
| saleId | number | No |
| fee | number | No |
| note | string | Yes |
| customerId | number | No |
| invoiceId | number | No |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| inventoryId | number | No |
| productId | number | No |
| unitId | number | No |
| qty | number | No |
| saleId | number | No |
| discountUnit | string | No |
| discount | number | No |
| customerId | number | No |
| fee | number | No |
| batchNo | string | number | No |
| fmtOrderDate | string | No |
| priceSample | number | Yes |
| productInventory | number | Yes |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductToInvoiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceCode | string | No |
| customerName | string | No |
| customerPhone | string | No |
| orderDate | string | No |
| receiptDate | string | No |
| name | string | No |
| qty | number | No |
| fee | number | No |

Source: `src/model/boughtProduct/BoughtProductResponseModel.ts`

#### IBoughtProductResponse

| Field | Type | Optional |
|-------|------|----------|
| batchNo | string | No |
| avatar | string | No |
| customerId | number | No |
| customerName | string | No |
| customerPhone | string | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| id | number | No |
| invoiceCode | number | No |
| invoiceId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| inventoryId | number | No |
| productId | number | No |
| name | string | No |
| qty | number | No |
| saleId | number | No |
| unitId | number | No |
| unitName | string | No |
| vat | number | No |
| receiptDate | string | No |
| priceSample | number | Yes |
| productInventory | number | Yes |

Source: `src/model/boughtProduct/BoughtProductResponseModel.ts`


## boughtService (`boughtService`)

**Service file:** `src/services/BoughtServiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| addToInvoice | POST | `/adminapi/boughtService/update` | src/services/BoughtServiceService.ts |  |
| delete | DELETE | `/adminapi/boughtService/delete` | src/services/BoughtServiceService.ts |  |
| update | POST | `/adminapi/boughtService/update` | src/services/BoughtServiceService.ts |  |
| detail | GET | `/adminapi/boughtService/get` | src/services/BoughtServiceService.ts |  |
| getByCustomer | GET | `/adminapi/boughtService/getBoughtServiceByCustomerId` | src/services/BoughtServiceService.ts |  |

### Related DTOs

#### IBoughtServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| serviceId | number | No |
| qty | number | No |
| note | string | Yes |
| price | number | No |
| retail | number | No |
| retailPrice | number | No |
| packageType | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| saleEmployeeId | number | Yes |
| invoiceId | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| discount | number | No |
| discountUnit | string | No |
| fee | number | No |
| invoiceId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| treatmentNum | number | No |
| priceSample | number | No |
| totalPayment | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceByCustomerResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| serviceId | number | No |
| serviceName | string | No |
| receiptDate | string | No |
| qty | number | No |
| priceDiscount | number | No |
| price | number | No |
| discount | number | No |
| fee | number | No |
| note | string | No |
| priceVariationId | string | No |
| saleEmployeeId | number | No |
| updatedTime | string | No |
| customerId | number | No |
| action | number | No |
| invoiceId | number | No |
| invoiceCode | number | No |
| treatmentNum | number | No |
| totalTreatment | number | No |
| cardNumber | number | No |
| serviceNumber | string | No |
| customerName | string | No |
| customerPhone | string | No |

Source: `src/model/boughtService/BoughtServiceResponseModel.ts`

#### IBoughtServiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| action | number | No |
| customerId | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| invoiceCode | string | No |
| invoiceId | number | No |
| receiptDate | number | Yes |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| updatedTime | string | No |
| serviceName | string | No |
| serviceAvatar | string | No |

Source: `src/model/boughtService/BoughtServiceResponseModel.ts`


## businessCategory (`businessCategory`)

**Service file:** `src/services/BusinessCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/businessCategory/list` | src/services/BusinessCategoryService.ts |  |
| update | POST | `/application/businessCategory/update` | src/services/BusinessCategoryService.ts |  |
| updateActive | POST | `/application/businessCategory/update/active` | src/services/BusinessCategoryService.ts |  |
| detail | GET | `/application/businessCategory/get` | src/services/BusinessCategoryService.ts |  |
| delete | DELETE | `/application/businessCategory/delete` | src/services/BusinessCategoryService.ts |  |

## card (`card`)

**Service file:** `src/services/CardService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/card/list` | src/services/CardService.ts |  |
| update | POST | `/adminapi/card/update` | src/services/CardService.ts |  |
| delete | DELETE | `/adminapi/card/delete` | src/services/CardService.ts |  |

### Related DTOs

#### IBoughtCardFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| checkAccount | number | Yes |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| account | number | No |
| cardId | number | No |
| cardNumber | string | No |
| cash | number | No |
| customerId | number | No |
| fee | number | No |
| fmtOrderDate | string | No |
| note | string | No |
| qty | number | No |
| saleId | number | No |
| status | number | No |
| treatmentNum | number | Yes |
| serviceId | number | Yes |
| serviceCombo | string | No |
| accountCard | number | Yes |
| totalCard | number | Yes |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardUpdateRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| cardNumber | string | No |

Source: `src/model/boughtCard/BoughtCardRequestModel.ts`

#### IBoughtCardResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| receiptDate | string | No |
| qty | number | No |
| fee | number | No |
| account | number | No |

Source: `src/model/boughtCard/BoughtCardResponseModel.ts`

#### AddBoughtCustomerCardModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |
| idCustomer | number | No |
| invoiceId | number | No |
| data | IBoughtCustomerCardResponse | No |

Source: `src/model/boughtCustomerCard/PropsModel.ts`


## cardService (`cardService`)

**Service file:** `src/services/CardServiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cardService/list` | src/services/CardServiceService.ts |  |
| update | POST | `/adminapi/cardService/update` | src/services/CardServiceService.ts |  |
| detail | GET | `/adminapi/cardService/get` | src/services/CardServiceService.ts |  |
| delete | DELETE | `/adminapi/cardService/delete` | src/services/CardServiceService.ts |  |

### Related DTOs

#### ICardServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/cardService/CardServiceRequestModel.ts`

#### ICardServiceRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | No |
| avatar | string | No |
| cash | number | string | No |
| account | number | string | No |
| note | string | No |
| bsnId | number | No |
| multiPurpose | number | string | No |
| serviceId | number | No |
| serviceCombo | string | No |
| treatmentNum | number | No |

Source: `src/model/cardService/CardServiceRequestModel.ts`

#### ICardServiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | Yes |
| avatar | string | Yes |
| cash | number | string | No |
| account | number | string | No |
| note | string | Yes |
| bsnId | number | Yes |
| multiPurpose | number | No |
| serviceId | number | No |
| serviceCombo | string | No |
| treatmentNum | number | Yes |

Source: `src/model/cardService/CardServiceResponseModel.ts`

#### AddCardServiceModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICardServiceResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/cardService/PropsModel.ts`

#### ListBoughtCardServiceProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |
| tab | string | No |

Source: `src/model/customer/PropsModel.ts`


## category (`category`)

**Service file:** `src/services/CategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/category/list` | src/services/CategoryService.ts |  |
| update | POST | `/adminapi/category/update` | src/services/CategoryService.ts |  |
| detail | GET | `/adminapi/category/get` | src/services/CategoryService.ts |  |
| delete | DELETE | `/adminapi/category/delete` | src/services/CategoryService.ts |  |

### Related DTOs

#### IPurchaseCategoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| type | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/PurchaseRequest/PurchaseRequestModel.ts`

#### ICategoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| type | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/category/CategoryResquestModel.ts`

#### ICategoryRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | Yes |
| source | number | string | Yes |
| position | number | string | No |
| type | number | string | No |
| bsnId | number | No |

Source: `src/model/category/CategoryResquestModel.ts`

#### AddCategoryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICategoryResponse | Yes |
| tab | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/category/PropsModel.ts`

#### ICategoryServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| active | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |

Source: `src/model/categoryService/CategoryServiceRequestModel.ts`


## categoryService (`categoryService`)

**Service file:** `src/services/CategoryServiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/categoryItem/list` | src/services/CategoryServiceService.ts |  |
| update | POST | `/adminapi/categoryItem/update` | src/services/CategoryServiceService.ts |  |
| detail | GET | `/adminapi/categoryItem/get` | src/services/CategoryServiceService.ts |  |
| delete | DELETE | `/adminapi/categoryItem/delete` | src/services/CategoryServiceService.ts |  |

### Related DTOs

#### ICategoryServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| active | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |

Source: `src/model/categoryService/CategoryServiceRequestModel.ts`

#### ICategoryServiceRequestModel

| Field | Type | Optional |
|-------|------|----------|
| avatar | string | No |
| name | string | No |
| parentId | number | No |
| position | number | string | No |
| active | number | string | No |
| featured | number | string | No |

Source: `src/model/categoryService/CategoryServiceRequestModel.ts`

#### ICategoryServiceResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| avatar | string | No |
| name | string | No |
| parentId | number | No |
| parentName | string | No |
| position | number | No |
| active | number | No |
| rebornCategoryId | number | No |
| featured | number | No |
| bsnId | number | No |

Source: `src/model/categoryService/CategoryServiceResponseModel.ts`

#### IAddCategoryServiceModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICategoryServiceResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/categoryService/PropsModel.ts`

#### ICategoryServiceListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/categoryService/PropsModel.ts`


## inventory (`inventory`)

**Service file:** `src/services/InventoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/warehouse/inventory/list` | src/services/InventoryService.ts |  |
| update | POST | `https://mock.local/warehouse/inventory/update` | src/services/InventoryService.ts |  |
| delete | DELETE | `https://mock.local/warehouse/inventory/delete` | src/services/InventoryService.ts |  |
| import | POST | `https://mock.local/warehouse/inventory/import` | src/services/InventoryService.ts |  |

### Related DTOs

#### IInventoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/inventory/InventoryRequestModel.ts`

#### IInventoryRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| address | string | No |
| position | string | No |
| branchId | number | No |
| bsnId | number | No |
| code | string | No |
| status | number | No |
| employeeId | number | No |

Source: `src/model/inventory/InventoryRequestModel.ts`

#### IInventoryResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| address | string | No |
| position | number | No |
| branchId | number | No |
| branchName | string | No |
| bsnId | number | No |
| createdTime | string | No |
| employeeName | string | No |
| code | string | No |
| status | number | No |
| employeeId | number | No |

Source: `src/model/inventory/InventoryResponseModel.ts`

#### AddInventoryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IInventoryResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/inventory/PropsModel.ts`


## material (`material`)

**Service file:** `src/services/MaterialService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/material/list` | src/services/MaterialService.ts |  |
| update | POST | `/application/material/update` | src/services/MaterialService.ts |  |
| updateStatus | POST | `/application/material/update/status` | src/services/MaterialService.ts |  |
| delete | DELETE | `/application/material/delete` | src/services/MaterialService.ts |  |
| detail | GET | `/application/material/get` | src/services/MaterialService.ts |  |
| upload | POST | `/application/material/upload` | src/services/MaterialService.ts |  |

## order (`order`)

**Service file:** `src/services/OrderService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/order/list` | src/services/OrderService.ts |  |
| detail | GET | `/adminapi/order/get` | src/services/OrderService.ts |  |
| update | POST | `/adminapi/order/update` | src/services/OrderService.ts |  |
| delete | DELETE | `/adminapi/order/delete` | src/services/OrderService.ts |  |

### Related DTOs

#### ITableWorkOrderProps

| Field | Type | Optional |
|-------|------|----------|
| listSaveSearch | any | No |
| customerFilterList | any | No |
| params | IWorkOrderFilterRequest | No |
| setParams | any | No |
| titles | any | No |
| listWork | IWorkOrderResponseModel[] | No |
| pagination | any | No |
| dataMappingArray | any | No |
| dataFormat | any | No |
| listIdChecked | number[] | No |
| setListIdChecked | any | No |
| bulkActionList | any | No |
| actionsTable | any | No |
| isLoading | boolean | No |
| setIdWork | any | No |
| setShowModalAdd | any | No |
| isNoItem | boolean | No |

Source: `src/model/workOrder/PropsModel.ts`

#### IWorkOrderFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| departmentId | number | Yes |
| workType | string | Yes |
| opportunityId | number | Yes |
| projectId | number | Yes |
| status | number | Yes |
| name | string | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| type | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| potId | number | Yes |
| processId | number | Yes |
| employeeId | number | Yes |
| participantId | number | Yes |
| isPriority | number | Yes |
| biddingName | any | Yes |
| filters | any | Yes |

Source: `src/model/workOrder/WorkOrderRequestModel.ts`

#### IWorkOrderRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| content | string | No |
| contentDelta | string | No |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | Yes |
| wteId | number | No |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| managerId | number | No |
| employeeId | number | No |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | string | number | No |
| notification | string | No |
| creatorId | number | Yes |

Source: `src/model/workOrder/WorkOrderRequestModel.ts`

#### IWorkOrderResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| content | string | No |
| contentDelta | string | Yes |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | No |
| wteId | number | No |
| workTypeName | string | Yes |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| projectName | string | Yes |
| opportunityName | string | Yes |
| managerId | number | No |
| managerName | string | Yes |
| managerAvatar | string | Yes |
| employeeId | number | No |
| employeeName | number | Yes |
| employeeAvatar | number | Yes |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | number | No |
| lstParticipant | any[] | Yes |
| lstCustomer | any[] | Yes |
| notification | string | No |
| reviews | string | Yes |
| nodeName | string | Yes |
| iteration | number | Yes |
| scope | string | Yes |
| taskType | string | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`

#### IWorkOrderDocFile

| Field | Type | Optional |
|-------|------|----------|
| url | string | No |
| type | string | Yes |
| name | string | Yes |
| size | number | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`


## package (`package`)

**Service file:** `src/services/PackageService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/package/list` | src/services/PackageService.ts |  |
| update | POST | `/api/package/update` | src/services/PackageService.ts |  |
| updateStatus | POST | `/api/package/update/status` | src/services/PackageService.ts |  |
| detail | GET | `/api/package/get` | src/services/PackageService.ts |  |
| delete | DELETE | `/api/package/delete` | src/services/PackageService.ts |  |
| addOrgApp | POST | `/api/orgApp/add` | src/services/PackageService.ts |  |
| updateBill | POST | `/api/orgApp/update/bill` | src/services/PackageService.ts |  |
| calcPrice | POST | `/api/orgApp/calc/priceRemaining` | src/services/PackageService.ts |  |
| extend | POST | `/api/orgApp/extend` | src/services/PackageService.ts |  |
| upgrade | POST | `/api/orgApp/upgrade` | src/services/PackageService.ts |  |

## product (`product`)

**Service file:** `src/services/ProductService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filterWarehouse | GET | `/adminapi/product/in_warehouse` | src/services/ProductService.ts |  |
| list | GET | `/adminapi/product/list` | src/services/ProductService.ts |  |
| detail | GET | `/adminapi/product/get` | src/services/ProductService.ts |  |
| update | POST | `/adminapi/product/update` | src/services/ProductService.ts |  |
| updateContent | POST | `/adminapi/product/update/content` | src/services/ProductService.ts |  |
| delete | DELETE | `/adminapi/product/delete` | src/services/ProductService.ts |  |
| listShared | GET | `/adminapi/product/list/shared` | src/services/ProductService.ts |  |

### Related DTOs

#### IChooseProductModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |
| satId | number | Yes |
| inventory | any | No |
| lstBatchNoProduct | string[] | No |

Source: `src/model/adjustmentSlip/PropsModel.ts`

#### IBoughtProductFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | Yes |
| keyword | string | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| productId | number | No |
| batchNo | string | Yes |
| unitId | number | No |
| price | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| qty | number | No |
| saleId | number | No |
| fee | number | No |
| note | string | Yes |
| customerId | number | No |
| invoiceId | number | No |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| inventoryId | number | No |
| productId | number | No |
| unitId | number | No |
| qty | number | No |
| saleId | number | No |
| discountUnit | string | No |
| discount | number | No |
| customerId | number | No |
| fee | number | No |
| batchNo | string | number | No |
| fmtOrderDate | string | No |
| priceSample | number | Yes |
| productInventory | number | Yes |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductToInvoiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceCode | string | No |
| customerName | string | No |
| customerPhone | string | No |
| orderDate | string | No |
| receiptDate | string | No |
| name | string | No |
| qty | number | No |
| fee | number | No |

Source: `src/model/boughtProduct/BoughtProductResponseModel.ts`


## service (`service`)

**Service file:** `src/services/ServiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filter | GET | `/adminapi/service/list` | src/services/ServiceService.ts |  |
| update | POST | `/adminapi/service/update` | src/services/ServiceService.ts |  |
| updateContent | POST | `/adminapi/service/update/content` | src/services/ServiceService.ts |  |
| detail | GET | `/adminapi/service/get` | src/services/ServiceService.ts |  |
| delete | DELETE | `/adminapi/service/delete` | src/services/ServiceService.ts |  |
| listShared | GET | `/adminapi/service/list/shared` | src/services/ServiceService.ts |  |

### Related DTOs

#### IBoughtServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| serviceId | number | No |
| qty | number | No |
| note | string | Yes |
| price | number | No |
| retail | number | No |
| retailPrice | number | No |
| packageType | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| saleEmployeeId | number | Yes |
| invoiceId | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| discount | number | No |
| discountUnit | string | No |
| fee | number | No |
| invoiceId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| treatmentNum | number | No |
| priceSample | number | No |
| totalPayment | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### IBoughtServiceByCustomerResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| serviceId | number | No |
| serviceName | string | No |
| receiptDate | string | No |
| qty | number | No |
| priceDiscount | number | No |
| price | number | No |
| discount | number | No |
| fee | number | No |
| note | string | No |
| priceVariationId | string | No |
| saleEmployeeId | number | No |
| updatedTime | string | No |
| customerId | number | No |
| action | number | No |
| invoiceId | number | No |
| invoiceCode | number | No |
| treatmentNum | number | No |
| totalTreatment | number | No |
| cardNumber | number | No |
| serviceNumber | string | No |
| customerName | string | No |
| customerPhone | string | No |

Source: `src/model/boughtService/BoughtServiceResponseModel.ts`

#### IBoughtServiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| action | number | No |
| customerId | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| invoiceCode | string | No |
| invoiceId | number | No |
| receiptDate | number | Yes |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| updatedTime | string | No |
| serviceName | string | No |
| serviceAvatar | string | No |

Source: `src/model/boughtService/BoughtServiceResponseModel.ts`


## warehouse (`warehouse`)

**Service file:** `src/services/WarehouseService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/warehouse/warehouse/list` | src/services/WarehouseService.ts |  |
| productList | GET | `https://mock.local/warehouse/warehouse/product/list` | src/services/WarehouseService.ts |  |
| infoExpiryDateProductionDate | GET | `https://mock.local/warehouse/warehouse/get_mfg_expired_date` | src/services/WarehouseService.ts |  |

### Related DTOs

#### IWarehouseProFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | No |
| inventoryId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts`

#### IWarehouseProResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| inventoryId | number | No |
| inventoryName | string | No |
| productId | number | No |
| productName | string | No |
| productAvatar | string | No |
| price | number | No |
| batchNo | string | No |
| discount | number | No |
| discountUnit | string | No |
| expiryDate | string | No |
| quantity | number | No |
| unitId | number | No |
| unitName | string | No |

Source: `src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts`

#### IWarehouseFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/warehouse/WarehouseRequestModel.ts`

#### IListWarehouseProductFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| inventoryId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/warehouse/WarehouseRequestModel.ts`

#### IWarehouseResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| productId | number | No |
| productName | string | No |
| batchNo | string | No |
| expiryDate | string | No |
| quantity | number | No |
| discount | number | null | No |
| discountUnit | number | null | No |
| unitId | number | No |
| unitName | string | No |
| inventoryName | string | No |

Source: `src/model/warehouse/WarehouseResponseModel.ts`


# Campaign Module


## campaign (`campaign`)

**Service file:** `src/services/CampaignService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/campaign/list` | src/services/CampaignService.ts |  |
| listViewSale | GET | `/adminapi/campaign/list/view_sale` | src/services/CampaignService.ts |  |
| update | POST | `/adminapi/campaign/update` | src/services/CampaignService.ts |  |
| updateStatus | POST | `/adminapi/campaign/update/status` | src/services/CampaignService.ts |  |
| detail | GET | `/adminapi/campaign/get` | src/services/CampaignService.ts |  |
| delete | DELETE | `/adminapi/campaign/delete` | src/services/CampaignService.ts |  |
| convertRate | GET | `/adminapi/opportunityProcess` | src/services/CampaignService.ts |  |
| listActionScore | GET | `/adminapi/api/v1/score/action` | src/services/CampaignService.ts |  |
| updateStep3 | POST | `/adminapi/api/v1/score/insertMulti` | src/services/CampaignService.ts |  |
| listDataStep3 | GET | `/adminapi/api/v1/score/campaign` | src/services/CampaignService.ts |  |
| updateStep4 | POST | `/adminapi/campaign/sale-point-config/update` | src/services/CampaignService.ts |  |
| listDataScoreEmployee | GET | `/adminapi/campaign/sale-point-config/get` | src/services/CampaignService.ts |  |
| listSale | GET | `/adminapi/campaignSale/list` | src/services/CampaignService.ts |  |
| statisticApproach | GET | `/adminapi/campaignOpportunity/statisticApproach` | src/services/CampaignService.ts |  |
| statisticSale | GET | `/adminapi/campaignOpportunity/statisticSale` | src/services/CampaignService.ts |  |
| statisticConvertRate | GET | `/adminapi/campaignOpportunity/statisticConvertRate` | src/services/CampaignService.ts |  |
| exportResult | POST | `/adminapi/campaignOpportunity/exportResult` | src/services/CampaignService.ts |  |
| exportAction | POST | `/adminapi/campaignOpportunity/exportAction` | src/services/CampaignService.ts |  |
| exportCustomer | POST | `/adminapi/campaignOpportunity/exportCustomer` | src/services/CampaignService.ts |  |
| updateConfigSLA | POST | `/adminapi/campaign/sla-config` | src/services/CampaignService.ts |  |

### Related DTOs

#### ICampaignFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |
| customerId | number | Yes |

Source: `src/model/campaign/CampaignRequestModel.ts`

#### ICampaignRequestModel

| Field | Type | Optional |
|-------|------|----------|
| code | string | Yes |
| name | string | Yes |
| cover | string | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| position | number | Yes |
| employeeId | number | Yes |
| divisionMethod | number | string | Yes |
| sales | string | Yes |
| approach | string | Yes |

Source: `src/model/campaign/CampaignRequestModel.ts`

#### ICampaignResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| code | string | No |
| name | string | No |
| type | string | No |
| cover | string | No |
| startDate | string | No |
| endDate | string | No |
| position | number | Yes |
| employeeId | number | No |
| employeeName | string | Yes |
| employeeAvatar | string | Yes |
| divisionMethod | number | No |
| approach | string | Yes |
| createdTime | string | Yes |
| bsnId | number | Yes |
| sales | string | No |
| averageConvertRate | number | string | Yes |
| totalRevenue | number | string | Yes |
| totalCustomer | number | string | Yes |
| branches0 | any | Yes |
| branches1 | any | Yes |
| branches2 | any | Yes |
| branches3 | any | Yes |
| branches4 | any | Yes |
| lstDepartment | any | Yes |
| lstBranch | any | Yes |
| coordinators | any | Yes |
| lstCoordinator | any | Yes |
| status | string | number | No |
| saleDistributionType | string | Yes |

Source: `src/model/campaign/CampaignResponseModel.ts`

#### IAddCampaignModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idData | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/campaign/PropsModel.ts`

#### ICampaignApproachFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| campaignId | number | Yes |

Source: `src/model/campaignApproach/CampaignApproachRequestModel.ts`


## campaignMarketing (`campaignMarketing`)

**Service file:** `src/services/CampaignMarketingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketing/list` | src/services/CampaignMarketingService.ts |  |
| update | POST | `/adminapi/marketing/update` | src/services/CampaignMarketingService.ts |  |
| updateStatus | POST | `/adminapi/marketing/update/status` | src/services/CampaignMarketingService.ts |  |
| detail | GET | `/adminapi/marketing/get` | src/services/CampaignMarketingService.ts |  |
| delete | DELETE | `/adminapi/marketing/delete` | src/services/CampaignMarketingService.ts |  |

## campaignOpportunity (`campaignOpportunity`)

**Service file:** `src/services/CampaignOpportunityService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/campaignOpportunity/list` | src/services/CampaignOpportunityService.ts |  |
| listViewSale | GET | `/adminapi/campaignOpportunity/list/view_sale` | src/services/CampaignOpportunityService.ts |  |
| update | POST | `/adminapi/campaignOpportunity/update` | src/services/CampaignOpportunityService.ts |  |
| updateBatch | POST | `/adminapi/campaignOpportunity/update/batch` | src/services/CampaignOpportunityService.ts |  |
| detail | GET | `/adminapi/campaignOpportunity/get` | src/services/CampaignOpportunityService.ts |  |
| delete | DELETE | `/adminapi/campaignOpportunity/delete` | src/services/CampaignOpportunityService.ts |  |
| changeEmployee | POST | `/adminapi/campaignOpportunity/change/employee` | src/services/CampaignOpportunityService.ts |  |
| changeSale | POST | `/adminapi/campaignOpportunity/change/sale` | src/services/CampaignOpportunityService.ts |  |
| opportunityProcessUpdate | POST | `/adminapi/opportunityProcess/update` | src/services/CampaignOpportunityService.ts |  |
| opportunityProcessDelete | DELETE | `/adminapi/opportunityProcess/delete` | src/services/CampaignOpportunityService.ts |  |
| opportunityExchange | GET | `/adminapi/opportunityExchange/list` | src/services/CampaignOpportunityService.ts |  |
| deleteOpportunityExchange | DELETE | `/adminapi/opportunityExchange/delete` | src/services/CampaignOpportunityService.ts |  |
| addOpportunityExchange | POST | `/adminapi/opportunityExchange/update` | src/services/CampaignOpportunityService.ts |  |
| updateOpportunityExchange | POST | `/adminapi/opportunityExchange/get` | src/services/CampaignOpportunityService.ts |  |
| listOpportunity | GET | `/adminapi/opportunity/list` | src/services/CampaignOpportunityService.ts |  |
| opportunityCheck | POST | `/adminapi/campaignOpportunity/check` | src/services/CampaignOpportunityService.ts |  |
| sendEmail | POST | `/adminapi/customer/campaign/send/email` | src/services/CampaignOpportunityService.ts |  |
| opportunityContact | POST | `/adminapi/opportunityContact/update` | src/services/CampaignOpportunityService.ts |  |
| detailOpportunityContact | GET | `/adminapi/opportunityContact/detail` | src/services/CampaignOpportunityService.ts |  |
| opportunityEformUpdate | POST | `/adminapi/opportunityEform/update` | src/services/CampaignOpportunityService.ts |  |
| opportunityEformDetail | GET | `/adminapi/opportunityEform/get/criteria` | src/services/CampaignOpportunityService.ts |  |
| addOther | GET | `/adminapi/campaignOpportunityViewer/update` | src/services/CampaignOpportunityService.ts |  |
| addCoyViewer | GET | `/adminapi/campaignOpportunityViewer/update` | src/services/CampaignOpportunityService.ts |  |
| lstCoyViewer | GET | `/adminapi/campaignOpportunityViewer/list` | src/services/CampaignOpportunityService.ts |  |
| deleteCoyViewer | DELETE | `/adminapi/campaignOpportunityViewer/delete` | src/services/CampaignOpportunityService.ts |  |

### Related DTOs

#### ICampaignOpportunityFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| campaignId | number | Yes |
| customerId | number | Yes |
| approachId | number | Yes |
| saleId | number | Yes |
| pipelineId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### ICampaignOpportunityRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| employeeId | number | Yes |
| expectedRevenue | number | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| sourceId | number | Yes |
| refId | number | Yes |
| customerId | number | Yes |
| campaignId | number | Yes |
| approachId | number | Yes |
| lstCustomerId | number[] | Yes |
| type | string | Yes |
| saleId | number | Yes |
| opportunityId | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### ICampaignOpportunityResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| campaignId | number | No |
| type | string | No |
| campaignName | string | Yes |
| createdTime | string | Yes |
| creatorId | number | Yes |
| customerAddress | string | Yes |
| customerAvatar | string | Yes |
| customerEmail | string | Yes |
| customerId | number | No |
| customerName | string | Yes |
| customerPhone | string | Yes |
| employeeId | number | No |
| employeeName | string | Yes |
| employeeAvatar | string | Yes |
| employeePhone | string | Yes |
| endDate | string | No |
| expectedRevenue | number | No |
| lstOpportunityProcess | any | Yes |
| refId | number | No |
| startDate | string | Yes |
| saleId | number | Yes |
| opportunity | any | Yes |
| opportunityId | number | Yes |
| saleName | string | Yes |
| saleAvatar | any | Yes |
| sourceId | number | No |
| sourceName | string | Yes |
| status | number | string | Yes |
| approachId | number | No |
| updatedTime | string | Yes |
| percent | number | Yes |
| approachName | string | Yes |
| note | string | Yes |
| pipelineId | number | Yes |
| pipelineName | string | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityResponseModel.ts`

#### IAddCampaignOpportunityModel

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idData | number | Yes |
| conditionCampain | any | Yes |
| idCustomer | number | Yes |
| isBatch | boolean | Yes |
| listId | number[] | Yes |
| onHide | (reload: boolean) => void | No |
| dataCustomerProps | any | Yes |

Source: `src/model/campaignOpportunity/PropsModel.ts`


## campaignPipeline (`campaignPipeline`)

**Service file:** `src/services/CampaignPipelineService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/campaignPipeline/list` | src/services/CampaignPipelineService.ts |  |
| update | POST | `/adminapi/campaignPipeline/update` | src/services/CampaignPipelineService.ts |  |
| detail | GET | `/adminapi/campaignPipeline/get` | src/services/CampaignPipelineService.ts |  |
| delete | DELETE | `/adminapi/campaignPipeline/delete` | src/services/CampaignPipelineService.ts |  |

## crmCampaign (`crmCampaign`)

**Service file:** `src/services/CrmCampaignService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/crmCampaign/list` | src/services/CrmCampaignService.ts |  |
| update | POST | `/adminapi/crmCampaign/update` | src/services/CrmCampaignService.ts |  |
| delete | DELETE | `/adminapi/crmCampaign/delete` | src/services/CrmCampaignService.ts |  |

### Related DTOs

#### ICrmCampaignFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/crmCampaign/CrmCampaignRequestModel.ts`

#### ICrmCampaignRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| bsnId | number | No |
| position | number | string | No |

Source: `src/model/crmCampaign/CrmCampaignRequestModel.ts`

#### ICrmCampaignResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| bsnId | number | No |
| position | number | No |

Source: `src/model/crmCampaign/CrmCampaignResponseModel.ts`

#### AddCrmCampaignModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICrmCampaignResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/crmCampaign/PropsModel.ts`


# Contract Module


## contract (`contract`)

**Service file:** `src/services/ContractService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contract/list` | src/services/ContractService.ts |  |
| detail | GET | `/adminapi/contract/get` | src/services/ContractService.ts |  |
| update | POST | `/adminapi/contract/update` | src/services/ContractService.ts |  |
| updateAndInit | POST | `/adminapi/contract/update-and-init` | src/services/ContractService.ts |  |
| delete | DELETE | `/adminapi/contract/delete` | src/services/ContractService.ts |  |
| updateAlert | POST | `/adminapi/contract/update/alert` | src/services/ContractService.ts |  |
| contractAlertUpdate | POST | `/adminapi/contractAlert/update` | src/services/ContractService.ts |  |
| contractAlertList | GET | `/adminapi/contractAlert/list` | src/services/ContractService.ts |  |
| guaranteeAlertUpdate | POST | `/adminapi/guaranteeAlert/update` | src/services/ContractService.ts |  |
| guaranteeAlertList | GET | `/adminapi/guaranteeAlert/list` | src/services/ContractService.ts |  |
| warrantyAlertUpdate | POST | `/adminapi/contractWarrantyAlert/update` | src/services/ContractService.ts |  |
| warrantyAlertList | GET | `/adminapi/contractWarrantyAlert/list` | src/services/ContractService.ts |  |
| contractAlertSpecific | POST | `/adminapi/contract/update/alert` | src/services/ContractService.ts |  |
| contractAlertListSpecific | GET | `/adminapi/contract/alert/get` | src/services/ContractService.ts |  |
| detailAlert | GET | `/adminapi/contract` | src/services/ContractService.ts |  |
| fieldTable | GET | `/adminapi/contractAttribute/listFilter` | src/services/ContractService.ts |  |
| updateApproach | POST | `/adminapi/contract/update/approach` | src/services/ContractService.ts |  |
| listCodeSuggest | GET | `/adminapi/contractRequest/list` | src/services/ContractService.ts |  |
| listCodeService | GET | `/adminapi/contract/products/select` | src/services/ContractService.ts |  |
| listSupplier | GET | `/adminapi/contract/suppliers/select` | src/services/ContractService.ts |  |
| updateHandover | POST | `/adminapi/contractItem/update` | src/services/ContractService.ts |  |
| updateHandoverProgress | POST | `/adminapi/contractHandover/update` | src/services/ContractService.ts |  |
| listHandoverProgress | GET | `/adminapi/contractHandover/list` | src/services/ContractService.ts |  |
| deleteHandoverProgress | DELETE | `/adminapi/contractHandover/delete` | src/services/ContractService.ts |  |
| contractAppendixList | GET | `/adminapi/contractAppendix/list` | src/services/ContractService.ts |  |
| contractAppendixDelete | DELETE | `/adminapi/contractAppendix/delete` | src/services/ContractService.ts |  |
| contractAppendixUpdate | POST | `/adminapi/contractAppendix/update` | src/services/ContractService.ts |  |
| contractAppendixDetail | GET | `/adminapi/contractAppendix/get` | src/services/ContractService.ts |  |
| contractExchange | GET | `/adminapi/contractExchange/list` | src/services/ContractService.ts |  |
| deleteContractExchange | DELETE | `/adminapi/contractExchange/delete` | src/services/ContractService.ts |  |
| addContractExchange | POST | `/adminapi/contractExchange/update` | src/services/ContractService.ts |  |
| updateContractExchange | POST | `/adminapi/contractExchange/get` | src/services/ContractService.ts |  |
| sendQuote | POST | `/adminapi/contract/email-quote` | src/services/ContractService.ts |  |
| sendContract | POST | `/adminapi/contract/email-contract` | src/services/ContractService.ts |  |
| exAttributes | GET | `/adminapi/contract/export/attributes` | src/services/ContractService.ts |  |
| numberFieldCustomer | POST | `/adminapi/contract/export/randomContracts` | src/services/ContractService.ts |  |
| autoProcess | POST | `/adminapi/contract/import/autoProcess` | src/services/ContractService.ts |  |
| downloadFile | GET | `/adminapi/contract/import` | src/services/ContractService.ts |  |
| reportContractStatus | GET | `/adminapi/contract/dashboard/byStatus` | src/services/ContractService.ts |  |
| reportContractContract | GET | `/adminapi/contract/dashboard/dealValueByCustomer` | src/services/ContractService.ts |  |
| reportNewContract | GET | `/adminapi/contract/dashboard/newByTime` | src/services/ContractService.ts |  |
| updateStatus | POST | `/adminapi/contract/update/status` | src/services/ContractService.ts |  |
| logValues | GET | `/adminapi/contract/logValues` | src/services/ContractService.ts |  |

### Related DTOs

#### IContractFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| pipelineId | number | Yes |
| approachId | number | Yes |
| customerId | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |
| fmtStartEndDate | any | Yes |
| fmtEndEndDate | any | Yes |

Source: `src/model/contract/ContractRequestModel.ts`

#### IContractFieldFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contract/ContractRequestModel.ts`

#### IContractRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| customerId | number | No |
| businessPartnerId | number | No |
| businessPartnerName | string | No |
| name | string | No |
| taxCode | string | No |
| contractNo | string | No |
| signDate | Date | string | No |
| affectedDate | Date | string | No |
| endDate | Date | string | No |
| adjustDate | Date | string | No |
| dealValue | number | string | No |
| employeeId | number | string | No |
| employeeName | string | Yes |
| categoryId | number | string | No |
| categoryName | string | No |
| pipelineId | number | string | No |
| pipelineName | string | No |
| stageId | number | No |
| stageName | string | No |
| branchId | number | No |
| bsnId | number | Yes |
| contractExtraInfos | any | Yes |
| timestamp | any | Yes |
| peopleInvolved | any | Yes |
| custType | number | Yes |
| projectId | number | Yes |
| projectName | string | Yes |
| fsId | number | Yes |
| fsName | string | Yes |
| floorId | number | Yes |
| floorName | string | Yes |
| unitId | number | Yes |
| unitName | string | Yes |
| blankArea | number | string | Yes |
| fillArea | number | string | Yes |
| nfaArea | number | string | Yes |
| actualArea | number | string | Yes |
| lobbyArea | number | string | Yes |
| totalArea | number | string | Yes |
| rentalTypes | any | Yes |
| rteId | number | Yes |
| rentalTypeName | string | Yes |
| rentalMonth | number | string | Yes |
| deliveryDate | Date | string | Yes |
| billStartDate | Date | string | Yes |
| unitPrice | number | string | Yes |
| lobbyUnitPrice | number | string | Yes |
| serviceUnitPrice | number | string | Yes |
| lobbyServiceUnitPrice | number | string | Yes |
| contractExchangeRate | number | string | Yes |
| deposit | number | string | Yes |
| template | string | Yes |
| requestId | number | Yes |
| requestCode | string | Yes |
| products | any | Yes |
| opportunityId | number | Yes |

Source: `src/model/contract/ContractRequestModel.ts`

#### IContractAlertRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| endDate | any | No |
| alertConfig | any | No |

Source: `src/model/contract/ContractRequestModel.ts`

#### IContractResponse

| Field | Type | Optional |
|-------|------|----------|
| stageName | any | No |
| id | number | No |
| name | string | No |
| taxCode | string | No |
| contractNo | string | No |
| signDate | string | No |
| affectedDate | string | No |
| endDate | string | No |
| createdAt | string | No |
| dealValue | number | string | No |
| bsnId | number | No |
| stage | string | No |
| pipelineName | string | No |
| pipelineId | number | No |
| approachId | number | No |
| approachName | string | No |
| customerId | number | No |
| customerName | string | No |
| businessPartnerName | string | No |
| employeeId | number | No |
| employeeName | string | No |
| branchId | number | No |
| contractExtraInfos | any | No |
| status | any | No |
| categoryName | AnalyserOptions | No |

Source: `src/model/contract/ContractResponseModel.ts`


## contractAttachment (`contractAttachment`)

**Service file:** `src/services/ContractAttachmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/attachment/list` | src/services/ContractAttachmentService.ts |  |
| update | POST | `/adminapi/attachment/update` | src/services/ContractAttachmentService.ts |  |
| detail | GET | `/adminapi/attachment/get` | src/services/ContractAttachmentService.ts |  |
| delete | DELETE | `/adminapi/attachment/delete` | src/services/ContractAttachmentService.ts |  |
| contractAttachmentList | GET | `/adminapi/contractAttachment/list` | src/services/ContractAttachmentService.ts |  |
| contractAttachmentUpdate | POST | `/adminapi/contractAttachment/update` | src/services/ContractAttachmentService.ts |  |
| contractAttachmentDetail | GET | `/adminapi/contractAttachment/get` | src/services/ContractAttachmentService.ts |  |
| contractAttachmentDelete | DELETE | `/adminapi/contractAttachment/delete` | src/services/ContractAttachmentService.ts |  |

## contractAttribute (`contractAttribute`)

**Service file:** `src/services/ContractAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractAttribute/list` | src/services/ContractAttributeService.ts |  |
| update | POST | `/adminapi/contractAttribute/update` | src/services/ContractAttributeService.ts |  |
| delete | DELETE | `/adminapi/contractAttribute/delete` | src/services/ContractAttributeService.ts |  |
| listAll | GET | `/adminapi/contractAttribute/listAll` | src/services/ContractAttributeService.ts |  |
| checkDuplicated | POST | `/adminapi/contractAttribute/checkDuplicated` | src/services/ContractAttributeService.ts |  |

### Related DTOs

#### AddContractAttributeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| dataContractAttribute | IContractAttributeResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contractAttribute/PropsModel.ts`

#### IContractAttributeListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/contractAttribute/PropsModel.ts`


## contractCategory (`contractCategory`)

**Service file:** `src/services/ContractCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractCategory/list` | src/services/ContractCategoryService.ts |  |
| update | POST | `/adminapi/contractCategory/update` | src/services/ContractCategoryService.ts |  |
| detail | GET | `/adminapi/contractCategory/get` | src/services/ContractCategoryService.ts |  |
| delete | DELETE | `/adminapi/contractCategory/delete` | src/services/ContractCategoryService.ts |  |

## contractEform (`contractEform`)

**Service file:** `src/services/ContractEformService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| listEformExtraInfo | GET | `/adminapi/eformExtraInfo/list` | src/services/ContractEformService.ts |  |
| updateEformExtraInfo | POST | `/adminapi/eformExtraInfo/update` | src/services/ContractEformService.ts |  |
| updateEformExtraInfoPosition | POST | `/adminapi/eformExtraInfo/update/position` | src/services/ContractEformService.ts |  |
| detailEformExtraInfo | GET | `/adminapi/eformExtraInfo/get` | src/services/ContractEformService.ts |  |
| deleteEformExtraInfo | DELETE | `/adminapi/eformExtraInfo/delete` | src/services/ContractEformService.ts |  |
| listEformAttribute | GET | `/adminapi/eformAttribute/list` | src/services/ContractEformService.ts |  |
| updateEformAttribute | POST | `/adminapi/eformAttribute/update` | src/services/ContractEformService.ts |  |
| detailEformAttribute | GET | `/adminapi/eformAttribute/get` | src/services/ContractEformService.ts |  |
| deleteEformAttribute | DELETE | `/adminapi/eformAttribute/delete` | src/services/ContractEformService.ts |  |
| listEformAttributeAll | GET | `/adminapi/eformAttribute/listAll` | src/services/ContractEformService.ts |  |
| checkDuplicated | POST | `/adminapi/eformAttribute/checkDuplicated` | src/services/ContractEformService.ts |  |
| contractEformUpdate | POST | `/adminapi/contractEform/update` | src/services/ContractEformService.ts |  |
| contractEformDetail | GET | `/adminapi/contractEform/get/criteria` | src/services/ContractEformService.ts |  |

## contractExtraInfo (`contractExtraInfo`)

**Service file:** `src/services/ContractExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractExtraInfo/list` | src/services/ContractExtraInfoService.ts |  |

## contractGuarantee (`contractGuarantee`)

**Service file:** `src/services/ContractGuaranteeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/guarantee/list` | src/services/ContractGuaranteeService.ts |  |
| update | POST | `/adminapi/guarantee/update` | src/services/ContractGuaranteeService.ts |  |
| detail | GET | `/adminapi/guarantee/get` | src/services/ContractGuaranteeService.ts |  |
| delete | DELETE | `/adminapi/guarantee/delete` | src/services/ContractGuaranteeService.ts |  |
| guaranteeTypeList | GET | `/adminapi/guaranteeType/list` | src/services/ContractGuaranteeService.ts |  |
| guaranteeTypeUpdate | POST | `/adminapi/guaranteeType/update` | src/services/ContractGuaranteeService.ts |  |
| guaranteeTypeDelete | DELETE | `/adminapi/guaranteeType/delete` | src/services/ContractGuaranteeService.ts |  |
| competencyList | GET | `/adminapi/competency/list` | src/services/ContractGuaranteeService.ts |  |
| competencyUpdate | POST | `/adminapi/competency/update` | src/services/ContractGuaranteeService.ts |  |
| competencyDelete | DELETE | `/adminapi/competency/delete` | src/services/ContractGuaranteeService.ts |  |
| bankList | GET | `/adminapi/bank/list` | src/services/ContractGuaranteeService.ts |  |
| bankUpdate | POST | `/adminapi/bank/update` | src/services/ContractGuaranteeService.ts |  |
| bankDelete | DELETE | `/adminapi/bank/delete` | src/services/ContractGuaranteeService.ts |  |
| exAttributes | GET | `/adminapi/guarantee/export/attributes` | src/services/ContractGuaranteeService.ts |  |
| numberFieldGuarantee | POST | `/adminapi/guarantee/export/randomGuarantees` | src/services/ContractGuaranteeService.ts |  |
| autoProcess | POST | `/adminapi/guarantee/import/autoProcess` | src/services/ContractGuaranteeService.ts |  |
| downloadFile | GET | `/adminapi/guarantee/import` | src/services/ContractGuaranteeService.ts |  |

## contractPayment (`contractPayment`)

**Service file:** `src/services/ContractPaymentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractPayment/list` | src/services/ContractPaymentService.ts |  |
| update | POST | `/adminapi/contractPayment/update` | src/services/ContractPaymentService.ts |  |
| detail | GET | `/adminapi/contractPayment/get` | src/services/ContractPaymentService.ts |  |
| delete | DELETE | `/adminapi/contractPayment/delete` | src/services/ContractPaymentService.ts |  |

## contractPipeline (`contractPipeline`)

**Service file:** `src/services/ContractPipelineService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractPipeline/list` | src/services/ContractPipelineService.ts |  |
| update | POST | `/adminapi/contractPipeline/update` | src/services/ContractPipelineService.ts |  |
| detail | GET | `/adminapi/contractPipeline/get` | src/services/ContractPipelineService.ts |  |
| delete | DELETE | `/adminapi/contractPipeline/delete` | src/services/ContractPipelineService.ts |  |
| contractSubPipelineUpdate | POST | `/adminapi/contractSubPipeline/update` | src/services/ContractPipelineService.ts |  |

### Related DTOs

#### IContractPipelineFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contractPipeline/ContractPipelineRequestModel.ts`

#### IContractPipelineRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |

Source: `src/model/contractPipeline/ContractPipelineRequestModel.ts`

#### IContractPipelineResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |
| bsnId | number | Yes |

Source: `src/model/contractPipeline/ContractPipelineResponseModel.ts`

#### AddContractPipelineModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IContractPipelineResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contractPipeline/PropsModel.ts`

#### IContractPipelineListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/contractPipeline/PropsModel.ts`


## contractProduct (`contractProduct`)

**Service file:** `src/services/ContractProductService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/project/list` | - |  |
| update | POST | `/adminapi/project/update` | - |  |
| detail | GET | `/adminapi/project/get` | - |  |
| delete | DELETE | `/adminapi/project/delete` | - |  |
| update_investor | POST | `/adminapi/investor/update` | - |  |
| detail_investor | GET | `/adminapi/investor/get` | - |  |

### Related DTOs

#### IContractProductResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| nfaArea | number | No |
| address | string | No |
| fillArea | number | No |
| blankArea | number | No |

Source: `src/model/contractProduct/ContractProductResponseModel.ts`

#### AddContractProductModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IContractProductResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contractProduct/PropsModel.ts`

#### IContractProductListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/contractProduct/PropsModel.ts`


## warranty (`warranty`)

**Service file:** `src/services/WarrantyService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/warranty/list` | src/services/WarrantyService.ts |  |
| update | POST | `/adminapi/warranty/update` | src/services/WarrantyService.ts |  |
| detail | GET | `/adminapi/warranty/get` | src/services/WarrantyService.ts |  |
| delete | DELETE | `/adminapi/warranty/delete` | src/services/WarrantyService.ts |  |
| collect | POST | `/adminapi/warranty/send/jssdk` | src/services/WarrantyService.ts |  |
| overview | GET | `/adminapi/warranty/get/overview` | src/services/WarrantyService.ts |  |
| viewer | GET | `/adminapi/warranty/viewer` | src/services/WarrantyService.ts |  |
| updateStatus | POST | `/adminapi/warranty/update/status` | src/services/WarrantyService.ts |  |
| warrantyExchangeUpdate | POST | `/adminapi/warrantyExchange/update` | src/services/WarrantyService.ts |  |
| warrantyExchangeDelete | DELETE | `/adminapi/warrantyExchange/delete` | src/services/WarrantyService.ts |  |
| warrantyExchangeList | GET | `/adminapi/warrantyExchange/list` | src/services/WarrantyService.ts |  |
| warrantyProcess | POST | `/adminapi/warrantyProcess/update` | src/services/WarrantyService.ts |  |
| resetTransferVotes | POST | `/adminapi/supportObject/reset` | src/services/WarrantyService.ts |  |

### Related DTOs

#### IWarrantyListProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |

Source: `src/model/customer/PropsModel.ts`

#### IAddWarrantyModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IWarrantyResponseModel | Yes |
| idCustomer | number | Yes |
| onHide | (reload: boolean) => void | No |
| saleflowId | number | Yes |
| sieId | number | Yes |

Source: `src/model/warranty/PropsModel.ts`

#### IViewStatusWarrantyModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idWarranty | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/warranty/PropsModel.ts`

#### IInfoCustomerWarrantyProps

| Field | Type | Optional |
|-------|------|----------|
| data | IWarrantyResponseModel | No |

Source: `src/model/warranty/PropsModel.ts`

#### IViewInfoWarrantyProps

| Field | Type | Optional |
|-------|------|----------|
| data | IWarrantyResponseModel | No |
| infoApproved | any | No |
| onReload | (reload: boolean) => void | No |
| takeBlockRight | (reload: number) => void | No |

Source: `src/model/warranty/PropsModel.ts`


## warrantyCategory (`warrantyCategory`)

**Service file:** `src/services/WarrantyCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/warrantyCategory/list` | src/services/WarrantyCategoryService.ts |  |
| update | POST | `/adminapi/warrantyCategory/update` | src/services/WarrantyCategoryService.ts |  |
| detail | GET | `/adminapi/warrantyCategory/get` | src/services/WarrantyCategoryService.ts |  |
| delete | DELETE | `/adminapi/warrantyCategory/delete` | src/services/WarrantyCategoryService.ts |  |

### Related DTOs

#### IWarrantyCategoryRequestModel

| Field | Type | Optional |
|-------|------|----------|
| type | number | No |

Source: `src/model/warranty/WarrantyRequestModel.ts`

#### IWarrantyCategoryListResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| type | number | No |
| bsnId | number | No |

Source: `src/model/warranty/WarrantyResponseModel.ts`

#### IWarrantyCategoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |

Source: `src/model/warrantyCategory/WarrantyCategoryRequestModel.ts`

#### IWarrantyCategoryRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| position | string | number | No |

Source: `src/model/warrantyCategory/WarrantyCategoryRequestModel.ts`

#### IWarrantyCategoryResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| type | number | No |
| bsnId | number | No |
| status | any | No |

Source: `src/model/warrantyCategory/WarrantyCategoryResponseModel.ts`


## warrantyProc (`warrantyProc`)

**Service file:** `src/services/WarrantyProcService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/support/list` | src/services/WarrantyProcService.ts |  |
| update | POST | `/adminapi/support/update` | src/services/WarrantyProcService.ts |  |
| detail | GET | `/adminapi/support/get` | src/services/WarrantyProcService.ts |  |
| delete | DELETE | `/adminapi/support/delete` | src/services/WarrantyProcService.ts |  |

### Related DTOs

#### IWarrantyProcessRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| executorId | number | No |
| completionTime | string | Yes |
| statusId | number | No |
| warrantyId | number | Yes |

Source: `src/model/warranty/WarrantyRequestModel.ts`

#### IAddWarrantyProcModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IWarrantyProcResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/warrantyProc/PropsModel.ts`

#### IWarrantyProcFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/warrantyProc/WarrantyProcRequestModel.ts`

#### IWarrantyProcRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| position | string | number | No |

Source: `src/model/warrantyProc/WarrantyProcRequestModel.ts`

#### IWarrantyProcResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| type | number | No |
| bsnId | number | No |

Source: `src/model/warrantyProc/WarrantyProcResponseModel.ts`


## warrantyStep (`warrantyStep`)

**Service file:** `src/services/WarrantyStepService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/warrantyStep/list` | src/services/WarrantyStepService.ts |  |
| update | POST | `/adminapi/warrantyStep/update` | src/services/WarrantyStepService.ts |  |
| detail | GET | `/adminapi/warrantyStep/get` | src/services/WarrantyStepService.ts |  |
| delete | DELETE | `/adminapi/warrantyStep/delete` | src/services/WarrantyStepService.ts |  |

### Related DTOs

#### IAddWarrantyStepModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IWarrantyStepResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/warrantyStep/PropsModel.ts`

#### IWarrantyStepFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| procId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/warrantyStep/WarrantyStepRequestModel.ts`

#### IWarrantyStepRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| departmentId | number | Yes |
| period | number | Yes |
| unit | string | Yes |
| prevId | number | Yes |
| procId | number | Yes |
| divisionMethod | number | Yes |

Source: `src/model/warrantyStep/WarrantyStepRequestModel.ts`

#### IWarrantyStepResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| departmentId | number | Yes |
| period | number | Yes |
| unit | string | Yes |
| prevId | number | Yes |
| procId | number | Yes |
| departmentName | string | Yes |
| prevDepartmentName | string | Yes |
| divisionMethod | string | Yes |

Source: `src/model/warrantyStep/WarrantyStepResponseModel.ts`


# Project Module


## categoryProject (`categoryProject`)

**Service file:** `src/services/CategoryProjectService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/projectType/list` | src/services/CategoryProjectService.ts |  |
| update | POST | `/adminapi/projectType/update` | src/services/CategoryProjectService.ts |  |
| detail | GET | `/adminapi/projectType/get` | src/services/CategoryProjectService.ts |  |
| delete | DELETE | `/adminapi/projectType/delete` | src/services/CategoryProjectService.ts |  |

## operationProject (`operationProject`)

**Service file:** `src/services/OperationProjectService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/project/list` | src/services/OperationProjectService.ts |  |
| update | POST | `https://mock.local/operation/project/update` | src/services/OperationProjectService.ts |  |
| detail | GET | `https://mock.local/operation/project/get` | src/services/OperationProjectService.ts |  |
| delete | DELETE | `https://mock.local/operation/project/delete` | src/services/OperationProjectService.ts |  |

## project (`project`)

**Service file:** `src/services/ProjectService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/workProject/list` | src/services/ProjectService.ts |  |
| update | POST | `/adminapi/workProject/update` | src/services/ProjectService.ts |  |
| detail | GET | `/adminapi/workProject/get` | src/services/ProjectService.ts |  |
| delete | DELETE | `/adminapi/workProject/delete` | src/services/ProjectService.ts |  |

### Related DTOs

#### IAddWorkProjectModalProps

| Field | Type | Optional |
|-------|------|----------|
| startDate | any | No |
| endDate | any | Yes |
| onShow | boolean | No |
| idData | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/workProject/PropsModel.ts`

#### IViewProjectManagementModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idProjectManagement | number | No |
| idOptManagement | number | Yes |
| onHide | () => void | No |

Source: `src/model/workProject/PropsModel.ts`

#### IProjectManagementListProps

| Field | Type | Optional |
|-------|------|----------|
| setType | any | No |
| isFullPage | boolean | No |
| isRegimeKanban | boolean | No |
| idProjectManagement | number | No |
| setIdProjectManagement | any | No |

Source: `src/model/workProject/PropsModel.ts`

#### IProjectManagementItemProps

| Field | Type | Optional |
|-------|------|----------|
| data | IWorkProjectResponseModel | No |
| isShowChildrenProject | boolean | No |
| setIsShowChildrenProject | any | No |
| idProjectManagement | number | No |
| setIdProjectManagement | any | No |
| setShowModalAdd | any | No |
| showDialogConfirmDelete | any | No |
| onReload | (reload: boolean) => void | No |

Source: `src/model/workProject/PropsModel.ts`

#### IAddChildProjectModal

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idProject | number | No |
| idProjectManagement | number | Yes |
| callBack | (reload: boolean) => void | No |

Source: `src/model/workProject/PropsModel.ts`


## projectCatalog (`projectCatalog`)

**Service file:** `src/services/ProjectCatalogService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/projectCatalog/list` | src/services/ProjectCatalogService.ts |  |
| update | POST | `/application/projectCatalog/update` | src/services/ProjectCatalogService.ts |  |
| updateStatus | POST | `/application/projectCatalog/update/status` | src/services/ProjectCatalogService.ts |  |
| detail | GET | `/application/projectCatalog/get` | src/services/ProjectCatalogService.ts |  |
| delete | DELETE | `/application/projectCatalog/delete` | src/services/ProjectCatalogService.ts |  |

## workCategory (`workCategory`)

**Service file:** `src/services/WorkCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/workCategory/list` | src/services/WorkCategoryService.ts |  |
| update | POST | `/application/workCategory/update` | src/services/WorkCategoryService.ts |  |
| updateStatus | POST | `/application/workCategory/update/active` | src/services/WorkCategoryService.ts |  |
| detail | GET | `/application/workCategory/get` | src/services/WorkCategoryService.ts |  |
| delete | DELETE | `/application/workCategory/delete` | src/services/WorkCategoryService.ts |  |

## workProject (`workProject`)

**Service file:** `src/services/WorkProjectService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/workProject/list` | src/services/WorkProjectService.ts |  |
| update | POST | `/adminapi/workProject/update` | src/services/WorkProjectService.ts |  |
| detail | GET | `/adminapi/workProject/get` | src/services/WorkProjectService.ts |  |
| delete | DELETE | `/adminapi/workProject/delete` | src/services/WorkProjectService.ts |  |

### Related DTOs

#### IAddWorkProjectModalProps

| Field | Type | Optional |
|-------|------|----------|
| startDate | any | No |
| endDate | any | Yes |
| onShow | boolean | No |
| idData | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/workProject/PropsModel.ts`

#### IWorkProjectFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| parentId | number | Yes |
| active | number | Yes |
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |
| employeeId | number | Yes |
| customerId | string | Yes |

Source: `src/model/workProject/WorkProjectRequestModel.ts`

#### IWorkProjectRequestModel

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| code | string | No |
| startTime | string | No |
| endTime | string | No |
| description | string | No |
| participants | string | No |
| employeeId | number | No |
| departmentId | number | No |
| docLink | string | No |
| parentId | number | No |
| projectTypes | any | No |

Source: `src/model/workProject/WorkProjectRequestModel.ts`

#### IWorkProjectResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | No |
| startTime | Date | string | No |
| endTime | Date | string | No |
| description | string | No |
| participants | string | No |
| employeeId | number | No |
| departmentId | number | No |
| docLink | string | No |
| parentId | number | No |
| bsnId | number | Yes |
| lstParticipant | IlstParticipantProps[] | Yes |
| projectTypes | any | Yes |
| lstProjectType | any | Yes |

Source: `src/model/workProject/WorkProjectResponseModel.ts`


## workType (`workType`)

**Service file:** `src/services/WorkTypeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/workType/list` | src/services/WorkTypeService.ts |  |
| update | POST | `/adminapi/workType/update` | src/services/WorkTypeService.ts |  |
| detail | GET | `/adminapi/workType/get` | src/services/WorkTypeService.ts |  |
| delete | DELETE | `/adminapi/workType/delete` | src/services/WorkTypeService.ts |  |

### Related DTOs

#### IAddWorkTypeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IWorkTypeResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/workType/PropsModel.ts`

#### IWorkTypeFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/workType/WorkTypeRequestModel.ts`

#### IWorkTypeRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |

Source: `src/model/workType/WorkTypeRequestModel.ts`

#### IWorkTypeResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| createdTime | string | No |

Source: `src/model/workType/WorkTypeResponseModel.ts`


# BPM Module


## approval (`approval`)

**Service file:** `src/services/ApprovalService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/approval/list` | src/services/ApprovalService.ts |  |
| update | POST | `/adminapi/approval/update` | src/services/ApprovalService.ts |  |
| delete | DELETE | `/adminapi/approval/delete` | src/services/ApprovalService.ts |  |
| updateStatus | POST | `/adminapi/approval/update/status` | src/services/ApprovalService.ts |  |
| lstConfig | GET | `/adminapi/approvalConfig/list` | src/services/ApprovalService.ts |  |
| updateConfig | POST | `/adminapi/approvalConfig/update` | src/services/ApprovalService.ts |  |
| deleteConfig | DELETE | `/adminapi/approvalConfig/delete` | src/services/ApprovalService.ts |  |
| lstLink | POST | `/adminapi/approvalLink/list` | src/services/ApprovalService.ts |  |
| updateLink | POST | `/adminapi/approvalLink/update` | src/services/ApprovalService.ts |  |
| deleteLink | DELETE | `/adminapi/approvalLink/delete` | src/services/ApprovalService.ts |  |
| lstObject | GET | `/adminapi/approvalObject/list` | src/services/ApprovalService.ts |  |
| updateObject | POST | `/adminapi/approvalObject/update` | src/services/ApprovalService.ts |  |
| deleteObject | DELETE | `/adminapi/approvalObject/delete` | src/services/ApprovalService.ts |  |
| takeObject | GET | `/adminapi/approvalObject/get/object` | src/services/ApprovalService.ts |  |
| checkApproved | POST | `/adminapi/approvalObject/checkApproved` | src/services/ApprovalService.ts |  |
| lstLog | GET | `/adminapi/approvalLog/list` | src/services/ApprovalService.ts |  |
| updateLog | POST | `/adminapi/approvalLog/update` | src/services/ApprovalService.ts |  |
| deleteLog | DELETE | `/adminapi/approvalLog/delete` | src/services/ApprovalService.ts |  |
| updateAlert | POST | `/adminapi/approval/update/alertConfig` | src/services/ApprovalService.ts |  |

## bpmEformMapping (`bpmEformMapping`)

**Service file:** `src/services/BpmEformMappingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lstEform | GET | `/adminapi/bpm/list/eform` | src/services/BpmEformMappingService.ts |  |

## businessProcess (`businessProcess`)

**Service file:** `src/services/BusinessProcessService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| listWorkflowCloud | GET | `/adminapi/workflowStatus/list` | src/services/BusinessProcessService.ts |  |

## grid (`grid`)

**Service file:** `src/services/GridService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/artifactGridHeader/list` | src/services/GridService.ts |  |

## manageDefaultProcesses (`manageDefaultProcesses`)

**Service file:** `src/services/ManageDefaultProcessesService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/process-permission/list` | src/services/ManageDefaultProcessesService.ts |  |
| update | POST | `/adminapi/process-permission/update` | src/services/ManageDefaultProcessesService.ts |  |
| detail | GET | `/adminapi/process-permission/get` | src/services/ManageDefaultProcessesService.ts |  |
| delete | DELETE | `/adminapi/process-permission/delete` | src/services/ManageDefaultProcessesService.ts |  |

## objectExtraInfo (`objectExtraInfo`)

**Service file:** `src/services/ObjectExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/objectExtraInfo/list` | src/services/ObjectExtraInfoService.ts |  |

## objectFeature (`objectFeature`)

**Service file:** `src/services/ObjectFeatureService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/objectFeature/list` | src/services/ObjectFeatureService.ts |  |
| update | POST | `/adminapi/objectFeature/update` | src/services/ObjectFeatureService.ts |  |
| delete | DELETE | `/adminapi/objectFeature/delete` | src/services/ObjectFeatureService.ts |  |
| detail | GET | `/adminapi/objectFeature/detail` | src/services/ObjectFeatureService.ts |  |

## placeholder (`placeholder`)

**Service file:** `src/services/PlaceholderService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| contractWarranty | GET | `/adminapi/contractWarranty/placeholder` | src/services/PlaceholderService.ts | placeholder Bảo hành |
| guarantee | GET | `/adminapi/guarantee/placeholder` | src/services/PlaceholderService.ts | placeholder Bảo lãnh |
| contract | GET | `/adminapi/contract/placeholder` | src/services/PlaceholderService.ts | placeholder Hợp đồng |
| customer | GET | `/adminapi/customer/placeholder` | src/services/PlaceholderService.ts | placeholder Khách hàng |
| contact | GET | `/adminapi/contact/placeholder ` | src/services/PlaceholderService.ts | placeholder Người liên hệ |

### Related DTOs

#### ICustomPlaceholderRequest

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| codes | [] | No |

Source: `src/model/customPlaceholder/CustomPlaceholderRequestModel.ts`

#### ICustomPlaceholderResponse

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| codes | string [] | No |

Source: `src/model/customPlaceholder/CustomPlaceholderResponseModel.ts`

#### ICustomPlaceholderModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICustomPlaceholderResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/customPlaceholder/PropsModel.ts`


## userTask (`userTask`)

**Service file:** `src/services/UserTaskService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| delete | DELETE | `/adminapi/workOrder/delete` | src/services/UserTaskService.ts |  |
| relatedPeople | GET | `/adminapi/workOrder/get/related_people` | src/services/UserTaskService.ts |  |
| updateOtherWorkOrder | POST | `/adminapi/workOrder/update/other_work_order` | src/services/UserTaskService.ts |  |
| getOtherWorkOrder | GET | `/adminapi/workOrder/get/other_work_order` | src/services/UserTaskService.ts |  |
| updateWorkInprogress | POST | `/sale/workInprogress/update` | src/services/UserTaskService.ts |  |
| getWorkInprogress | GET | `/sale/workInprogress/get` | src/services/UserTaskService.ts |  |
| getWorkInprogressList | GET | `/sale/workInprogress/list` | src/services/UserTaskService.ts |  |
| employeeManagers | GET | `/system/employee/managers` | src/services/UserTaskService.ts |  |
| employeeAssignees | POST | `/system/employee/assignees` | src/services/UserTaskService.ts |  |
| workExchange | GET | `/sale/workExchange/list` | src/services/UserTaskService.ts |  |
| workReport | GET | `/adminapi/workOrder/report` | src/services/UserTaskService.ts |  |
| deleteWorkExchange | DELETE | `/sale/workExchange/delete` | src/services/UserTaskService.ts |  |
| updateWorkExchange | POST | `/sale/workExchange/get` | src/services/UserTaskService.ts |  |
| exportOLA | POST | `/adminapi/ola/export` | src/services/UserTaskService.ts |  |
| exportSLA | POST | `/adminapi/sla/export` | src/services/UserTaskService.ts |  |

## webhook (`webhook`)

**Service file:** `src/services/WebhookService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/webhook/list` | src/services/WebhookService.ts |  |
| update | POST | `/adminapi/webhook/update` | src/services/WebhookService.ts |  |
| delete | DELETE | `/adminapi/webhook/delete` | src/services/WebhookService.ts |  |
| detail | GET | `/adminapi/webhook/get` | src/services/WebhookService.ts |  |

## workOrder (`workOrder`)

**Service file:** `src/services/WorkOrderService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/workOrder/list` | src/services/WorkOrderService.ts |  |
| listV2 | GET | `/adminapi/workOrder/listV2` | src/services/WorkOrderService.ts |  |
| groups | GET | `/adminapi/workOrder/groups` | src/services/WorkOrderService.ts |  |
| groupsV2 | GET | `/adminapi/workOrder/groupsV2` | src/services/WorkOrderService.ts |  |
| update | POST | `/adminapi/workOrder/update` | src/services/WorkOrderService.ts |  |
| updateAndInit | POST | `/adminapi/workOrder/save-and-init-process` | src/services/WorkOrderService.ts |  |
| updateInitProcess | POST | `/adminapi/workOrder/update-init-process` | src/services/WorkOrderService.ts |  |
| updateEmployee | POST | `/adminapi/workOrder/update/employee` | src/services/WorkOrderService.ts |  |
| updatePause | POST | `/adminapi/workOrder/update/pause` | src/services/WorkOrderService.ts |  |
| listPause | GET | `/adminapi/workOrder/list/pause` | src/services/WorkOrderService.ts |  |
| updateReject | POST | `/adminapi/bpmForm/reject` | src/services/WorkOrderService.ts |  |
| detail | GET | `/adminapi/workOrder/get` | src/services/WorkOrderService.ts |  |
| delete | DELETE | `/adminapi/workOrder/delete` | src/services/WorkOrderService.ts |  |
| relatedPeople | GET | `/adminapi/workOrder/get/related_people` | src/services/WorkOrderService.ts |  |
| updateParticipant | POST | `/adminapi/workOrder/update/participant` | src/services/WorkOrderService.ts |  |
| updateCustomer | POST | `/adminapi/workOrder/update/customer` | src/services/WorkOrderService.ts |  |
| updateOtherWorkOrder | POST | `/adminapi/workOrder/update/other_work_order` | src/services/WorkOrderService.ts |  |
| getOtherWorkOrder | GET | `/adminapi/workOrder/get/other_work_order` | src/services/WorkOrderService.ts |  |
| updateWorkInprogress | POST | `/adminapi/workInprogress/update` | src/services/WorkOrderService.ts |  |
| getWorkInprogress | GET | `/adminapi/workInprogress/get` | src/services/WorkOrderService.ts |  |
| getWorkInprogressList | GET | `/adminapi/workInprogress/list` | src/services/WorkOrderService.ts |  |
| updateStatus | POST | `/adminapi/workOrder/update/status` | src/services/WorkOrderService.ts |  |
| employeeManagers | GET | `/adminapi/employee/managers` | src/services/WorkOrderService.ts |  |
| employeeAssignees | POST | `/adminapi/employee/assignees` | src/services/WorkOrderService.ts |  |
| projectEmployeeAssignees | POST | `/adminapi/workProject/getEmployees` | src/services/WorkOrderService.ts |  |
| workExchange | GET | `/adminapi/workExchange/list` | src/services/WorkOrderService.ts |  |
| deleteWorkExchange | DELETE | `/adminapi/workExchange/delete` | src/services/WorkOrderService.ts |  |
| addWorkExchange | POST | `/adminapi/workExchange/update` | src/services/WorkOrderService.ts |  |
| updateWorkExchange | POST | `/adminapi/workExchange/get` | src/services/WorkOrderService.ts |  |
| updateRating | POST | `/adminapi/workOrder/update/review` | src/services/WorkOrderService.ts |  |
| updatePriorityLevel | POST | `/adminapi/workOrder/update/priorityLevel` | src/services/WorkOrderService.ts |  |
| assignNegotiationWork | POST | `/application/workAssignment` | src/services/WorkOrderService.ts |  |
| getNegotiationWork | GET | `/application/workAssignment` | src/services/WorkOrderService.ts |  |
| saveNegotiationWork | PUT | `/application/negotiationBidderDetail` | src/services/WorkOrderService.ts |  |
| completeNegotiationWork | POST | `/application/negotiationBidderDetail/complete` | src/services/WorkOrderService.ts |  |

### Related DTOs

#### ITableWorkOrderProps

| Field | Type | Optional |
|-------|------|----------|
| listSaveSearch | any | No |
| customerFilterList | any | No |
| params | IWorkOrderFilterRequest | No |
| setParams | any | No |
| titles | any | No |
| listWork | IWorkOrderResponseModel[] | No |
| pagination | any | No |
| dataMappingArray | any | No |
| dataFormat | any | No |
| listIdChecked | number[] | No |
| setListIdChecked | any | No |
| bulkActionList | any | No |
| actionsTable | any | No |
| isLoading | boolean | No |
| setIdWork | any | No |
| setShowModalAdd | any | No |
| isNoItem | boolean | No |

Source: `src/model/workOrder/PropsModel.ts`

#### IWorkOrderFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| departmentId | number | Yes |
| workType | string | Yes |
| opportunityId | number | Yes |
| projectId | number | Yes |
| status | number | Yes |
| name | string | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| type | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| potId | number | Yes |
| processId | number | Yes |
| employeeId | number | Yes |
| participantId | number | Yes |
| isPriority | number | Yes |
| biddingName | any | Yes |
| filters | any | Yes |

Source: `src/model/workOrder/WorkOrderRequestModel.ts`

#### IWorkOrderRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| content | string | No |
| contentDelta | string | No |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | Yes |
| wteId | number | No |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| managerId | number | No |
| employeeId | number | No |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | string | number | No |
| notification | string | No |
| creatorId | number | Yes |

Source: `src/model/workOrder/WorkOrderRequestModel.ts`

#### IWorkOrderResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| content | string | No |
| contentDelta | string | Yes |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | No |
| wteId | number | No |
| workTypeName | string | Yes |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| projectName | string | Yes |
| opportunityName | string | Yes |
| managerId | number | No |
| managerName | string | Yes |
| managerAvatar | string | Yes |
| employeeId | number | No |
| employeeName | number | Yes |
| employeeAvatar | number | Yes |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | number | No |
| lstParticipant | any[] | Yes |
| lstCustomer | any[] | Yes |
| notification | string | No |
| reviews | string | Yes |
| nodeName | string | Yes |
| iteration | number | Yes |
| scope | string | Yes |
| taskType | string | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`

#### IWorkOrderDocFile

| Field | Type | Optional |
|-------|------|----------|
| url | string | No |
| type | string | Yes |
| name | string | Yes |
| size | number | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`


# KPI Module


## kpi (`kpi`)

**Service file:** `src/services/KpiService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpi/list` | src/services/KpiService.ts |  |
| update | POST | `/adminapi/kpi/update` | src/services/KpiService.ts |  |
| delete | DELETE | `/adminapi/kpi/delete` | src/services/KpiService.ts |  |
| checkKpiCampaign | POST | `/adminapi/kpiApply/get/byCampaignId` | src/services/KpiService.ts |  |
| updateKpi | POST | `/adminapi/campaign/update/kpi` | src/services/KpiService.ts |  |
| listEmployeeKpi | GET | `/adminapi/kpiObject/list` | src/services/KpiService.ts |  |
| addEmployeeToKpi | GET | `/adminapi/kpiObject/get/byObject` | src/services/KpiService.ts |  |
| listGoalKpiEmployee | GET | `/adminapi/kpiSetupObject/list/byKotId` | src/services/KpiService.ts |  |
| saveKpiEmployee | POST | `/adminapi/kpiSetupObject/update/web` | src/services/KpiService.ts |  |
| deleteEmployeeKpi | DELETE | `/adminapi/kpiObject/delete` | src/services/KpiService.ts |  |
| addEmployeeToKpiContact | GET | `/adminapi/campaignSale/interaction/kpis` | src/services/KpiService.ts |  |
| saveKpiContactEmployee | POST | `/adminapi/campaignSale/interaction/kpis` | src/services/KpiService.ts |  |
| listEmployeeKpiContact | GET | `/adminapi/campaignSale/interaction/employee` | src/services/KpiService.ts |  |
| deleteEmployeeKpiContact | DELETE | `/adminapi/campaignSale/interaction/kpis` | src/services/KpiService.ts |  |

### Related DTOs

#### IKpiFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpi/KpiRequestModel.ts`

#### IKpiRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| description | string | No |

Source: `src/model/kpi/KpiRequestModel.ts`

#### IKpiResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| description | string | No |
| startDate | any | No |
| endDate | any | No |
| branchId | number | Yes |

Source: `src/model/kpi/KpiResponseModel.ts`

#### IAddKpiModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpi/PropsModel.ts`

#### IKpiApplyFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiApply/KpiApplyRequestModel.ts`


## kpiApply (`kpiApply`)

**Service file:** `src/services/KpiApplyService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiApply/list` | src/services/KpiApplyService.ts |  |
| update | POST | `/adminapi/kpiApply/update` | src/services/KpiApplyService.ts |  |
| delete | DELETE | `/adminapi/kpiApply/delete` | src/services/KpiApplyService.ts |  |

### Related DTOs

#### IKpiApplyFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiApply/KpiApplyRequestModel.ts`

#### IKpiApplyRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| description | string | No |

Source: `src/model/kpiApply/KpiApplyRequestModel.ts`

#### IKpiApplyResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| description | string | No |
| startTime | any | No |
| endTime | any | No |
| kpiId | number | No |
| kpiName | string | No |
| branchId | number | Yes |

Source: `src/model/kpiApply/KpiApplyResponseModel.ts`

#### IAddKpiApplyModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiApplyResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpiApply/PropsModel.ts`


## kpiDatasource (`kpiDatasource`)

**Service file:** `src/services/KpiDatasourceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiDatasource/list` | src/services/KpiDatasourceService.ts |  |
| update | POST | `/adminapi/kpiDatasource/update` | src/services/KpiDatasourceService.ts |  |
| delete | DELETE | `/adminapi/kpiDatasource/delete` | src/services/KpiDatasourceService.ts |  |

### Related DTOs

#### IKpiDatasourceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiDatasource/KpiDatasourceRequestModel.ts`

#### IKpiDatasourceRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | No |
| description | string | No |
| position | number | No |
| type | number | No |

Source: `src/model/kpiDatasource/KpiDatasourceRequestModel.ts`

#### IKpiDatasourceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| code | string | No |
| description | string | No |
| position | number | No |
| type | number | No |
| employeeId | string | number | No |
| createdTime | string | No |

Source: `src/model/kpiDatasource/KpiDatasourceResponseModel.ts`

#### AddKpiDatasourceModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiDatasourceResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpiDatasource/PropsModel.ts`


## kpiGoal (`kpiGoal`)

**Service file:** `src/services/KpiGoalService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiGoal/list` | src/services/KpiGoalService.ts |  |
| update | POST | `/adminapi/kpiGoal/update` | src/services/KpiGoalService.ts |  |
| delete | DELETE | `/adminapi/kpiGoal/delete` | src/services/KpiGoalService.ts |  |
| detail | GET | `/adminapi/kpiGoal/get` | src/services/KpiGoalService.ts |  |

### Related DTOs

#### IKpiGoalFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiGoal/KpiGoalRequestModel.ts`

#### IKpiGoalRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| direction | string | No |
| position | number | Yes |

Source: `src/model/kpiGoal/KpiGoalRequestModel.ts`

#### IKpiGoalResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| direction | string | No |
| position | number | No |
| category | string | No |
| type | number | No |
| datasourceId | number | No |
| datasourceName | string | No |
| bsnId | number | No |
| createdTime | string | No |
| parentId | number | Yes |
| parentName | string | Yes |
| parent | any | Yes |
| selectedFormula | string | Yes |
| fieldList | any | Yes |
| parentIds | any | Yes |
| parents | any | Yes |
| fieldDTO | any | Yes |

Source: `src/model/kpiGoal/KpiGoalResponseModel.ts`

#### AddKpiGoalModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiGoalResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpiGoal/PropsModel.ts`

#### IKpiGoalListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/kpiGoal/PropsModel.ts`


## kpiObject (`kpiObject`)

**Service file:** `src/services/KpiObjectService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiObject/list` | src/services/KpiObjectService.ts |  |
| update | POST | `/adminapi/kpiObject/update/web` | src/services/KpiObjectService.ts |  |
| delete | DELETE | `/adminapi/kpiObject/delete` | src/services/KpiObjectService.ts |  |
| detail | GET | `/adminapi/kpiObject/get` | src/services/KpiObjectService.ts |  |
| detailKpiEmployee | GET | `/adminapi/kpiObject/employee/result` | src/services/KpiObjectService.ts |  |
| exchangeList | GET | `/adminapi/kpiExchange/list` | src/services/KpiObjectService.ts |  |
| deleteKpiExchange | DELETE | `/adminapi/kpiExchange/delete` | src/services/KpiObjectService.ts |  |
| addKpiExchange | POST | `/adminapi/kpiExchange/update` | src/services/KpiObjectService.ts |  |
| updateKpiExchange | POST | `/adminapi/kpiExchange/get` | src/services/KpiObjectService.ts |  |

### Related DTOs

#### IKpiObjectFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| kpiId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiObject/KpiObjectRequestModel.ts`

#### IKpiObjectRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| kpiId | number | Yes |
| goalId | number | Yes |
| threshold | number | Yes |
| weight | number | Yes |

Source: `src/model/kpiObject/KpiObjectRequestModel.ts`

#### IKpiObjectResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| kayId | number | Yes |
| objectId | number | Yes |
| objectType | number | Yes |
| receiverId | number | Yes |
| assignerId | number | Yes |
| objectName | string | Yes |
| applyName | string | Yes |
| receiverName | string | Yes |
| assignerName | string | Yes |

Source: `src/model/kpiObject/KpiObjectResponseModel.ts`

#### IKpiObjectModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | Yes |
| data | any | Yes |
| infoKpi | any | No |
| onHide | (reload: boolean) => void | Yes |
| onReload | (reload: boolean) => void | Yes |

Source: `src/model/kpiObject/PropsModel.ts`

#### ITableKpiObjectProps

| Field | Type | Optional |
|-------|------|----------|
| isLoading | boolean | No |
| listKpiObject | IKpiObjectResponse[] | No |
| titles | string[] | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| actionsTable | any | No |
| setIsActiveForm | any | No |
| isPermissions | boolean | No |

Source: `src/model/kpiObject/PropsModel.ts`


## kpiSetup (`kpiSetup`)

**Service file:** `src/services/KpiSetupService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiSetup/list` | src/services/KpiSetupService.ts |  |
| update | POST | `/adminapi/kpiSetup/update/web` | src/services/KpiSetupService.ts |  |
| delete | DELETE | `/adminapi/kpiSetup/delete` | src/services/KpiSetupService.ts |  |

### Related DTOs

#### IKpiSetupFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| kpiId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiSetup/KpiSetupRequestModel.ts`

#### IKpiSetupRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| kpiId | number | Yes |
| goalId | number | Yes |
| threshold | number | Yes |
| weight | number | Yes |

Source: `src/model/kpiSetup/KpiSetupRequestModel.ts`

#### IKpiSetupResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| goalId | number | Yes |
| templateId | number | Yes |
| threshold | number | Yes |
| weight | number | Yes |
| goalName | string | Yes |
| templateName | string | Yes |

Source: `src/model/kpiSetup/KpiSetupResponseModel.ts`

#### IKpiSetupModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | Yes |
| data | any | Yes |
| infoKpi | any | No |
| onHide | (reload: boolean) => void | Yes |
| onReload | (reload: boolean) => void | Yes |

Source: `src/model/kpiSetup/PropsModel.ts`

#### ITableKpiSetupProps

| Field | Type | Optional |
|-------|------|----------|
| isLoading | boolean | No |
| listKpiSetup | IKpiSetupResponse[] | No |
| titles | string[] | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| actionsTable | any | No |
| setIsActiveForm | any | No |
| isPermissions | boolean | No |

Source: `src/model/kpiSetup/PropsModel.ts`


## kpiTemplate (`kpiTemplate`)

**Service file:** `src/services/KpiTemplateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiTemplate/list` | src/services/KpiTemplateService.ts |  |
| update | POST | `/adminapi/kpiTemplate/update` | src/services/KpiTemplateService.ts |  |
| delete | DELETE | `/adminapi/kpiTemplate/delete` | src/services/KpiTemplateService.ts |  |

### Related DTOs

#### IKpiTemplateFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiTemplate/KpiTemplateRequestModel.ts`

#### IKpiTemplateRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| description | string | No |

Source: `src/model/kpiTemplate/KpiTemplateRequestModel.ts`

#### IKpiTemplateResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| description | string | No |
| startDate | any | No |
| endDate | any | No |
| branchId | number | Yes |

Source: `src/model/kpiTemplate/KpiTemplateResponseModel.ts`

#### IAddKpiTemplateModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiTemplateResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpiTemplate/PropsModel.ts`

#### IKpiTemplateGoalFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiTemplateGoal/KpiTemplateGoalRequestModel.ts`


## kpiTemplateGoal (`kpiTemplateGoal`)

**Service file:** `src/services/KpiTemplateGoalService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/kpiTemplateGoal/list` | src/services/KpiTemplateGoalService.ts |  |
| update | POST | `/adminapi/kpiTemplateGoal/update` | src/services/KpiTemplateGoalService.ts |  |
| delete | DELETE | `/adminapi/kpiTemplateGoal/delete` | src/services/KpiTemplateGoalService.ts |  |

### Related DTOs

#### IKpiTemplateGoalFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiTemplateGoal/KpiTemplateGoalRequestModel.ts`

#### IKpiTemplateGoalRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| templateId | number | Yes |
| goalId | number | Yes |
| threshold | number | Yes |
| weight | number | Yes |

Source: `src/model/kpiTemplateGoal/KpiTemplateGoalRequestModel.ts`

#### IKpiTemplateGoalResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| goalId | number | Yes |
| templateId | number | Yes |
| threshold | number | Yes |
| weight | number | Yes |
| goalName | string | Yes |
| templateName | string | Yes |

Source: `src/model/kpiTemplateGoal/KpiTemplateGoalResponseModel.ts`

#### IKpiTemplateGoalModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | Yes |
| data | any | Yes |
| infoKpiTemplate | any | No |
| onHide | (reload: boolean) => void | Yes |
| onReload | (reload: boolean) => void | Yes |

Source: `src/model/kpiTemplateGoal/PropsModel.ts`

#### ITableKpiTemplateGoalProps

| Field | Type | Optional |
|-------|------|----------|
| isLoading | boolean | No |
| listKpiTemplateGoal | IKpiTemplateGoalResponse[] | No |
| titles | string[] | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| actionsTable | any | No |
| setIsActiveForm | any | No |
| isPermissions | boolean | No |

Source: `src/model/kpiTemplateGoal/PropsModel.ts`


# Finance Module


## cashbook (`cashbook`)

**Service file:** `src/services/CashbookService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cashbook/list` | src/services/CashbookService.ts |  |
| update | POST | `/adminapi/cashbook/update` | src/services/CashbookService.ts |  |
| delete | DELETE | `/adminapi/cashbook/delete` | src/services/CashbookService.ts |  |
| export | POST | `/adminapi/cashbook/export` | src/services/CashbookService.ts |  |
| detail | GET | `/adminapi/cashbook/get` | src/services/CashbookService.ts |  |

### Related DTOs

#### ICashbookFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| categoryId | number | Yes |
| keyword | string | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| branchId | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |
| template | string | Yes |
| projectId | number | Yes |

Source: `src/model/cashbook/CashbookRequestModel.ts`

#### ICashbookRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| fmtTransDate | string | Yes |
| transDate | string | No |
| type | number | Yes |
| categoryId | number | Yes |
| categoryName | string | No |
| employeeId | number | Yes |
| empName | string | No |
| branchId | number | No |
| amount | number | string | No |
| note | string | Yes |
| bill | string | Yes |
| billCode | string | Yes |
| invoiceType | string | Yes |
| invoiceId | number | Yes |
| actionType | number | Yes |
| projectId | number | Yes |
| contractId | number | Yes |

Source: `src/model/cashbook/CashbookRequestModel.ts`

#### ICashBookResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| note | string | Yes |
| amount | number | No |
| employeeId | number | No |
| branchId | number | No |
| empName | string | No |
| transDate | string | No |
| categoryName | string | No |
| categoryId | number | Yes |
| fmtTransDate | string | null | Yes |
| type | number | Yes |
| bill | string | Yes |
| remaining | number | Yes |
| invoiceId | number | Yes |
| invoiceType | string | Yes |
| projectId | number | Yes |
| projectName | string | Yes |
| contractId | number | Yes |
| contractName | string | Yes |

Source: `src/model/cashbook/CashbookResponseModel.ts`

#### AddCashBookModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |
| dataCashBook | ICashBookResponse | Yes |
| type | number | No |
| dataContractPayment | any | Yes |

Source: `src/model/cashbook/PropsModel.ts`


## earnings (`earnings`)

**Service file:** `src/services/EarningsService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filter | GET | `/adminapi/earnings/admin/list` | src/services/EarningsService.ts |  |

### Related DTOs

#### IEarningsFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| userId | number | Yes |
| month | number | Yes |
| year | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/earnings/EarningRequestModel.ts`


## estimate (`estimate`)

**Service file:** `src/services/EstimateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| takeEstimate | GET | `/adminapi/customer/estimate` | src/services/EstimateService.ts |  |

### Related DTOs

#### IEstimateRequestModel

| Field | Type | Optional |
|-------|------|----------|
| lstCgpId | number[] | No |
| lstCareerId | number[] | No |
| lstSourceId | number[] | No |
| lstRelationshipId | number[] | No |

Source: `src/model/estimate/EstimateRequestModel.ts`


## paymentHistory (`paymentHistory`)

**Service file:** `src/services/PaymentHistoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| filter | GET | `/adminapi/paymentHistory/list` | src/services/PaymentHistoryService.ts |  |
| update | POST | `/adminapi/paymentHistory/update` | src/services/PaymentHistoryService.ts |  |
| delete | DELETE | `/adminapi/paymentHistory/delete` | src/services/PaymentHistoryService.ts |  |

### Related DTOs

#### IPaymentHistoryRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| amount | number | No |
| transDate | string | No |
| content | string | Yes |
| bill | string | Yes |
| recommenderPhone | string | No |

Source: `src/model/paymentHistory/PaymentHistoryRequestModel.ts`

#### IPaymentHistoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| recommenderPhone | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/paymentHistory/PaymentHistoryRequestModel.ts`

#### IPaymentHistoryResponse


Source: `src/model/paymentHistory/PaymentHistoryResponseModel.ts`

#### AddPaymentHistoryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPaymentHistoryResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/paymentHistory/PropsModel.ts`


## quote (`quote`)

**Service file:** `src/services/QuoteService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/quote/list` | src/services/QuoteService.ts |  |
| update | POST | `/adminapi/quote/update` | src/services/QuoteService.ts |  |
| delete | DELETE | `/adminapi/quote/delete` | src/services/QuoteService.ts |  |
| cloneQuote | POST | `/adminapi/quote/clone` | src/services/QuoteService.ts |  |
| updateStatus | POST | `/adminapi/quote/update/status` | src/services/QuoteService.ts |  |
| resetSignal | POST | `/adminapi/approvalObject/reset` | src/services/QuoteService.ts |  |
| quoteFormLst | GET | `/adminapi/quoteForm/list` | src/services/QuoteService.ts |  |
| quoteFormUpdate | POST | `/adminapi/quoteForm/update` | src/services/QuoteService.ts |  |
| quoteFormDelete | DELETE | `/adminapi/quoteForm/delete` | src/services/QuoteService.ts |  |
| quoteFormUpdatePostion | POST | `/adminapi/quoteForm/update/position` | src/services/QuoteService.ts |  |
| lstQuoteContract | GET | `/adminapi/contractQuote/list` | src/services/QuoteService.ts |  |
| updateQuoteContract | POST | `/adminapi/contractQuote/update` | src/services/QuoteService.ts |  |
| deleteQuoteContract | DELETE | `/adminapi/contractQuote/deleteByQuoteId` | src/services/QuoteService.ts |  |

## sheetFieldQuoteForm (`sheetFieldQuoteForm`)

**Service file:** `src/services/SheetFieldQuoteFormService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/sheetField/list` | src/services/SheetFieldQuoteFormService.ts |  |
| update | POST | `/adminapi/sheetField/update` | src/services/SheetFieldQuoteFormService.ts |  |
| updatePosition | POST | `/adminapi/sheetField/update/position` | src/services/SheetFieldQuoteFormService.ts |  |
| delete | DELETE | `/adminapi/sheetField/delete` | src/services/SheetFieldQuoteFormService.ts |  |
| detail | GET | `/adminapi/sheetField/get` | src/services/SheetFieldQuoteFormService.ts |  |

## sheetQuoteForm (`sheetQuoteForm`)

**Service file:** `src/services/SheetQuoteFormService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/sheet/list` | src/services/SheetQuoteFormService.ts |  |
| update | POST | `/adminapi/sheet/update` | src/services/SheetQuoteFormService.ts |  |
| delete | DELETE | `/adminapi/sheet/delete` | src/services/SheetQuoteFormService.ts |  |
| detail | GET | `/adminapi/sheet/get` | src/services/SheetQuoteFormService.ts |  |

# Ticket Module


## feedback (`feedback`)

**Service file:** `src/services/FeedbackService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/feedback/list/all` | src/services/FeedbackService.ts |  |
| update | POST | `/adminapi/feedback/update` | src/services/FeedbackService.ts |  |
| delete | DELETE | `/adminapi/feedback/delete` | src/services/FeedbackService.ts |  |
| changeStatus | POST | `/adminapi/feedback/update/status` | src/services/FeedbackService.ts |  |

### Related DTOs

#### ICustomerFeedbackFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| type | number | No |
| page | number | No |
| limit | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerFeedbackUpdateRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| content | string | No |
| contentDelta | string | Yes |
| employeeId | number | Yes |
| type | number | No |
| media | string | Yes |
| customerId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerFeedbackResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| content | string | No |
| contentDelta | string | No |
| employeeId | number | No |
| employeeName | string | No |
| employeeAvatar | string | No |
| employeeUserId | number | No |
| type | number | No |
| customerId | number | No |
| createdTime | string | No |
| media | any | Yes |
| medias | any | Yes |

Source: `src/model/customer/CustomerResponseModel.ts`

#### IFeedbackPersonListProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |

Source: `src/model/customer/PropsModel.ts`

#### IMessageChatFeedbackPersonProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |
| dataFeedback | ICustomerFeedbackResponseModel | No |
| onReload | (reload: boolean) => void | No |

Source: `src/model/customer/PropsModel.ts`


## ticket (`ticket`)

**Service file:** `src/services/TicketService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/ticket/list` | src/services/TicketService.ts |  |
| update | POST | `/adminapi/ticket/update` | src/services/TicketService.ts |  |
| updateAndInit | POST | `/adminapi/ticket/update-and-init` | src/services/TicketService.ts |  |
| collect | POST | `/adminapi/ticket/send/jssdk` | src/services/TicketService.ts |  |
| detail | GET | `/adminapi/ticket/get` | src/services/TicketService.ts |  |
| delete | DELETE | `/adminapi/ticket/delete` | src/services/TicketService.ts |  |
| viewer | GET | `/adminapi/ticket/viewer` | src/services/TicketService.ts |  |
| updateStatus | POST | `/adminapi/ticket/update/status` | src/services/TicketService.ts |  |
| ticketExchangeList | GET | `/adminapi/ticketExchange/list` | src/services/TicketService.ts |  |
| ticketExchangeUpdate | POST | `/adminapi/ticketExchange/update` | src/services/TicketService.ts |  |
| ticketExchangeDelete | DELETE | `/adminapi/ticketExchange/delete` | src/services/TicketService.ts |  |
| ticketProcess | POST | `/adminapi/ticketProcess/update` | src/services/TicketService.ts |  |
| resetTransferVotes | POST | `/adminapi/supportObject/reset` | src/services/TicketService.ts |  |

### Related DTOs

#### ITicketPersonListProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |

Source: `src/model/customer/PropsModel.ts`

#### IAddTicketModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITicketResponseModel | Yes |
| idCustomer | number | Yes |
| onHide | (reload: boolean) => void | No |
| saleflowId | number | Yes |
| sieId | number | Yes |

Source: `src/model/ticket/PropsModel.ts`

#### IViewStatusTicketModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idTicket | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/ticket/PropsModel.ts`

#### IInfoCustomerTicketProps

| Field | Type | Optional |
|-------|------|----------|
| data | ITicketResponseModel | No |

Source: `src/model/ticket/PropsModel.ts`

#### IViewInfoTicketProps

| Field | Type | Optional |
|-------|------|----------|
| data | ITicketResponseModel | No |
| infoApproved | any | No |
| onReload | (reload: boolean) => void | No |
| takeBlockRight | (reload: number) => void | No |

Source: `src/model/ticket/PropsModel.ts`


## ticketCategory (`ticketCategory`)

**Service file:** `src/services/TicketCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/ticketCategory/list` | src/services/TicketCategoryService.ts |  |
| update | POST | `/adminapi/ticketCategory/update` | src/services/TicketCategoryService.ts |  |
| detail | GET | `/adminapi/ticketCategory/get` | src/services/TicketCategoryService.ts |  |
| delete | DELETE | `/adminapi/ticketCategory/delete` | src/services/TicketCategoryService.ts |  |

### Related DTOs

#### IAddTicketCategoryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITicketCategoryResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/ticketCategory/PropsModel.ts`

#### ITicketCategoryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| type | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/ticketCategory/TicketCategoryRequestModel.ts`

#### ITicketCategoryRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| position | string | number | No |
| type | string | number | No |

Source: `src/model/ticketCategory/TicketCategoryRequestModel.ts`

#### ITicketCategoryResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| type | number | No |

Source: `src/model/ticketCategory/TicketCategoryResponseModel.ts`


## ticketProc (`ticketProc`)

**Service file:** `src/services/TicketProcService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/support/list` | src/services/TicketProcService.ts |  |
| update | POST | `/adminapi/support/update` | src/services/TicketProcService.ts |  |
| detail | GET | `/adminapi/support/get` | src/services/TicketProcService.ts |  |
| delete | DELETE | `/adminapi/support/delete` | src/services/TicketProcService.ts |  |

### Related DTOs

#### ITicketProcessRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| executorId | number | No |
| statusId | number | No |
| ticketId | number | No |

Source: `src/model/ticket/TicketRequestModel.ts`

#### IAddTicketProcModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITicketProcResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/ticketProc/PropsModel.ts`

#### ITicketProcFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |
| type | number | Yes |

Source: `src/model/ticketProc/TicketProcRequestModel.ts`

#### ITicketProcRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| position | string | number | No |

Source: `src/model/ticketProc/TicketProcRequestModel.ts`

#### ITicketProcResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| startDate | any | No |
| endDate | any | No |
| branchId | number | Yes |
| status | any | No |

Source: `src/model/ticketProc/TicketProcResponseModel.ts`


## ticketStep (`ticketStep`)

**Service file:** `src/services/TicketStepService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/ticketStep/list` | src/services/TicketStepService.ts |  |
| update | POST | `/adminapi/ticketStep/update` | src/services/TicketStepService.ts |  |
| detail | GET | `/adminapi/ticketStep/get` | src/services/TicketStepService.ts |  |
| delete | DELETE | `/adminapi/ticketStep/delete` | src/services/TicketStepService.ts |  |

### Related DTOs

#### IAddTicketStepModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITicketStepResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/ticketStep/PropsModel.ts`

#### ITicketStepFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| procId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/ticketStep/TicketStepRequestModel.ts`

#### ITicketStepRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| departmentId | number | Yes |
| period | number | Yes |
| unit | string | Yes |
| prevId | number | Yes |
| procId | number | Yes |
| divisionMethod | number | Yes |
| employees | string | Yes |

Source: `src/model/ticketStep/TicketStepRequestModel.ts`

#### ITicketStepResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| departmentId | number | Yes |
| period | number | Yes |
| unit | string | Yes |
| prevId | number | Yes |
| procId | number | Yes |
| departmentName | string | Yes |
| prevDepartmentName | string | Yes |
| divisionMethod | string | Yes |

Source: `src/model/ticketStep/TicketStepResponseModel.ts`


# Tender Module


## procurement (`procurement`)

**Service file:** `src/services/ProcurementService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/procurementType/list` | src/services/ProcurementService.ts |  |
| update | POST | `/application/procurementType/update` | src/services/ProcurementService.ts |  |
| updateStatus | POST | `/application/procurementType/update/status` | src/services/ProcurementService.ts |  |
| detail | GET | `/application/procurementType/get` | src/services/ProcurementService.ts |  |
| delete | DELETE | `/application/procurementType/delete` | src/services/ProcurementService.ts |  |

## purchaseRequest (`purchaseRequest`)

**Service file:** `src/services/PurchaseRequestService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/cs/purchase-request/list` | src/services/PurchaseRequestService.ts |  |
| listReport | GET | `/cs/report/purchase-request/list` | src/services/PurchaseRequestService.ts |  |
| update | POST | `/cs/purchase-request/update` | src/services/PurchaseRequestService.ts |  |
| collect | POST | `/cs/purchase-request/send/jssdk` | src/services/PurchaseRequestService.ts |  |
| detail | GET | `/cs/purchase-request/get` | src/services/PurchaseRequestService.ts |  |
| delete | DELETE | `/cs/purchase-request/delete` | src/services/PurchaseRequestService.ts |  |
| viewer | GET | `/cs/purchase-request/viewer` | src/services/PurchaseRequestService.ts |  |
| updateStatus | POST | `/cs/purchase-request/update/status` | src/services/PurchaseRequestService.ts |  |
| purchaseRequestExchangeList | GET | `/cs/purchase-requestExchange/list` | src/services/PurchaseRequestService.ts |  |
| purchaseRequestExchangeUpdate | POST | `/cs/purchase-requestExchange/update` | src/services/PurchaseRequestService.ts |  |
| purchaseRequestExchangeDelete | DELETE | `/cs/purchase-requestExchange/delete` | src/services/PurchaseRequestService.ts |  |
| purchaseRequestProcess | GET | `/cs/purchase-request/update/process` | src/services/PurchaseRequestService.ts |  |
| resetTransferVotes | POST | `/cs/supportObject/reset` | src/services/PurchaseRequestService.ts |  |
| statisticStatus | GET | `/cs/purchase-request/statistic/status` | src/services/PurchaseRequestService.ts |  |
| statisticStatusByDate | GET | `/cs/purchase-request/statistic/status/by-date` | src/services/PurchaseRequestService.ts |  |
| statisticList | GET | `/cs/purchase-request/list-statistic` | src/services/PurchaseRequestService.ts |  |
| purchaseCategory | GET | `/cs/product-category/list` | src/services/PurchaseRequestService.ts |  |
| purchaseProduct | GET | `/cs/product/list` | src/services/PurchaseRequestService.ts |  |
| paymentBill | GET | `/cs/purchase-request/getJson` | src/services/PurchaseRequestService.ts |  |
| contractInfo | GET | `/cs/renewal-offer/get-information-aggregate` | src/services/PurchaseRequestService.ts |  |
| renewalContract | POST | `/sale/renewalContract/initBusinessProcess` | src/services/PurchaseRequestService.ts |  |
| initReceiveTask | GET | `/cs/purchase-request/init-receive-task` | src/services/PurchaseRequestService.ts |  |
| updateCertificate | POST | `/cs/purchase-request/updateCertificate` | src/services/PurchaseRequestService.ts |  |
| getJssdk | GET | `/sale/contract-insurance/get/jssdk` | src/services/PurchaseRequestService.ts |  |
| getProductJssdk | GET | `/cs/product/get/jssdk` | src/services/PurchaseRequestService.ts |  |

### Related DTOs

#### IPurchaseRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| code | string | No |
| name | string | No |
| requestNo | string | No |
| departmentId | number | No |
| employeeId | number | No |
| customerId | number | No |
| type | string | No |
| categoryId | number | No |
| categoryName | string | No |
| productId | number | No |
| productName | string | No |
| status | number | No |
| notes | string | No |
| recordingUrl | string | No |
| docLink | string | No |
| consultedInfo | string | No |
| creatorId | number | No |
| creatorName | string | No |
| departmentName | string | No |
| employeeName | string | No |
| bsnId | number | No |
| clientId | number | No |
| qrCode | string | No |
| potId | string | No |
| processId | string | No |
| createdAt | string | No |
| updatedAt | string | No |
| productSchemaVersion | string | No |
| productSchemaSnapshot | string | No |
| productData | object | No |
| customerName | string | No |
| customerPhone | string | No |
| customerEmail | string | No |
| customerTaxCode | string | No |
| riskAddress | string | No |
| registrationNo | string | No |
| manufactureYear | number | No |
| brand | string | No |
| model | string | No |
| sumInsured | number | No |
| coverageStart | Date | No |
| coverageEnd | Date | No |
| usagePurpose | string | No |
| deductible | number | No |

Source: `src/model/PurchaseRequest/PurchaseRequestModel.ts`


## tenderPackage (`tenderPackage`)

**Service file:** `src/services/TenderPackageService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/tenderPackage/list` | src/services/TenderPackageService.ts |  |
| update | POST | `/application/tenderPackage/update` | src/services/TenderPackageService.ts |  |
| detail | GET | `/application/tenderPackage/get` | src/services/TenderPackageService.ts |  |
| delete | DELETE | `/application/tenderPackage/delete` | src/services/TenderPackageService.ts |  |
| listBiddingInvitation | GET | `/application/tenderInvitation/list` | src/services/TenderPackageService.ts |  |
| listContractor | GET | `/application/tenderInvitation/list_contractor` | src/services/TenderPackageService.ts |  |
| updateBidding | POST | `/application/tenderInvitation/update` | src/services/TenderPackageService.ts |  |
| cancelBidding | POST | `/application/tenderInvitation/cancel` | src/services/TenderPackageService.ts |  |
| detailBiddingInvitation | GET | `/application/tenderInvitation/get` | src/services/TenderPackageService.ts |  |
| updateBiddingStatus | POST | `/application/tenderInvitation/update/bidding_status` | src/services/TenderPackageService.ts |  |
| listSubmittedDocument | GET | `/application/submittedDocument/list` | src/services/TenderPackageService.ts |  |
| openBidding | POST | `/application/tenderOpening/update` | src/services/TenderPackageService.ts |  |
| updateBatch | POST | `/application/documentEvaluation/updateBatch` | src/services/TenderPackageService.ts |  |
| submitReview | GET | `/application/submittedDocument/submit_review/update` | src/services/TenderPackageService.ts |  |
| getResultDocumentEvaluation | GET | `/application/documentEvaluation/getResult` | src/services/TenderPackageService.ts |  |
| getResultFinanceEvaluation | GET | `/application/documentEvaluation/getFinances` | src/services/TenderPackageService.ts |  |
| sendEvaluation | POST | `/application/documentEvaluation/sendEvaluation` | src/services/TenderPackageService.ts |  |
| updateGeneralClarification | POST | `/application/generalClarification/update` | src/services/TenderPackageService.ts |  |
| listGeneralClarification | GET | `/application/generalClarification/list` | src/services/TenderPackageService.ts |  |
| extensionHistory | POST | `/application/extensionHistory/insert` | src/services/TenderPackageService.ts |  |
| detailExtensionRequest | GET | `/application/extensionRequest/get` | src/services/TenderPackageService.ts |  |
| listExtensionHistory | GET | `/application/extensionHistory/list` | src/services/TenderPackageService.ts |  |

# Communication Module


## email (`email`)

**Service file:** `src/services/EmailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/outlookMail/list` | src/services/EmailService.ts |  |
| detail | GET | `/adminapi/outlookMail/get` | src/services/EmailService.ts |  |
| sendEmail | POST | `/adminapi/outlookMail/sendEmail` | src/services/EmailService.ts |  |
| delete | DELETE | `/adminapi/outlookMail/delete` | src/services/EmailService.ts |  |
| sendEmailConfirm | POST | `/adminapi/promotion/init-receive-task` | src/services/EmailService.ts |  |
| lstEmail | POST | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/message/search", |
| sendEmailNew | POST | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/message/send", |
| detailEmail | GET | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/message/get-by-id", |
| sendEmailDraft | POST | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/draft/send", |
| lstEmailDraft | GET | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/draft/search", |
| createEmailDraft | POST | `https:` | src/services/EmailService.ts | connect.mock.local/api/v1/google/gmail/draft/create", |

### Related DTOs

#### IConfigEmailListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/configCode/PropsModel.ts`

#### IAddConfigEmailModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IConfigCodeResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/configCode/PropsModel.ts`

#### ICustomerSendEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IAddCustomerSendEmailModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| type | string | Yes |
| listIdCustomer | number[] | No |
| lstCustomer | IFilterUser[] | No |
| callBack | any | Yes |
| onHide | () => void | No |

Source: `src/model/customer/PropsModel.ts`

#### ICustomerEmailFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | Yes |
| requestId | number | Yes |
| customerId | number | Yes |
| status | number | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/customerEmail/CustomerEmailRequestModel.ts`


## historySend (`historySend`)

**Service file:** `src/services/HistorySendService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| historySendSMS | POST | `/adminapi/customerSms/list` | src/services/HistorySendService.ts |  |
| historySendEmail | POST | `/adminapi/customerEmail/list` | src/services/HistorySendService.ts |  |
| historySendZalo | POST | `/adminapi/customerZalo/list` | src/services/HistorySendService.ts |  |

## partnerCall (`partnerCall`)

**Service file:** `src/services/PartnerCallService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/partnerCall/list` | src/services/PartnerCallService.ts |  |
| update | POST | `/adminapi/partnerCall/update` | src/services/PartnerCallService.ts |  |
| detail | GET | `/adminapi/partnerCall/get` | src/services/PartnerCallService.ts |  |
| delete | DELETE | `/adminapi/partnerCall/delete` | src/services/PartnerCallService.ts |  |

### Related DTOs

#### IPartnerCallFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallResponseModel.ts`

#### IAddPartnerCallModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPartnerCallResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`

#### IPartnerCallListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`


## partnerEmail (`partnerEmail`)

**Service file:** `src/services/PartnerEmailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/partnerEmail/list` | src/services/PartnerEmailService.ts |  |
| update | POST | `/adminapi/partnerEmail/update` | src/services/PartnerEmailService.ts |  |
| detail | GET | `/adminapi/partnerEmail/get` | src/services/PartnerEmailService.ts |  |
| delete | DELETE | `/adminapi/partnerEmail/delete` | src/services/PartnerEmailService.ts |  |

### Related DTOs

#### IPartnerEmailFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/partnerEmail/PartnerEmailRequestModel.ts`

#### IPartnerEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerEmail/PartnerEmailRequestModel.ts`

#### IPartnerEmailResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerEmail/PartnerEmailResponseModel.ts`

#### IAddPartnerEmailModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPartnerEmailResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/partnerEmail/PropsModel.ts`

#### IPartnerEmailListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/partnerEmail/PropsModel.ts`


## partnerSMS (`partnerSMS`)

**Service file:** `src/services/PartnerSMSService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/partnerSms/list` | src/services/PartnerSMSService.ts |  |
| update | POST | `/adminapi/partnerSms/update` | src/services/PartnerSMSService.ts |  |
| detail | GET | `/adminapi/partnerSms/get` | src/services/PartnerSMSService.ts |  |
| delete | DELETE | `/adminapi/partnerSms/delete` | src/services/PartnerSMSService.ts |  |

### Related DTOs

#### IPartnerCallFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallResponseModel.ts`

#### IAddPartnerCallModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPartnerCallResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`

#### IPartnerCallListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`


## sendEmail (`sendEmail`)

**Service file:** `src/services/SendEmailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| listEmail | GET | `/adminapi/emailRequest/list` | src/services/SendEmailService.ts |  |
| updateEmail | POST | `/adminapi/emailRequest/update` | src/services/SendEmailService.ts |  |
| detailEmail | GET | `/adminapi/emailRequest/get` | src/services/SendEmailService.ts |  |
| deleteEmail | DELETE | `/adminapi/emailRequest/delete` | src/services/SendEmailService.ts |  |
| approveEmail | POST | `/adminapi/emailRequest/approve` | src/services/SendEmailService.ts |  |
| cancelEmail | POST | `/adminapi/emailRequest/cancel` | src/services/SendEmailService.ts |  |

### Related DTOs

#### ICustomerSendEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IAddCustomerSendEmailModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| type | string | Yes |
| listIdCustomer | number[] | No |
| lstCustomer | IFilterUser[] | No |
| callBack | any | Yes |
| onHide | () => void | No |

Source: `src/model/customer/PropsModel.ts`

#### ISendEmail

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (isHide: boolean) => void | No |
| onBackProps | () => void | Yes |
| listIdCustomerProps | number[] | Yes |
| idSendEmail | number | Yes |
| paramCustomerProps | ICustomerSchedulerFilterRequest | Yes |
| customerIdList | any | Yes |
| type | string | Yes |

Source: `src/model/sendEmail/PropsModel.ts`


## sendSMS (`sendSMS`)

**Service file:** `src/services/SendSMSService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| listSMS | GET | `/adminapi/smsRequest/list` | src/services/SendSMSService.ts |  |
| updateSMS | POST | `/adminapi/smsRequest/update` | src/services/SendSMSService.ts |  |
| detailSMS | GET | `/adminapi/smsRequest/get` | src/services/SendSMSService.ts |  |
| deleteSMS | DELETE | `/adminapi/smsRequest/delete` | src/services/SendSMSService.ts |  |
| approveSMS | POST | `/adminapi/smsRequest/approve` | src/services/SendSMSService.ts |  |
| cancelSMS | POST | `/adminapi/smsRequest/cancel` | src/services/SendSMSService.ts |  |

### Related DTOs

#### ICustomerSendSMSRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerSendEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerSendZaloRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IAddCustomerSendSMSModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| type | string | Yes |
| listIdCustomer | number[] | No |
| callBack | any | Yes |
| onHide | (isHide: boolean) => void | No |

Source: `src/model/customer/PropsModel.ts`

#### IAddCustomerSendEmailModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| type | string | Yes |
| listIdCustomer | number[] | No |
| lstCustomer | IFilterUser[] | No |
| callBack | any | Yes |
| onHide | () => void | No |

Source: `src/model/customer/PropsModel.ts`


## switchboard (`switchboard`)

**Service file:** `src/services/SwitchboardService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/callConfig/list` | src/services/SwitchboardService.ts |  |
| update | POST | `/adminapi/callConfig/update` | src/services/SwitchboardService.ts |  |
| updateStatus | POST | `/adminapi/callConfig/update/status` | src/services/SwitchboardService.ts |  |
| detail | GET | `/adminapi/callConfig/get` | src/services/SwitchboardService.ts |  |
| delete | DELETE | `/adminapi/callConfig/delete` | src/services/SwitchboardService.ts |  |

### Related DTOs

#### IAddSwitchboardModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ISwitchboardResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/switchboard/PropsModel.ts`

#### ISwitchboardListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/switchboard/PropsModel.ts`

#### ISwitchboardFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |
| id | number | Yes |

Source: `src/model/switchboard/SwitchboardRequestModel.ts`

#### ISwitchboardRequestModel

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| expiredDate | string | No |
| partnerId | number | No |
| partnerConfig | string | No |

Source: `src/model/switchboard/SwitchboardRequestModel.ts`

#### ISwitchboardResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| expiredDate | string | No |
| partnerId | number | No |
| partnerName | string | No |
| partnerConfig | string | No |
| status | any | Yes |
| whitelist | any | Yes |

Source: `src/model/switchboard/SwitchboardResponseModel.ts`


## templateEmail (`templateEmail`)

**Service file:** `src/services/TemplateEmailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/templateEmail/list` | src/services/TemplateEmailService.ts |  |
| update | POST | `/adminapi/templateEmail/update` | src/services/TemplateEmailService.ts |  |
| detail | GET | `/adminapi/templateEmail/get` | src/services/TemplateEmailService.ts |  |
| delete | DELETE | `/adminapi/templateEmail/delete` | src/services/TemplateEmailService.ts |  |

### Related DTOs

#### IAddTemplateEmailModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITemplateZaloResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/templateZalo/PropsModel.ts`

#### ITemplateEmailListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/templateEmail/PropsModel.ts`

#### ITableTemplateEmailProps

| Field | Type | Optional |
|-------|------|----------|
| params | any | No |
| setParams | any | No |
| listSaveSearch | any | No |
| listFilterItem | any | No |
| isLoading | boolean | No |
| listTemplateEmail | ITemplateEmailResponseModel[] | No |
| titles | string[] | No |
| pagination | any | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| listIdChecked | number[] | No |
| bulkActionItems | any | No |
| setListIdChecked | any | No |
| actionsTable | any | No |
| isPermissions | boolean | No |
| setDataTemplateEmail | any | No |
| isNoItem | boolean | No |

Source: `src/model/templateEmail/PropsModel.ts`

#### ITemplateEmailFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| type | number | Yes |
| tcyId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/templateEmail/TemplateEmailRequestModel.ts`

#### ITemplateEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| content | string | No |
| initialContent | string | Yes |
| contentDelta | string | No |
| type | string | No |
| tcyId | number | No |
| placeholder | string | No |

Source: `src/model/templateEmail/TemplateEmailRequestModel.ts`


## templateSMS (`templateSMS`)

**Service file:** `src/services/TemplateSMSService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/templateSms/list` | src/services/TemplateSMSService.ts |  |
| update | POST | `/adminapi/templateSms/update` | src/services/TemplateSMSService.ts |  |
| detail | GET | `/adminapi/templateSms/get` | src/services/TemplateSMSService.ts |  |
| delete | DELETE | `/adminapi/templateSms/delete` | src/services/TemplateSMSService.ts |  |

### Related DTOs

#### IChooseTemplateSMSModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idBrandname | number | No |
| firstIdBrandname | number | No |
| callBack | any | No |
| onHide | () => void | No |

Source: `src/model/customer/PropsModel.ts`

#### IKpiTemplateFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| startDate | any | Yes |
| endDate | any | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/kpiTemplate/KpiTemplateRequestModel.ts`

#### IKpiTemplateRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| description | string | No |

Source: `src/model/kpiTemplate/KpiTemplateRequestModel.ts`

#### IKpiTemplateResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| description | string | No |
| startDate | any | No |
| endDate | any | No |
| branchId | number | Yes |

Source: `src/model/kpiTemplate/KpiTemplateResponseModel.ts`

#### IAddKpiTemplateModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IKpiTemplateResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/kpiTemplate/PropsModel.ts`


## templateZalo (`templateZalo`)

**Service file:** `src/services/TemplateZaloService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/templateZalo/list` | src/services/TemplateZaloService.ts |  |
| update | POST | `/adminapi/templateZalo/update` | src/services/TemplateZaloService.ts |  |
| detail | GET | `/adminapi/templateZalo/get` | src/services/TemplateZaloService.ts |  |
| delete | DELETE | `/adminapi/templateZalo/delete` | src/services/TemplateZaloService.ts |  |

### Related DTOs

#### ITemplateZaloListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/templateZalo/PropsModel.ts`

#### ITableTemplateZaloProps

| Field | Type | Optional |
|-------|------|----------|
| params | any | No |
| setParams | any | No |
| listSaveSearch | any | No |
| listFilterItem | any | No |
| isLoading | boolean | No |
| listTemplateZalo | ITemplateZaloResponseModel[] | No |
| titles | string[] | No |
| pagination | any | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| listIdChecked | number[] | No |
| bulkActionItems | any | No |
| setListIdChecked | any | No |
| actionsTable | any | No |
| isPermissions | boolean | No |
| setDataTemplateZalo | any | No |
| isNoItem | boolean | No |
| setIsAddEditTemplateZalo | any | No |

Source: `src/model/templateZalo/PropsModel.ts`

#### ITemplateZaloFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| type | number | Yes |
| tcyId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/templateZalo/TemplateZaloRequestModel.ts`

#### ITemplateZaloRequestModel

| Field | Type | Optional |
|-------|------|----------|
| title | string | No |
| content | string | No |
| initialContent | string | Yes |
| contentDelta | string | No |
| type | string | No |
| tcyId | number | No |
| placeholder | string | No |

Source: `src/model/templateZalo/TemplateZaloRequestModel.ts`

#### ITemplateZaloResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| content | string | No |
| contentDelta | string | No |
| employeeId | number | No |
| createdTime | string | No |
| type | number | No |
| tcyId | number | No |
| tcyName | string | No |
| templateName | string | No |

Source: `src/model/templateZalo/TemplateZaloResponseModel.ts`


## zaloOA (`zaloOA`)

**Service file:** `src/services/ZaloOAService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| connect | GET | `/adminapi/zaloOa/connect` | src/services/ZaloOAService.ts |  |
| list | GET | `/adminapi/zaloOa/list` | src/services/ZaloOAService.ts |  |
| delete | DELETE | `/adminapi/zaloOa/remove` | src/services/ZaloOAService.ts |  |
| listZaloFollower | GET | `/adminapi/zaloFollower/list` | src/services/ZaloOAService.ts |  |
| listZaloChat | GET | `/adminapi/zaloChat/list` | src/services/ZaloOAService.ts |  |
| sendZaloChat | POST | `/adminapi/zaloChat/send` | src/services/ZaloOAService.ts |  |
| linkImageSendZaloChat | POST | `/adminapi/zaloChat/send/link_image` | src/services/ZaloOAService.ts |  |
| fileSendZaloChat | POST | `/adminapi/zaloChat/send/file` | src/services/ZaloOAService.ts |  |
| answerSendZaloChat | POST | `/adminapi/zaloChat/send/answer` | src/services/ZaloOAService.ts |  |
| deleteZaloChat | DELETE | `/adminapi/zaloChat/delete` | src/services/ZaloOAService.ts |  |

### Related DTOs

#### ICustomerSendZaloRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### ICustomerZaloFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | Yes |
| requestId | number | Yes |
| customerId | number | Yes |
| status | number | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/customerZalo/CustomerZaloRequestModel.ts`

#### ICustomerZaloResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| bsnId | number | No |
| employeeId | number | No |
| employeeName | string | No |
| customerId | number | No |
| createdTime | string | No |
| content | string | No |
| message | string | No |
| requestId | number | No |
| status | number | No |
| templateId | number | No |
| title | string | No |

Source: `src/model/customerZalo/CustomerZaloResponseModel.ts`

#### ICustomerZaloListProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |
| customerName | string | No |
| onShow | any | No |
| callBack | any | No |

Source: `src/model/customerZalo/PropsModel.ts`

#### IAddCustomerZaloModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idCustomer | number | No |
| data | ICustomerZaloResponseModel | Yes |
| onHide | (reload: boolean) => void | No |
| callback | (codes: object) => void | Yes |
| type | any | Yes |

Source: `src/model/customerZalo/PropsModel.ts`


## znsTemplate (`znsTemplate`)

**Service file:** `src/services/ZnsTemplateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/znsTemplate/list` | src/services/ZnsTemplateService.ts |  |
| updateSync | POST | `/adminapi/znsTemplate/list/sync` | src/services/ZnsTemplateService.ts |  |
| detail | GET | `/adminapi/znsTemplate/get` | src/services/ZnsTemplateService.ts |  |
| delete | DELETE | `/adminapi/znsTemplate/delete` | src/services/ZnsTemplateService.ts |  |
| templateDetail | GET | `/adminapi/znsTemplate/refresh` | src/services/ZnsTemplateService.ts |  |

### Related DTOs

#### AddZnsTemplateModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IZnsTemplateResponse | Yes |
| onHide | (reload: boolean) => void | No |
| zaloOa | any | No |

Source: `src/model/znsTemplate/PropsModel.ts`

#### IZnsTemplateListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/znsTemplate/PropsModel.ts`

#### IZnsTemplateFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/znsTemplate/ZnsTemplateRequestModel.ts`

#### IZnsTemplateRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | string | No |
| oaId | string | Yes |

Source: `src/model/znsTemplate/ZnsTemplateRequestModel.ts`

#### IZnsTemplateResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| templateId | number | No |
| templateName | string | No |
| status | string | No |
| templateQuality | string | No |
| oaId | string | No |
| createdTime | number | string | No |
| bsnId | number | Yes |

Source: `src/model/znsTemplate/ZnsTemplateResponseModel.ts`


# Survey Module


## cxmOption (`cxmOption`)

**Service file:** `src/services/CxmOptionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmOption/list` | src/services/CxmOptionService.ts |  |
| update | POST | `/adminapi/cxmOption/update` | src/services/CxmOptionService.ts |  |
| delete | DELETE | `/adminapi/cxmOption/delete` | src/services/CxmOptionService.ts |  |
| detail | GET | `/adminapi/cxmOption/get` | src/services/CxmOptionService.ts |  |

## cxmQuestion (`cxmQuestion`)

**Service file:** `src/services/CxmQuestionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmQuestion/list` | src/services/CxmQuestionService.ts |  |
| update | POST | `/adminapi/cxmQuestion/update` | src/services/CxmQuestionService.ts |  |
| delete | DELETE | `/adminapi/cxmQuestion/delete` | src/services/CxmQuestionService.ts |  |
| detail | GET | `/adminapi/cxmQuestion/get` | src/services/CxmQuestionService.ts |  |

## surveyForm (`surveyForm`)

**Service file:** `src/services/SurveyFormService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/surveyForm/list` | src/services/SurveyFormService.ts |  |
| update | POST | `/adminapi/surveyForm/update` | src/services/SurveyFormService.ts |  |
| delete | DELETE | `/adminapi/surveyForm/delete` | src/services/SurveyFormService.ts |  |
| detail | GET | `/adminapi/surveyForm/get` | src/services/SurveyFormService.ts |  |
| statistic | GET | `/adminapi/survey` | src/services/SurveyFormService.ts |  |
| submitVoc | POST | `https:` | src/services/SurveyFormService.ts | mock.local/log-capture/crm/survey", |

### Related DTOs

#### ISurveyFormFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/surveyForm/SurveyFormRequestModel.ts`

#### ISurveyFormRequestModel

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| startTime | string | No |
| endTime | string | No |
| link | string | No |
| shortLink | string | No |
| params | string | No |
| form | string | No |
| range | string | No |

Source: `src/model/surveyForm/SurveyFormRequestModel.ts`

#### IISurveyFormResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |

Source: `src/model/surveyForm/SurveyFormResponseModel.ts`


# HR Module


## career (`career`)

**Service file:** `src/services/CareerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/career/list` | src/services/CareerService.ts |  |
| update | POST | `/adminapi/career/update` | src/services/CareerService.ts |  |
| delete | DELETE | `/adminapi/career/delete` | src/services/CareerService.ts |  |

### Related DTOs

#### AddCareerModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ICareerResponse | Yes |
| onHide | (reload: boolean) => void | No |
| custType | any | Yes |

Source: `src/model/career/PropsModel.ts`

#### ICustomerCareerListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/career/PropsModel.ts`


## industry (`industry`)

**Service file:** `src/services/IndustryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https:` | src/services/IndustryService.ts | cloud.mock.local/market/industry/list", |
| update | POST | `https:` | src/services/IndustryService.ts | cloud.mock.local/market/industry/update", |
| detail | GET | `https:` | src/services/IndustryService.ts | cloud.mock.local/market/industry/get", |
| delete | DELETE | `https:` | src/services/IndustryService.ts | cloud.mock.local/market/industry/delete", |

### Related DTOs

#### IIndustryFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/industry/IndustryRequestModel.ts`

#### IIndustryRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| cover | string | No |
| position | string | No |

Source: `src/model/industry/IndustryRequestModel.ts`

#### IIndustryResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| cover | string | No |
| code | string | No |
| position | number | No |

Source: `src/model/industry/IndustryResponseModel.ts`

#### IAddKeyWordIndustryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IIndustryResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/industry/PropsModel.ts`

#### IKeywordIndustryListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/industry/PropsModel.ts`


## unit (`unit`)

**Service file:** `src/services/UnitService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/unit/list` | src/services/UnitService.ts |  |
| update | POST | `/adminapi/unit/update` | src/services/UnitService.ts |  |
| delete | DELETE | `/adminapi/unit/delete` | src/services/UnitService.ts |  |

### Related DTOs

#### ICampaignOpportunityFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| campaignId | number | Yes |
| customerId | number | Yes |
| approachId | number | Yes |
| saleId | number | Yes |
| pipelineId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### ICampaignOpportunityRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| employeeId | number | Yes |
| expectedRevenue | number | Yes |
| startDate | string | Yes |
| endDate | string | Yes |
| sourceId | number | Yes |
| refId | number | Yes |
| customerId | number | Yes |
| campaignId | number | Yes |
| approachId | number | Yes |
| lstCustomerId | number[] | Yes |
| type | string | Yes |
| saleId | number | Yes |
| opportunityId | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### IOpportunityProcessUpdateRequestModel

| Field | Type | Optional |
|-------|------|----------|
| approachId | number | No |
| note | string | No |
| percent | number | string | No |
| status | number | string | No |
| coyId | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### IOpportunityExchangeFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| coyId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`

#### IMessageChatOpportunityProps

| Field | Type | Optional |
|-------|------|----------|
| dataMessage | IOpportunityExchangeResponseModal | No |
| coyId | number | No |
| employeeId | number | No |
| takeHeightTextarea | (height: number) => void | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts`


# Dashboard Module


## report (`report`)

**Service file:** `src/services/ReportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| revenue | GET | `/adminapi/cashbook/statistic` | src/services/ReportService.ts |  |
| employee | GET | `/adminapi/invoice/employee/top` | src/services/ReportService.ts |  |
| product | GET | `/adminapi/invoice/product/top` | src/services/ReportService.ts |  |
| cardService | GET | `/adminapi/invoice/card-service/top` | src/services/ReportService.ts |  |
| service | GET | `/adminapi/invoice/service/top` | src/services/ReportService.ts |  |
| city | GET | `/adminapi/invoice/city/top` | src/services/ReportService.ts |  |
| customer | GET | `/adminapi/cashbook/statistic/customer` | src/services/ReportService.ts |  |

### Related DTOs

#### ICustomerReportProps

| Field | Type | Optional |
|-------|------|----------|
| startTime | string | Yes |
| endTime | string | Yes |
| limit | number | Yes |
| branchId | number | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IDetailCustomerReportProps

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| startTime | string | Yes |
| endTime | string | Yes |
| limit | number | Yes |
| page | number | Yes |
| customerId | number | Yes |
| employeeId | number | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### IDescCustomerReportFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`

#### AddReportTemplateModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IReportTemplateResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/reportTemplate/PropsModel.ts`

#### IProductReportTemplateListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/reportTemplate/PropsModel.ts`


## reportChart (`reportChart`)

**Service file:** `src/services/ReportChartService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| listReportArtifact | GET | `/adminapi/reportArtifact/list` | src/services/ReportChartService.ts |  |
| listArtifactByDashboard | GET | `/adminapi/reportArtifact/list/byDashboard` | src/services/ReportChartService.ts |  |
| listArtifactByEmployee | GET | `/adminapi/reportArtifact/list/byEmployee` | src/services/ReportChartService.ts |  |
| updateReportArtifact | POST | `/adminapi/reportArtifact/update` | src/services/ReportChartService.ts |  |
| deleteReportArtifact | DELETE | `/adminapi/reportArtifact/delete` | src/services/ReportChartService.ts |  |
| listReportDashboard | GET | `/adminapi/reportDashboard/list` | src/services/ReportChartService.ts |  |
| updateReportDashboard | POST | `/adminapi/reportDashboard/update` | src/services/ReportChartService.ts |  |
| deleteReportDashboard | DELETE | `/adminapi/reportDashboard/delete` | src/services/ReportChartService.ts |  |
| listReportRole | GET | `/adminapi/reportRole/list` | src/services/ReportChartService.ts |  |
| updateReportRole | POST | `/adminapi/reportRole/update` | src/services/ReportChartService.ts |  |
| deleteReportRole | DELETE | `/adminapi/reportRole/delete` | src/services/ReportChartService.ts |  |
| updateReportConfig | POST | `/adminapi/reportConfig/update` | src/services/ReportChartService.ts |  |
| deleteReportConfig | DELETE | `/adminapi/reportConfig/delete` | src/services/ReportChartService.ts |  |

## reportCustomer (`reportCustomer`)

**Service file:** `src/services/ReportCustomerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| totalCurentCustomer | GET | `/adminapi/customer/dashboard/getTotal` | src/services/ReportCustomerService.ts |  |
| totalContract | GET | `/adminapi/contract/total/dashboard` | src/services/ReportCustomerService.ts |  |
| totalRevenue | GET | `/adminapi/contract/revenue/dashboard` | src/services/ReportCustomerService.ts |  |
| externalOrnot | GET | `/adminapi/customer/dashboard/externalOrnot` | src/services/ReportCustomerService.ts |  |
| relationShip | GET | `/adminapi/customer/dashboard/relationShip` | src/services/ReportCustomerService.ts |  |
| pipeline | GET | `/adminapi/contract/dashboard/pipeline` | src/services/ReportCustomerService.ts |  |
| notInTimePipeline | GET | `/adminapi/contract/dashboard/notInTime/pipeline` | src/services/ReportCustomerService.ts |  |
| totalCurentCustomerDetail | GET | `/adminapi/customer/dashboard/getTotal/detail` | src/services/ReportCustomerService.ts |  |
| totalContractSignerDetail | GET | `/adminapi/contract/dashboard/notInTime/pipeline/detail` | src/services/ReportCustomerService.ts |  |
| revenueNotYetReceivedDetail | GET | `/adminapi/contract/dashboard/pipeline/detail` | src/services/ReportCustomerService.ts |  |

## reportTemplate (`reportTemplate`)

**Service file:** `src/services/ReportTemplateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/reportTemplate/list` | src/services/ReportTemplateService.ts |  |
| update | POST | `/adminapi/reportTemplate/update` | src/services/ReportTemplateService.ts |  |
| delete | DELETE | `/adminapi/reportTemplate/delete` | src/services/ReportTemplateService.ts |  |

### Related DTOs

#### AddReportTemplateModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IReportTemplateResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/reportTemplate/PropsModel.ts`

#### IProductReportTemplateListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/reportTemplate/PropsModel.ts`

#### IReportTemplateFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| code | string | Yes |

Source: `src/model/reportTemplate/ReportTemplateRequestModel.ts`

#### IReportTemplateRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| link | string | No |
| code | string | Yes |

Source: `src/model/reportTemplate/ReportTemplateRequestModel.ts`

#### IReportTemplateResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| bsnId | number | No |

Source: `src/model/reportTemplate/ReportTemplateResponseModel.ts`


## setting (`setting`)

**Service file:** `src/services/SettingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/setting/list` | src/services/SettingService.ts |  |
| update | POST | `/adminapi/setting/update` | src/services/SettingService.ts |  |
| delete | DELETE | `/adminapi/setting/delete` | src/services/SettingService.ts |  |

### Related DTOs

#### AddSettingProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ISettingResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/setting/PropsModel.ts`

#### ISettingFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/setting/SettingRequestModel.ts`

#### ISettingRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| type | string | Yes |
| value | string | No |
| code | string | Yes |
| fmtStartDate | string | null | Yes |
| fmtEndDate | string | null | Yes |
| endDate | string | null | Yes |
| startDate | string | null | Yes |

Source: `src/model/setting/SettingRequestModel.ts`

#### ISettingResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| type | string | No |
| value | string | No |
| code | string | No |
| fmtStartDate | string | null | No |
| fmtEndDate | string | null | No |
| endDate | string | null | No |
| startDate | string | null | No |

Source: `src/model/setting/SettingResponseModel.ts`

#### IAddSettingWarrantyModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IWarrantyCategoryResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/warrantyCategory/PropsModel.ts`


# FileManagement Module


## file (`file`)

**Service file:** `src/services/FileService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| upload | GET | `/api/upload/file` | - |  |

### Related DTOs

#### IWorkOrderDocFile

| Field | Type | Optional |
|-------|------|----------|
| url | string | No |
| type | string | Yes |
| name | string | Yes |
| size | number | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`


## image (`image`)

**Service file:** `src/services/ImageService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| upload | GET | `https:` | src/services/ImageService.ts | login.mock.local/api/upload/image", |
| uploadmock | GET | `/api/upload/file` | src/services/ImageService.ts |  |
| uploadNoron | GET | `https:` | src/services/ImageService.ts | login.mock.local/api/upload/file", |

### Related DTOs

#### IModalAddImageProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | () => void | No |
| callback | (lstUrl: string[]) => void | Yes |

Source: `src/model/editor/PropsModel.ts`

#### IEditImageModal

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| image | string | No |
| width | number | string | Yes |
| height | number | string | Yes |
| desc | string | Yes |
| link | string | Yes |
| imgAlign | string | Yes |
| onHide | () => void | No |
| onUpdate | (newUrl, link, width, height, desc, imgAlign) => void | No |

Source: `src/model/editor/PropsModel.ts`


# Other Module


## adjustmentSlip (`adjustmentSlip`)

**Service file:** `src/services/AdjustmentSlipService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| temp | GET | `https://mock.local/warehouse/stockAdjust/temp` | - |  |
| createAdjSlip | POST | `https://mock.local/warehouse/stockAdjust/create` | - |  |
| addUpdatePro | POST | `https://mock.local/warehouse/stockAdjustDetail/update` | - |  |
| approved | POST | `https://mock.local/warehouse/stockAdjust/approved` | - |  |
| cancel | POST | `https://mock.local/warehouse/stockAdjust/cancel` | - |  |
| view | GET | `https://mock.local/warehouse/stockAdjust/view` | - |  |
| list | GET | `https://mock.local/warehouse/stockAdjust/list` | - |  |
| warehouse | GET | `https://mock.local/warehouse/warehouse/list` | - |  |
| deletePro | DELETE | `https://mock.local/warehouse/stockAdjustDetail/delete` | - |  |

### Related DTOs

#### IAdjustmentSlipFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| status | number | Yes |
| inventoryId | number | Yes |

Source: `src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts`

#### IAdjustmentSlipRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| inventoryId | number | No |

Source: `src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts`

#### IViewAdjustmentSlipProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |
| idAdjustment | number | No |
| type | string | No |
| name | string | No |

Source: `src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts`

#### IAdjustmentSlipResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| code | string | No |
| createdTime | string | No |
| created_at | string | No |
| creatorId | string | No |
| creatorName | string | No |
| status | number | No |
| inventoryId | number | No |
| inventoryName | string | No |
| bsnId | number | No |

Source: `src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts`

#### IDetailAdjustmentSlipResponse

| Field | Type | Optional |
|-------|------|----------|
| satId | number | No |
| stockAdjust | IAdjustmentSlipResponse | No |
| stockAdjustDetails | IStockAdjustDetails[] | No |

Source: `src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts`


## analysis (`analysis`)

**Service file:** `src/services/AnalysisService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https:` | - | cloud.mock.local/market/article/list", |
| detail | GET | `https:` | - | cloud.mock.local/market/article/get", |

### Related DTOs

#### IAnalysisFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| sourceId | string | Yes |
| keyword | string | Yes |
| fromDate | string | Yes |
| toDate | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/analysis/AnalysisRequestModel.ts`

#### IAnalysisResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| url | string | No |
| domain | string | No |
| sourceId | string | No |
| firstCrawledTime | string | No |
| lastCrawledTime | string | No |
| lastUpdatedTime | string | No |
| publishedTime | string | No |
| publishedTimestamp | string | No |
| title | string | No |
| summary | string | No |
| content | string | No |
| imageSource | string | No |
| videoSource | string | No |
| commentId | number | No |
| commentCount | number | No |
| replyCount | string | No |
| likeCount | number | No |
| reachCount | number | No |
| shareCount | number | No |
| shareContent | string | No |
| wallId | number | No |
| wallDisplayName | string | No |
| authorId | number | No |
| authorDisplayName | string | No |
| authorBirthYear | string | No |
| authorGender | string | No |
| articleType | string | No |
| postId | string | No |
| partnerId | string | No |
| createdTime | string | No |

Source: `src/model/analysis/AnalysisResponseModel.ts`


## application (`application`)

**Service file:** `src/services/ApplicationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/api/orgApp/list` | - |  |
| lstAll | GET | `/api/orgApp/list/all` | - |  |
| confirmBill | GET | `/api/orgApp/payment/verify` | - |  |
| update | POST | `/api/organization/update` | - |  |
| detail | GET | `/api/beautySalon/get` | - |  |

### Related DTOs

#### IInstallApplicationFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/installApplication/InstallApplicationRequestModel.ts`

#### IInstallApplicationRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| avatar | string | No |
| clientId | string | No |
| clientKey | string | No |
| status | string | No |

Source: `src/model/installApplication/InstallApplicationRequestModel.ts`

#### IInstallApplicationResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| avatar | string | No |
| name | string | No |
| clientId | string | No |
| clientKey | string | No |
| status | string | No |
| whitelistDomains | string | No |

Source: `src/model/installApplication/InstallApplicationResponseModel.ts`

#### IAddApplicationModalProps

| Field | Type | Optional |
|-------|------|----------|
| data | IInstallApplicationResponse | Yes |
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/installApplication/PropsModel.ts`


## bpmField (`bpmField`)

**Service file:** `src/services/BpmFieldService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/field/list` | src/services/FieldListService.ts |  |
| update | POST | `/application/field/update` | src/services/FieldListService.ts |  |
| updateStatus | POST | `/application/field/update/status` | src/services/FieldListService.ts |  |
| detail | GET | `/application/field/get` | src/services/FieldListService.ts |  |
| delete | DELETE | `/application/field/delete` | src/services/FieldListService.ts |  |

## bpmInvestor (`bpmInvestor`)

**Service file:** `src/services/BpmInvestorService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/investor/list` | src/services/InvestorService.ts |  |
| update | POST | `/application/investor/update` | src/services/InvestorService.ts |  |
| updateStatus | POST | `/application/investor/update/status` | src/services/InvestorService.ts |  |
| detail | GET | `/application/investor/get` | src/services/InvestorService.ts |  |
| delete | DELETE | `/application/investor/delete` | src/services/InvestorService.ts |  |

## brandName (`brandName`)

**Service file:** `src/services/BrandNameService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/brandname/list` | src/services/BrandNameService.ts |  |
| update | POST | `/adminapi/brandname/update` | src/services/BrandNameService.ts |  |
| detail | GET | `/adminapi/brandname/get` | src/services/BrandNameService.ts |  |
| delete | DELETE | `/adminapi/brandname/delete` | src/services/BrandNameService.ts |  |
| listWhiteList | GET | `/adminapi/whitelist/brandname/contact/list` | src/services/BrandNameService.ts |  |
| updateWhiteList | POST | `/adminapi/whitelist/brandname/contact/update` | src/services/BrandNameService.ts |  |
| deleteWhiteList | DELETE | `/adminapi/whitelist/brandname/contact/delete` | src/services/BrandNameService.ts |  |
| changeStatusWhiteList | GET | `/adminapi/whitelist/brandname/update` | src/services/BrandNameService.ts |  |

### Related DTOs

#### IBrandNameFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/brandName/BrandNameRequestModel.ts`

#### IBrandNameRequestModel

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| expiredDate | string | No |
| partnerId | number | No |
| partnerConfig | string | No |

Source: `src/model/brandName/BrandNameRequestModel.ts`

#### IBrandNameResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| expiredDate | string | No |
| partnerId | number | No |
| partnerName | string | No |
| partnerConfig | string | No |
| status | any | Yes |
| whitelist | any | Yes |

Source: `src/model/brandName/BrandNameResponseModel.ts`

#### IAddBrandNameModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IBrandNameResponseModel | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/brandName/PropsModel.ts`

#### IBrandNameListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/brandName/PropsModel.ts`


## briefFinancialReport (`briefFinancialReport`)

**Service file:** `src/services/BriefFinancialReportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/briefFinancialReport/list` | src/services/fintech/BriefFinancialReportService.ts |  |
| update | POST | `https://mock.local/finance/briefFinancialReport/update` | src/services/fintech/BriefFinancialReportService.ts |  |
| get | GET | `https://mock.local/finance/briefFinancialReport/get` | src/services/fintech/BriefFinancialReportService.ts |  |
| delete | DELETE | `https://mock.local/finance/briefFinancialReport/delete` | src/services/fintech/BriefFinancialReportService.ts |  |

## callCenter (`callCenter`)

**Service file:** `src/services/CallCenterService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| makeCall | GET | `/adminapi/callCenter/makeCall` | src/services/DoctorQnAService.ts |  |
| getHistory | GET | `/adminapi/callCenter/getHistory` | src/services/DoctorQnAService.ts |  |
| getHistoryByCallId | GET | `/adminapi/callCenter/getHistoryByCallId` | src/services/DoctorQnAService.ts |  |
| transferCall | GET | `/adminapi/callCenter/transferCall` | src/services/DoctorQnAService.ts |  |
| hangupCall | GET | `/adminapi/callCenter/hangupCall` | src/services/DoctorQnAService.ts |  |
| makeCallOTP | GET | `/adminapi/callCenter/makeCallOTP` | src/services/DoctorQnAService.ts |  |
| customerCallList | GET | `/adminapi/customerCall/list` | src/services/DoctorQnAService.ts |  |

## campaignApproach (`campaignApproach`)

**Service file:** `src/services/CampaignApproachService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/campaignApproach/list` | - |  |
| update | POST | `/adminapi/campaignApproach/update` | - |  |
| detail | GET | `/adminapi/campaignApproach/get` | - |  |
| delete | DELETE | `/adminapi/campaignApproach/delete` | - |  |
| updateSLA | POST | `/adminapi/campaignApproach/update/sla` | - |  |
| activityList | GET | `/adminapi/campaignActivity/list` | - |  |
| updateActivity | POST | `/adminapi/campaignActivity/update` | - |  |
| deleteActivity | DELETE | `/adminapi/campaignActivity/delete` | - |  |

### Related DTOs

#### ICampaignApproachFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| campaignId | number | Yes |

Source: `src/model/campaignApproach/CampaignApproachRequestModel.ts`

#### ICampaignApproachRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | Yes |
| step | number | Yes |
| activities | string | Yes |
| campaignId | number | Yes |

Source: `src/model/campaignApproach/CampaignApproachRequestModel.ts`

#### ICampaignApproachResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| step | number | No |
| campaignId | number | No |
| campaignName | string | Yes |
| activities | string | No |

Source: `src/model/campaignApproach/CampaignApproachResponseModel.ts`

#### IAddCampaignApproachModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| idData | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/campaignApproach/PropsModel.ts`


## cardServiceIdApi (`cardServiceIdApi`)

**Service file:** `src/services/CardServiceIdApiService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/cardService/list` | src/services/CardServiceIdApiService.ts |  |

## chatbot (`chatbot`)

**Service file:** `src/services/ChatbotService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/chatlog/list` | src/services/ChatBotService.ts |  |
| update | POST | `/adminapi/chatgpt/chat` | src/services/ChatBotService.ts |  |

## codeSequence (`codeSequence`)

**Service file:** `src/services/CodeSequenceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/codeSequence/list` | src/services/CodeService.ts |  |
| update | POST | `/adminapi/codeSequence/update` | src/services/CodeService.ts |  |
| detail | GET | `/adminapi/codeSequence/get` | src/services/CodeService.ts |  |
| delete | DELETE | `/adminapi/codeSequence/delete` | src/services/CodeService.ts |  |
| detailEntity | GET | `/adminapi/codeSequence/get/entity` | src/services/CodeService.ts |  |

## common (`common`)

**Service file:** `src/services/CommonService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/common/list` | src/services/ArtifactService.ts |  |
| update | POST | `/adminapi/common/update` | src/services/ArtifactService.ts |  |
| delete | DELETE | `/adminapi/common/delete` | src/services/ArtifactService.ts |  |

### Related DTOs

#### IUpdateCommonRequest

| Field | Type | Optional |
|-------|------|----------|
| lstId | string | No |
| cgpId | number | No |
| relationshipId | number | No |
| sourceId | number | No |
| employeeId | number | No |

Source: `src/model/customer/CustomerRequestModel.ts`

#### UpdateCommonModalProps

| Field | Type | Optional |
|-------|------|----------|
| titleProps | string | No |
| listId | number[] | No |
| onShow | boolean | No |
| isActiveCustomerGroup | boolean | No |
| isActiveCustomeRelationship | boolean | No |
| isActiveCustomerSource | boolean | No |
| isActiveCustomerEmployee | boolean | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/customer/PropsModel.ts`


## configCode (`configCode`)

**Service file:** `src/services/ConfigCodeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/globalConfig/list` | src/services/ConfigCodeService.ts |  |
| update | POST | `/adminapi/globalConfig/update` | src/services/ConfigCodeService.ts |  |
| detail | GET | `/adminapi/globalConfig/get` | src/services/ConfigCodeService.ts |  |
| delete | DELETE | `/adminapi/globalConfig/delete` | src/services/ConfigCodeService.ts |  |

### Related DTOs

#### AddConfigCodeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IConfigCodeResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/configCode/PropsModel.ts`


## connectGmail (`connectGmail`)

**Service file:** `src/services/ConnectGmailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| connect | POST | `https:` | src/services/ConnectGmailService.ts | connect.mock.local/api/v1/google/access-token", |
| checkConnect | POST | `https:` | src/services/ConnectGmailService.ts | connect.mock.local/api/v1/google/gmails-link-bsn", |

## contractApproach (`contractApproach`)

**Service file:** `src/services/ContractApproachService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractApproach/list` | - |  |
| update | POST | `/adminapi/contractApproach/update` | - |  |
| detail | GET | `/adminapi/contractApproach/get` | - |  |
| delete | DELETE | `/adminapi/contractApproach/delete` | - |  |
| activityList | GET | `/adminapi/contractActivity/list` | - |  |
| updateActivity | POST | `/adminapi/contractActivity/update` | - |  |
| deleteActivity | DELETE | `/adminapi/contractActivity/delete` | - |  |

### Related DTOs

#### IContractApproachRequest

| Field | Type | Optional |
|-------|------|----------|
| pipelineId | number | No |
| name | string | No |
| step | number | No |

Source: `src/model/contractApproach/ContractApproachRequestModel.ts`

#### IContractApproachResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| pipelineId | number | No |
| name | string | No |
| step | number | No |

Source: `src/model/contractApproach/ContractApproachResponseModel.ts`

#### IContractApproachModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| infoPipeline | any | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/contractApproach/PropsModel.ts`

#### IAddContractApproachProps

| Field | Type | Optional |
|-------|------|----------|
| data | IContractApproachResponse | No |
| infoPipeline | any | No |
| onReload | (reload: boolean) => void | No |

Source: `src/model/contractApproach/PropsModel.ts`

#### ITableContractApproachProps

| Field | Type | Optional |
|-------|------|----------|
| isLoading | boolean | No |
| listContractApproach | IContractApproachResponse[] | No |
| titles | string[] | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| actionsTable | any | No |
| setIsActiveForm | any | No |
| isPermissions | boolean | No |

Source: `src/model/contractApproach/PropsModel.ts`


## contractProgress (`contractProgress`)

**Service file:** `src/services/ContractProgressService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractProgress/list` | - |  |
| update | POST | `/adminapi/contractProgress/update` | - |  |
| detail | GET | `/adminapi/contractProgress/get` | - |  |
| delete | DELETE | `/adminapi/contractProgress/delete` | - |  |

## contractStage (`contractStage`)

**Service file:** `src/services/ContractStageService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractStage/list` | src/services/ContractStageService.ts |  |
| update | POST | `/adminapi/contractStage/update` | src/services/ContractStageService.ts |  |
| detail | GET | `/adminapi/contractStage/get` | src/services/ContractStageService.ts |  |
| delete | DELETE | `/adminapi/contractStage/delete` | src/services/ContractStageService.ts |  |

## contractWarranty (`contractWarranty`)

**Service file:** `src/services/ContractWarrantyService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractWarranty/list` | - |  |
| update | POST | `/adminapi/contractWarranty/update` | - |  |
| detail | GET | `/adminapi/contractWarranty/get` | - |  |
| delete | DELETE | `/adminapi/contractWarranty/delete` | - |  |
| warrantyTypeList | GET | `/adminapi/contractWarrantyType/list` | - |  |
| warrantyTypeUpdate | POST | `/adminapi/contractWarrantyType/update` | - |  |
| warrantyTypeDelete | DELETE | `/adminapi/contractWarrantyType/delete` | - |  |
| competencyList | GET | `/adminapi/competency/list` | - |  |
| competencyUpdate | POST | `/adminapi/competency/update` | - |  |
| competencyDelete | DELETE | `/adminapi/competency/delete` | - |  |
| bankList | GET | `/adminapi/bank/list` | - |  |
| bankUpdate | POST | `/adminapi/bank/update` | - |  |
| bankDelete | DELETE | `/adminapi/bank/delete` | - |  |
| exAttributes | GET | `/adminapi/contractWarranty/export/attributes` | - |  |
| numberFieldWarranty | GET | `/adminapi/contractWarranty/export/randomContractWarranty` | - |  |
| autoProcess | GET | `/adminapi/contractWarranty/import/autoProcess` | - |  |
| downloadFile | GET | `/adminapi/contractWarranty/import` | - |  |

## contractorPayment (`contractorPayment`)

**Service file:** `src/services/ContractorPaymentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractInvestorPayment/list` | - |  |
| update | POST | `/adminapi/contractInvestorPayment/update` | - |  |
| detail | GET | `/adminapi/contractInvestorPayment/get` | - |  |
| delete | DELETE | `/adminapi/contractInvestorPayment/delete` | - |  |

## cxmQuestionCondition (`cxmQuestionCondition`)

**Service file:** `src/services/CxmQuestionConditionService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmQuestionCondition/list` | - |  |
| update | POST | `/adminapi/cxmQuestionCondition/update` | - |  |
| delete | DELETE | `/adminapi/cxmQuestionCondition/delete` | - |  |
| detail | GET | `/adminapi/cxmQuestionCondition/get` | - |  |

## cxmResponse (`cxmResponse`)

**Service file:** `src/services/CxmResponseService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmResponse/list` | - |  |
| update | POST | `/adminapi/cxmResponse/update` | - |  |
| delete | DELETE | `/adminapi/cxmResponse/delete` | - |  |
| detail | GET | `/adminapi/cxmResponse/get` | - |  |

## cxmResponseDetail (`cxmResponseDetail`)

**Service file:** `src/services/CxmResponseDetailService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmResponseDetail/list` | - |  |
| update | POST | `/adminapi/cxmResponseDetail/update` | - |  |
| delete | DELETE | `/adminapi/cxmResponseDetail/delete` | - |  |
| detail | GET | `/adminapi/cxmResponseDetail/get` | - |  |

## cxmSurvey (`cxmSurvey`)

**Service file:** `src/services/CxmSurveyService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/cxmSurvey/list` | src/services/CxmSurveyService.ts |  |
| update | POST | `/adminapi/cxmSurvey/update` | src/services/CxmSurveyService.ts |  |
| delete | DELETE | `/adminapi/cxmSurvey/delete` | src/services/CxmSurveyService.ts |  |
| detail | GET | `/adminapi/cxmSurvey/get` | src/services/CxmSurveyService.ts |  |

## dataSupplySource (`dataSupplySource`)

**Service file:** `src/services/DataSupplySourceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/filter-setting/list` | - |  |

## electricityMeter (`electricityMeter`)

**Service file:** `src/services/ElectricityMeterService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/electricMeter/list` | - |  |
| update | POST | `https://mock.local/operation/electricMeter/update` | - |  |
| detail | GET | `https://mock.local/operation/electricMeter/get` | - |  |
| delete | DELETE | `https://mock.local/operation/electricMeter/delete` | - |  |

## electricityRate (`electricityRate`)

**Service file:** `src/services/ElectricityRateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/electricityRate/list` | - |  |
| update | POST | `https://mock.local/operation/electricityRate/update` | - |  |
| detail | GET | `https://mock.local/operation/electricityRate/get` | - |  |
| delete | DELETE | `https://mock.local/operation/electricityRate/delete` | - |  |

## emailConfig (`emailConfig`)

**Service file:** `src/services/EmailConfigService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/emailConfig/list` | src/services/EmailConfigService.ts |  |
| update | POST | `/adminapi/emailConfig/update` | src/services/EmailConfigService.ts |  |
| detail | GET | `/adminapi/emailConfig/get` | src/services/EmailConfigService.ts |  |
| delete | DELETE | `/adminapi/emailConfig/delete` | src/services/EmailConfigService.ts |  |
| checkEmail | POST | `/adminapi/email/testConnection` | src/services/EmailConfigService.ts |  |

## fanpageFacebook (`fanpageFacebook`)

**Service file:** `src/services/FanpageFacebookService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| connect | GET | `/adminapi/fanpage/connect` | src/services/FanpageFacebookService.ts |  |
| list | GET | `/adminapi/fanpage/list` | src/services/FanpageFacebookService.ts |  |
| update | POST | `/adminapi/fanpage/update` | src/services/FanpageFacebookService.ts |  |
| delete | DELETE | `/adminapi/fanpage/remove` | src/services/FanpageFacebookService.ts |  |
| listFanpage | GET | `/adminapi/fanpage/list` | src/services/FanpageFacebookService.ts |  |
| listFanpageDialog | GET | `/adminapi/fanpageDialog/list` | src/services/FanpageFacebookService.ts |  |
| listFanpageChat | GET | `/adminapi/fanpageChat/list` | src/services/FanpageFacebookService.ts |  |
| replyFanpageChat | POST | `/adminapi/fanpageChat/reply` | src/services/FanpageFacebookService.ts |  |
| listFanpageComment | GET | `/adminapi/fanpageComment/list` | src/services/FanpageFacebookService.ts |  |
| replyFanpageComment | POST | `/adminapi/fanpageComment/reply` | src/services/FanpageFacebookService.ts |  |
| deleteFanpageComment | DELETE | `/adminapi/fanpageComment/delete` | src/services/FanpageFacebookService.ts |  |
| hiddenFanpageComment | DELETE | `/adminapi/fanpageComment/hidden` | src/services/FanpageFacebookService.ts |  |
| fanpagePost | GET | `/adminapi/fanpagePost/get` | src/services/FanpageFacebookService.ts |  |
| fanpageChatSendAttachment | POST | `/adminapi/fanpageChat/send/attachment` | src/services/FanpageFacebookService.ts |  |

### Related DTOs

#### IFanpageFacebookFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/fanpageFacebook/FanpageFacebookRequestModel.ts`

#### IFanpageFacebookRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | Yes |
| _fanpage_id | string | Yes |
| accessToken | string | Yes |
| userAccessToken | string | Yes |
| bsnId | number | Yes |

Source: `src/model/fanpageFacebook/FanpageFacebookRequestModel.ts`

#### IFanpageFacebookResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| _fanpage_id | string | No |
| accessToken | string | No |
| bsnId | number | No |

Source: `src/model/fanpageFacebook/FanpageResponseModel.ts`

#### ITableFanpageFacebookProps

| Field | Type | Optional |
|-------|------|----------|
| listFanpageFacebook | IFanpageFacebookResponse[] | No |
| isLoading | boolean | No |
| isPermissionsFacebook | boolean | No |
| dataPagination | any | No |
| callback | any | No |

Source: `src/model/fanpageFacebook/PropsModel.ts`


## field (`field`)

**Service file:** `src/services/FieldService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/field/list` | - |  |
| update | POST | `/api/field/update` | - |  |
| detail | GET | `/api/field/get` | - |  |
| delete | DELETE | `/api/field/delete` | - |  |

### Related DTOs

#### IFieldCustomize

| Field | Type | Optional |
|-------|------|----------|
| label | string | ReactElement | No |
| labelPosition | "left" | Yes |
| labelHidden | boolean | Yes |
| fill | boolean | Yes |
| type | "select" | "date" | "checkbox" | "radio" | "tags" | "number" | "text" | "password" | "textarea" | "editor" | "custom" | No |
| name | string | No |
| disabled | boolean | Yes |
| placeholder | string | Yes |
| onFocus | any | Yes |
| value | string | Yes |
| onChange | any | Yes |
| onChangeContent | any | Yes |
| onClick | any | Yes |
| onBlur | any | Yes |
| onKeyDown | any | Yes |
| onKeyUp | any | Yes |
| onKeyPress | any | Yes |
| className | string | Yes |
| required | boolean | Yes |
| readOnly | boolean | Yes |
| maxLength | number | Yes |
| refElement | any | Yes |
| autoComplete | string | Yes |
| regex | RegExp | Yes |
| isMaxDate | boolean | Yes |
| isMinDate | boolean | Yes |
| isFmtText | boolean | Yes |
| nameOptions | string | Yes |
| onChangeValueOptions | any | Yes |
| suffixes | string | Yes |
| currency | string | Yes |
| thousandSeparator | boolean | Yes |
| maxValue | number | Yes |
| minValue | number | Yes |
| allowNegative | boolean | Yes |
| allowLeadingZeros | boolean | Yes |
| isButton | boolean | Yes |
| isDecimalScale | boolean | Yes |
| options | IOption[] | Yes |
| isLoading | boolean | Yes |
| isSearchable | boolean | Yes |
| onMenuOpen | any | Yes |
| isFormatOptionLabel | boolean | Yes |
| formatOptionLabel | any | Yes |
| tagsData | string[] | Yes |
| acceptPaste | boolean | Yes |
| isWarning | boolean | Yes |
| messageWarning | string | Yes |
| messageErrorRegex | string | Yes |
| isAsync | boolean | Yes |
| loadOptions | () => void | Yes |
| icon | React.ReactElement | Yes |
| iconPosition | "left" | "right" | Yes |
| iconClickEvent | React.ReactEventHandler | Yes |
| hasSelectTime | boolean | Yes |
| calculatorTime | boolean | Yes |
| minDate | any | Yes |
| maxDate | any | Yes |
| fillColor | boolean | Yes |
| snippet | React.ReactElement | Yes |
| saveEditor | any | Yes |

Source: `src/model/FormModel.ts`

#### IContactFieldFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contact/ContactRequestModel.ts`

#### IContractFieldFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/contract/ContractRequestModel.ts`

#### IFieldCustomerFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`


## fs (`fs`)

**Service file:** `src/services/FsService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `/adminapi/fs/list` | src/services/FSQuoteService.ts |  |
| update | POST | `/adminapi/fs/update` | src/services/FSQuoteService.ts |  |
| updateAndInit | POST | `/adminapi/fs/update-and-init` | src/services/FSQuoteService.ts |  |
| delete | DELETE | `/adminapi/fs/delete` | src/services/FSQuoteService.ts |  |
| detail | GET | `/adminapi/fs/get` | src/services/FSQuoteService.ts |  |
| cloneFs | POST | `/adminapi/fs/clone` | src/services/FSQuoteService.ts |  |
| updateStatus | POST | `/adminapi/fs/update/status` | src/services/FSQuoteService.ts |  |
| resetSignal | POST | `/adminapi/approvalObject/reset` | src/services/FSQuoteService.ts |  |
| fsFormLst | GET | `/adminapi/fsForm/list` | src/services/FSQuoteService.ts |  |
| fsFormUpdate | POST | `/adminapi/fsForm/update` | src/services/FSQuoteService.ts |  |
| fsFormDelete | DELETE | `/adminapi/fsForm/delete` | src/services/FSQuoteService.ts |  |
| fsFormUpdatePostion | POST | `/adminapi/fsForm/update/position` | src/services/FSQuoteService.ts |  |

## fullFinancialReport (`fullFinancialReport`)

**Service file:** `src/services/FullFinancialReportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/fullFinancialReport/list` | src/services/fintech/FullFinancialReportService.ts |  |
| update | POST | `https://mock.local/finance/fullFinancialReport/update` | src/services/fintech/FullFinancialReportService.ts |  |
| get | GET | `https://mock.local/finance/fullFinancialReport/get` | src/services/fintech/FullFinancialReportService.ts |  |
| delete | DELETE | `https://mock.local/finance/fullFinancialReport/delete` | src/services/fintech/FullFinancialReportService.ts |  |

## functionalManagement (`functionalManagement`)

**Service file:** `src/services/FunctionalManagementService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/resource/list` | src/services/FunctionalManagementService.ts |  |
| update | POST | `/adminapi/resource/update` | src/services/FunctionalManagementService.ts |  |
| detail | GET | `/adminapi/resource/get` | src/services/FunctionalManagementService.ts |  |
| delete | DELETE | `/adminapi/resource/delete` | src/services/FunctionalManagementService.ts |  |
| freeResource | GET | `/adminapi/resource/list_ex` | src/services/FunctionalManagementService.ts |  |

### Related DTOs

#### IFunctionalManagementListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/functionalManagement/PropsModel.ts`

#### IAddFunctionalManagementModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IFunctionalManagementResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/functionalManagement/PropsModel.ts`


## gift (`gift`)

**Service file:** `src/services/GiftService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/gift/list` | - |  |
| update | POST | `/adminapi/gift/update` | - |  |
| updateObjectId | POST | `/adminapi/gift/update_objectid` | - |  |
| delete | DELETE | `/adminapi/gift/delete` | - |  |

### Related DTOs

#### IGiftFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/gift/GiftRequestModel.ts`

#### IGiftRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| objectId | number | No |
| objectType | string | No |
| startDate | string | No |
| endDate | string | No |
| cover | string | No |
| content | string | No |

Source: `src/model/gift/GiftRequestModel.ts`

#### IGiftServiceEventRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| address | string | No |
| prerequisite | string | No |
| prerequisiteDelta | string | No |
| serviceDiscount | string | No |

Source: `src/model/gift/GiftRequestModel.ts`

#### IGiftSeoRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| pageTitle | string | No |
| pageLink | string | No |
| pageDescription | string | No |
| pageKeyword | string | No |

Source: `src/model/gift/GiftRequestModel.ts`

#### IGiftCheckLinkRequest

| Field | Type | Optional |
|-------|------|----------|
| link | string | Yes |
| id | number | Yes |

Source: `src/model/gift/GiftRequestModel.ts`


## guaranteeAttachment (`guaranteeAttachment`)

**Service file:** `src/services/GuaranteeAttachmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| guaranteeAttachmentList | GET | `/adminapi/guaranteeAttachment/list` | - |  |
| guaranteeAttachmentUpdate | POST | `/adminapi/guaranteeAttachment/update` | - |  |
| guaranteeAttachmentDelete | DELETE | `/adminapi/guaranteeAttachment/delete` | - |  |

## guaranteeAttribute (`guaranteeAttribute`)

**Service file:** `src/services/GuaranteeAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/guaranteeAttribute/list` | - |  |
| update | POST | `/adminapi/guaranteeAttribute/update` | - |  |
| delete | DELETE | `/adminapi/guaranteeAttribute/delete` | - |  |
| listAll | GET | `/adminapi/guaranteeAttribute/listAll` | - |  |
| checkDuplicated | POST | `/adminapi/guaranteeAttribute/checkDuplicated` | - |  |

## guaranteeExtraInfo (`guaranteeExtraInfo`)

**Service file:** `src/services/GuaranteeExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/guaranteeExtraInfo/list` | - |  |

## installApp (`installApp`)

**Service file:** `src/services/InstallAppService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/app/list` | src/services/InstallApplicationService.ts |  |
| update | POST | `/adminapi/app/update` | src/services/InstallApplicationService.ts |  |
| delete | DELETE | `/adminapi/app/delete` | src/services/InstallApplicationService.ts |  |
| detail | GET | `/adminapi/app/get` | src/services/InstallApplicationService.ts |  |
| takeKey | GET | `/adminapi/app/get/key` | src/services/InstallApplicationService.ts |  |

### Related DTOs

#### IInstallApplicationFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/installApplication/InstallApplicationRequestModel.ts`

#### IInstallApplicationRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| avatar | string | No |
| clientId | string | No |
| clientKey | string | No |
| status | string | No |

Source: `src/model/installApplication/InstallApplicationRequestModel.ts`

#### IInstallApplicationResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| avatar | string | No |
| name | string | No |
| clientId | string | No |
| clientKey | string | No |
| status | string | No |
| whitelistDomains | string | No |

Source: `src/model/installApplication/InstallApplicationResponseModel.ts`


## integration (`integration`)

**Service file:** `src/services/IntegrationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/integrationPartner/list` | src/services/IntegrationPartnerService.ts |  |
| update | POST | `/adminapi/integrationConfig/update` | src/services/IntegrationPartnerService.ts |  |
| updateStatus | POST | `/adminapi/integrationLog/update/status` | src/services/IntegrationPartnerService.ts |  |
| delete | DELETE | `/adminapi/integrationConfig/delete` | src/services/IntegrationPartnerService.ts |  |
| logList | GET | `/adminapi/integrationLog/list` | src/services/IntegrationPartnerService.ts |  |

## invoice (`invoice`)

**Service file:** `src/services/InvoiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/invoice/list/v2` | src/services/InvoiceService.ts |  |
| create | POST | `/adminapi/invoice/create` | src/services/InvoiceService.ts |  |
| invoiceDetail | GET | `/adminapi/invoiceDetail/import` | src/services/InvoiceService.ts |  |
| cardService | GET | `/adminapi/invoiceDetail/cardService` | src/services/InvoiceService.ts |  |
| invoiceDetailCustomer | GET | `/adminapi/invoiceDetail/customer` | src/services/InvoiceService.ts |  |
| invoiceDetailList | GET | `/adminapi/invoiceDetail/list` | src/services/InvoiceService.ts |  |
| cancelInvoice | POST | `/adminapi/invoice/delete` | src/services/InvoiceService.ts |  |
| sales | GET | `/adminapi/invoice/get/sales` | src/services/InvoiceService.ts |  |
| debtInvoice | GET | `/adminapi/invoice/debt` | src/services/InvoiceService.ts |  |
| temporarilyInvoice | POST | `/adminapi/invoice/update/temp` | src/services/InvoiceService.ts |  |
| historyUseCard | GET | `/adminapi/invoice/using/card` | src/services/InvoiceService.ts |  |
| invoiceCode | GET | `/adminapi/invoice/code` | src/services/InvoiceService.ts |  |

### Related DTOs

#### IBoughtProductToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| productId | number | No |
| batchNo | string | Yes |
| unitId | number | No |
| price | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| qty | number | No |
| saleId | number | No |
| fee | number | No |
| note | string | Yes |
| customerId | number | No |
| invoiceId | number | No |

Source: `src/model/boughtProduct/BoughtProductRequestModel.ts`

#### IBoughtProductToInvoiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceCode | string | No |
| customerName | string | No |
| customerPhone | string | No |
| orderDate | string | No |
| receiptDate | string | No |
| name | string | No |
| qty | number | No |
| fee | number | No |

Source: `src/model/boughtProduct/BoughtProductResponseModel.ts`

#### IBoughtServiceToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| serviceId | number | No |
| qty | number | No |
| note | string | Yes |
| price | number | No |
| retail | number | No |
| retailPrice | number | No |
| packageType | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| saleEmployeeId | number | Yes |
| invoiceId | number | No |

Source: `src/model/boughtService/BoughtServiceRequestModel.ts`

#### ICustomerInvoiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| account | string | No |
| amount | number | No |
| amountCard | number | No |
| branchId | number | No |
| bsnId | number | No |
| customerId | number | No |
| customerName | string | No |
| debt | number | No |
| discount | number | No |
| employeeId | number | No |
| employeeName | string | No |
| invoiceCode | string | No |
| invoiceType | string | No |
| paymentType | string | No |
| phone | string | No |
| receiptDate | string | No |
| receiptImage | string | No |
| referId | number | No |
| status | number | No |
| updatedTime | string | No |
| vatAmount | number | No |

Source: `src/model/customer/CustomerResponseModel.ts`

#### ListCustomerInvoiceProps

| Field | Type | Optional |
|-------|------|----------|
| idCustomer | number | No |
| tab | string | No |

Source: `src/model/customer/PropsModel.ts`


## keywordData (`keywordData`)

**Service file:** `src/services/KeywordDataService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https:` | src/services/KeywordDataService.ts | cloud.mock.local/market/keywordData/list", |
| update | POST | `https:` | src/services/KeywordDataService.ts | cloud.mock.local/market/keywordData/update", |
| detail | GET | `https:` | src/services/KeywordDataService.ts | cloud.mock.local/market/keywordData/get", |
| delete | DELETE | `https:` | src/services/KeywordDataService.ts | cloud.mock.local/market/keywordData/delete", |

### Related DTOs

#### IKeywordDataListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/keywordData/PropsModel.ts`


## loanInformation (`loanInformation`)

**Service file:** `src/services/LoanInformationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/loanInformation/list` | src/services/fintech/LoanInformationService.ts |  |
| update | POST | `https://mock.local/finance/loanInformation/update` | src/services/fintech/LoanInformationService.ts |  |
| get | GET | `https://mock.local/finance/loanInformation/get` | src/services/fintech/LoanInformationService.ts |  |
| delete | DELETE | `https://mock.local/finance/loanInformation/delete` | src/services/fintech/LoanInformationService.ts |  |

## ma (`ma`)

**Service file:** `src/services/MaService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/ma/list` | src/services/MarketingAutomationService.ts |  |
| update | POST | `/adminapi/ma/update` | src/services/MarketingAutomationService.ts |  |
| detail | GET | `/adminapi/ma/get` | src/services/MarketingAutomationService.ts |  |
| delete | DELETE | `/adminapi/ma/delete` | src/services/MarketingAutomationService.ts |  |
| addNode | POST | `/adminapi/ma/config-node/update` | src/services/MarketingAutomationService.ts |  |
| deleteNode | DELETE | `/adminapi/ma/node/delete` | src/services/MarketingAutomationService.ts |  |
| updateNode | POST | `/adminapi/ma/config/update` | src/services/MarketingAutomationService.ts |  |
| detailConfigMA | GET | `/adminapi/ma/config/get` | src/services/MarketingAutomationService.ts |  |
| updateStatus | POST | `/adminapi/ma/update/status` | src/services/MarketingAutomationService.ts |  |
| detailMA | GET | `/adminapi/ma/detail` | src/services/MarketingAutomationService.ts |  |
| updateConfigNode | POST | `/adminapi/ma/update-config` | src/services/MarketingAutomationService.ts |  |
| listCustomer | GET | `/adminapi/maCustomer/customers` | src/services/MarketingAutomationService.ts |  |
| listCustomerByType | GET | `/adminapi/ma/customer/get` | src/services/MarketingAutomationService.ts |  |
| listCustomerByCareer | GET | `/adminapi/ma/statistic/custCareer` | src/services/MarketingAutomationService.ts |  |
| listCustomerByCustGroup | GET | `/adminapi/ma/statistic/custGroup` | src/services/MarketingAutomationService.ts |  |
| listCustomerByCustCard | GET | `/adminapi/ma/statistic/custCard` | src/services/MarketingAutomationService.ts |  |
| listCustomerByDate | GET | `/adminapi/ma/statistic/byDate` | src/services/MarketingAutomationService.ts |  |
| detailCustomer | GET | `/adminapi/maCustomer/result` | src/services/MarketingAutomationService.ts |  |
| deleteCustomer | DELETE | `/adminapi/maCustomer/delete` | src/services/MarketingAutomationService.ts |  |
| updateMapping | POST | `/adminapi/maMapping/update` | src/services/MarketingAutomationService.ts |  |
| detailMapping | GET | `/adminapi/maMapping/get` | src/services/MarketingAutomationService.ts |  |

### Related DTOs

#### IMakeCallOTPModel

| Field | Type | Optional |
|-------|------|----------|
| phone | string | No |
| dataSpeech | string | No |

Source: `src/model/callCenter/DoctorQnARequestModel.ts`

#### IDetailManagementOpportunityProps

| Field | Type | Optional |
|-------|------|----------|
| idData | number | No |
| idCampaign | number | No |
| onShow | boolean | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/campaignOpportunity/PropsModel.ts`

#### IConfigEmailListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/configCode/PropsModel.ts`

#### IAddConfigEmailModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IConfigCodeResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/configCode/PropsModel.ts`

#### ICustomerSendEmailRequestModel

| Field | Type | Optional |
|-------|------|----------|
| templateId | number | No |
| customerId | number | No |
| mapCustomPlaceholder | any | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`


## mailBox (`mailBox`)

**Service file:** `src/services/MailBoxService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/mailbox/list` | src/services/MailboxService.ts |  |
| update | POST | `/adminapi/mailbox/update` | src/services/MailboxService.ts |  |
| detail | GET | `/adminapi/mailbox/get` | src/services/MailboxService.ts |  |
| delete | DELETE | `/adminapi/mailbox/delete` | src/services/MailboxService.ts |  |
| viewer | GET | `/adminapi/mailbox/viewer` | src/services/MailboxService.ts |  |
| updateViewer | POST | `/adminapi/mailbox/update/viewer` | src/services/MailboxService.ts |  |
| mailboxExchangeList | GET | `/adminapi/mailboxExchange/list` | src/services/MailboxService.ts |  |
| mailboxExchangeUpdate | POST | `/adminapi/mailboxExchange/update` | src/services/MailboxService.ts |  |
| mailboxExchangeDelete | DELETE | `/adminapi/mailboxExchange/delete` | src/services/MailboxService.ts |  |

### Related DTOs

#### IMailBoxFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/mailBox/MailBoxRequestModel.ts`

#### IMailboxExchangeFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| mailboxId | number | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/mailBox/MailBoxRequestModel.ts`

#### IMailboxViewerFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |

Source: `src/model/mailBox/MailBoxRequestModel.ts`

#### IMailBoxRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| title | string | Yes |
| content | string | Yes |
| departments | string | Yes |
| employees | string | Yes |
| attachments | string | Yes |

Source: `src/model/mailBox/MailBoxRequestModel.ts`

#### IMailBoxViewerRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| employees | string | No |

Source: `src/model/mailBox/MailBoxRequestModel.ts`


## managementAsked (`managementAsked`)

**Service file:** `src/services/ManagementAskedService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/clarificationRequest/list` | src/services/ManagementAskedService.ts |  |
| update | POST | `/application/clarificationRequest/update` | src/services/ManagementAskedService.ts |  |
| detail | GET | `/application/clarificationRequest/get` | src/services/ManagementAskedService.ts |  |
| delete | DELETE | `/application/clarificationRequest/delete` | src/services/ManagementAskedService.ts |  |
| replyAsked | POST | `/application/clarificationResponse/update` | src/services/ManagementAskedService.ts |  |
| assignRequest | POST | `/application/clarificationRequest/assign` | src/services/ManagementAskedService.ts |  |
| saveReply | POST | `/application/clarificationResponse/update` | src/services/ManagementAskedService.ts |  |
| getDetailReply | GET | `/application/clarificationResponse/get` | src/services/ManagementAskedService.ts |  |
| getRepsonseList | GET | `/application/clarificationResponse/list` | src/services/ManagementAskedService.ts |  |
| insertRepsonse | POST | `/application/clarificationResponse/insert` | src/services/ManagementAskedService.ts |  |

## managementFee (`managementFee`)

**Service file:** `src/services/ManagementFeeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/managementFee/list` | - |  |
| update | POST | `https://mock.local/operation/managementFee/update` | - |  |
| detail | GET | `https://mock.local/operation/managementFee/get` | - |  |
| delete | DELETE | `https://mock.local/operation/managementFee/delete` | - |  |

## managementFeeRate (`managementFeeRate`)

**Service file:** `src/services/ManagementFeeRateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/managementFeeRate/list` | - |  |
| update | POST | `https://mock.local/operation/managementFeeRate/update` | - |  |
| detail | GET | `https://mock.local/operation/managementFeeRate/get` | - |  |
| delete | DELETE | `https://mock.local/operation/managementFeeRate/delete` | - |  |

## marketingBudget (`marketingBudget`)

**Service file:** `src/services/MarketingBudgetService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketingBudget/list` | - |  |
| update | POST | `/adminapi/marketingBudget/update` | - |  |
| updateStatus | POST | `/adminapi/marketingBudget/update/status` | - |  |
| detail | GET | `/adminapi/marketingBudget/get` | - |  |
| delete | DELETE | `/adminapi/marketingBudget/delete` | - |  |

## marketingChannel (`marketingChannel`)

**Service file:** `src/services/MarketingChannelService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketingChannel/list` | - |  |
| update | POST | `/adminapi/marketingChannel/update` | - |  |
| detail | GET | `/adminapi/marketingChannel/get` | - |  |
| delete | DELETE | `/adminapi/marketingChannel/delete` | - |  |

## marketingMeasurement (`marketingMeasurement`)

**Service file:** `src/services/MarketingMeasurementService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketingMeasurement/list` | - |  |
| update | POST | `/adminapi/marketingMeasurement/update` | - |  |
| detail | GET | `/adminapi/marketingMeasurement/get` | - |  |
| delete | DELETE | `/adminapi/marketingMeasurement/delete` | - |  |

## marketingReport (`marketingReport`)

**Service file:** `src/services/MarketingReportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/marketingReport/list` | - |  |
| update | POST | `/adminapi/marketingReport/update` | - |  |
| detail | GET | `/adminapi/marketingReport/get` | - |  |
| delete | DELETE | `/adminapi/marketingReport/delete` | - |  |

## netDeposit (`netDeposit`)

**Service file:** `src/services/NetDepositService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/netDeposit/list` | src/services/fintech/NetDepositService.ts |  |
| update | POST | `https://mock.local/finance/netDeposit/update` | src/services/fintech/NetDepositService.ts |  |
| get | GET | `https://mock.local/finance/netDeposit/get` | src/services/fintech/NetDepositService.ts |  |
| delete | DELETE | `https://mock.local/finance/netDeposit/delete` | src/services/fintech/NetDepositService.ts |  |

## netLoan (`netLoan`)

**Service file:** `src/services/NetLoanService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/netLoan/list` | src/services/fintech/NetLoanService.ts |  |
| update | POST | `https://mock.local/finance/netLoan/update` | src/services/fintech/NetLoanService.ts |  |
| get | GET | `https://mock.local/finance/netLoan/get` | src/services/fintech/NetLoanService.ts |  |
| delete | DELETE | `https://mock.local/finance/netLoan/delete` | src/services/fintech/NetLoanService.ts |  |

## netServiceCharge (`netServiceCharge`)

**Service file:** `src/services/NetServiceChargeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/netServiceCharge/list` | src/services/fintech/NetServiceChargeService.ts |  |
| update | POST | `https://mock.local/finance/netServiceCharge/update` | src/services/fintech/NetServiceChargeService.ts |  |
| get | GET | `https://mock.local/finance/netServiceCharge/get` | src/services/fintech/NetServiceChargeService.ts |  |
| delete | DELETE | `https://mock.local/finance/netServiceCharge/delete` | src/services/fintech/NetServiceChargeService.ts |  |

## objectSource (`objectSource`)

**Service file:** `src/services/ObjectSourceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/objectSource/list` | - |  |

### Related DTOs

#### IObjectSourceFilterRequestModel

| Field | Type | Optional |
|-------|------|----------|
| authorDisplayName | string | Yes |
| authorGender | string | Yes |
| hasPhone | number | Yes |
| viewedPhone | number | Yes |
| isBuyer | number | Yes |
| isDoctor | number | Yes |
| isBeautySalon | number | Yes |
| industryId | number | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/objectSource/ObjectSourceRequestModel.ts`

#### IObjectSourceResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| authorId | string | No |
| authorDisplayName | string | No |
| authorBirthYear | number | No |
| authorGender | string | No |
| articleType | string | No |
| isBuyer | number | No |
| isDoctor | number | No |
| isBeautySalon | number | No |
| phone | string | No |
| createdTime | string | No |
| lastUpdatedTime | string | No |

Source: `src/model/objectSource/ObjectSourceResponseModel.ts`


## offer (`offer`)

**Service file:** `src/services/OfferService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/offer/list/v2` | - |  |
| create | POST | `/adminapi/offer/create` | - |  |
| offerDetail | GET | `/adminapi/offerDetail/import` | - |  |
| cardService | GET | `/adminapi/offerDetail/cardService` | - |  |
| offerDetailCustomer | GET | `/adminapi/offerDetail/customer` | - |  |
| offerDetailList | GET | `/adminapi/offerDetail/list` | - |  |
| cancelOffer | POST | `/adminapi/offer/delete` | - |  |
| debtOffer | GET | `/adminapi/offer/debt` | - |  |
| temporarilyOffer | GET | `/adminapi/offer/update/temp` | - |  |

### Related DTOs

#### IOfferFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | Yes |
| offerCode | string | Yes |
| status | number | Yes |
| keyword | string | Yes |
| fromDate | string | Yes |
| toDate | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/offer/OfferRequestModel.ts`

#### IOfferDetailFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| offerType | string | Yes |

Source: `src/model/offer/OfferRequestModel.ts`

#### IOfferDetailListFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| offerId | number | Yes |

Source: `src/model/offer/OfferRequestModel.ts`

#### IOfferRequest

| Field | Type | Optional |
|-------|------|----------|
| amount | number | No |
| discount | number | No |
| vatAmount | number | No |
| fee | number | No |
| paid | number | No |
| debt | number | No |
| paymentType | string | No |
| receiptDate | string | No |
| offerCode | string | No |
| offerType | string | No |

Source: `src/model/offer/OfferRequestModel.ts`

#### IOfferDetailRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| batchNo | string | No |
| offerId | number | No |
| mainCost | string | No |
| mfgDate | string | No |
| productId | number | No |
| quantity | string | No |
| exchange | number | No |
| unitId | number | No |
| expiryDate | string | No |
| customerId | number | No |

Source: `src/model/offer/OfferRequestModel.ts`


## offerCard (`offerCard`)

**Service file:** `src/services/OfferCardService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/offerCardService/list` | - |  |
| add | GET | `/adminapi/offerCardService/update` | - |  |
| delete | DELETE | `/adminapi/offerCardService/delete` | - |  |
| update | POST | `/adminapi/offerCardService/update/cardNumber` | - |  |

### Related DTOs

#### IOfferCardFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| checkAccount | number | Yes |

Source: `src/model/offerCard/OfferCardRequestModel.ts`

#### IOfferCardRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| account | number | No |
| cardId | number | No |
| cardNumber | string | No |
| cash | number | No |
| customerId | number | No |
| fee | number | No |
| fmtOrderDate | string | No |
| note | string | No |
| qty | number | No |
| saleId | number | No |
| status | number | No |
| treatmentNum | number | Yes |
| serviceId | number | Yes |
| serviceCombo | string | No |
| accountCard | number | Yes |
| totalCard | number | Yes |

Source: `src/model/offerCard/OfferCardRequestModel.ts`

#### IOfferCardUpdateRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| cardNumber | string | No |

Source: `src/model/offerCard/OfferCardRequestModel.ts`

#### IOfferCardResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| receiptDate | string | No |
| qty | number | No |
| fee | number | No |
| account | number | No |

Source: `src/model/offerCard/OfferCardResponseModel.ts`


## offerProduct (`offerProduct`)

**Service file:** `src/services/OfferProductService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/offerProduct/list` | - |  |
| addToInvoice | GET | `/adminapi/offerProduct/update` | - |  |
| delete | DELETE | `/adminapi/offerProduct/delete` | - |  |
| update | POST | `/adminapi/offerProduct/update` | - |  |
| detail | GET | `/adminapi/offerProduct/get` | - |  |
| getByCustomer | GET | `/adminapi/offerProduct/getBoughtProductByCustomerId` | - |  |

### Related DTOs

#### IOfferProductFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | Yes |
| keyword | string | Yes |
| fromTime | string | Yes |
| toTime | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/offerProduct/OfferProductRequestModel.ts`

#### IOfferProductToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| productId | number | No |
| batchNo | string | Yes |
| unitId | number | No |
| price | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| qty | number | No |
| saleId | number | No |
| fee | number | No |
| note | string | Yes |
| customerId | number | No |
| offerId | number | No |

Source: `src/model/offerProduct/OfferProductRequestModel.ts`

#### IOfferProductRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| offerId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| inventoryId | number | No |
| productId | number | No |
| unitId | number | No |
| qty | number | No |
| saleId | number | No |
| discountUnit | string | No |
| discount | number | No |
| customerId | number | No |
| fee | number | No |
| batchNo | string | number | No |
| fmtOrderDate | string | No |
| priceSample | number | Yes |
| productInventory | number | Yes |

Source: `src/model/offerProduct/OfferProductRequestModel.ts`

#### IOfferProductToInvoiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| offerCode | string | No |
| customerName | string | No |
| customerPhone | string | No |
| orderDate | string | No |
| receiptDate | string | No |
| name | string | No |
| qty | number | No |
| fee | number | No |

Source: `src/model/offerProduct/OfferProductResponseModel.ts`

#### IOfferProductResponse

| Field | Type | Optional |
|-------|------|----------|
| batchNo | string | No |
| avatar | string | No |
| customerId | number | No |
| customerName | string | No |
| customerPhone | string | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| id | number | No |
| offerCode | number | No |
| offerId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| inventoryId | number | No |
| productId | number | No |
| name | string | No |
| qty | number | No |
| saleId | number | No |
| unitId | number | No |
| unitName | string | No |
| vat | number | No |
| receiptDate | string | No |
| priceSample | number | Yes |
| productInventory | number | Yes |

Source: `src/model/offerProduct/OfferProductResponseModel.ts`


## offerService (`offerService`)

**Service file:** `src/services/OfferServiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| addToInvoice | GET | `/adminapi/offerService/update` | - |  |
| delete | DELETE | `/adminapi/offerService/delete` | - |  |
| update | POST | `/adminapi/offerService/update` | - |  |
| detail | GET | `/adminapi/offerService/get` | - |  |
| getByCustomer | GET | `/adminapi/offerService/getBoughtServiceByCustomerId` | - |  |

### Related DTOs

#### IOfferServiceFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |

Source: `src/model/offerService/OfferServiceRequestModel.ts`

#### IOfferServiceToInvoiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| serviceId | number | No |
| qty | number | No |
| note | string | Yes |
| price | number | No |
| retail | number | No |
| retailPrice | number | No |
| packageType | number | No |
| priceDiscount | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| saleEmployeeId | number | Yes |
| offerId | number | No |

Source: `src/model/offerService/OfferServiceRequestModel.ts`

#### IOfferServiceRequest

| Field | Type | Optional |
|-------|------|----------|
| customerId | number | No |
| discount | number | No |
| discountUnit | string | No |
| fee | number | No |
| offerId | number | No |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| treatmentNum | number | No |
| priceSample | number | No |
| totalPayment | number | No |

Source: `src/model/offerService/OfferServiceRequestModel.ts`

#### IOfferServiceByCustomerResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| serviceId | number | No |
| serviceName | string | No |
| receiptDate | string | No |
| qty | number | No |
| priceDiscount | number | No |
| price | number | No |
| discount | number | No |
| fee | number | No |
| note | string | No |
| priceVariationId | string | No |
| saleEmployeeId | number | No |
| updatedTime | string | No |
| customerId | number | No |
| action | number | No |
| offerId | number | No |
| offerCode | number | No |
| treatmentNum | number | No |
| totalTreatment | number | No |
| cardNumber | number | No |
| serviceNumber | string | No |
| customerName | string | No |
| customerPhone | string | No |

Source: `src/model/offerService/OfferServiceResponseModel.ts`

#### IOfferServiceResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| action | number | No |
| customerId | number | No |
| discount | number | No |
| discountUnit | number | No |
| fee | number | No |
| offerCode | string | No |
| offerId | number | No |
| receiptDate | number | Yes |
| note | string | No |
| price | number | No |
| priceDiscount | number | No |
| priceVariationId | string | No |
| qty | number | No |
| saleEmployeeId | number | No |
| serviceId | number | No |
| serviceNumber | string | No |
| updatedTime | string | No |
| serviceName | string | No |
| serviceAvatar | string | No |

Source: `src/model/offerService/OfferServiceResponseModel.ts`


## orderRequest (`orderRequest`)

**Service file:** `src/services/OrderRequestService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/order-request/list` | - |  |
| listOne | GET | `/adminapi/order-request/list-one` | - |  |
| update | POST | `/adminapi/order-request/update` | - |  |
| updateAndInit | POST | `/adminapi/order-request/update-and-init` | - |  |
| delete | DELETE | `/adminapi/order-request/delete-soft` | - |  |
| export | POST | `/adminapi/order-request/export` | - |  |
| detail | GET | `/adminapi/order-request/get` | - |  |

### Related DTOs

#### IWorkOrderRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| name | string | No |
| content | string | No |
| contentDelta | string | No |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | Yes |
| wteId | number | No |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| managerId | number | No |
| employeeId | number | No |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | string | number | No |
| notification | string | No |
| creatorId | number | Yes |

Source: `src/model/workOrder/WorkOrderRequestModel.ts`


## organization (`organization`)

**Service file:** `src/services/OrganizationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/beautySalon/list` | - |  |
| customerUploadList | GET | `/adminapi/customerUpload/list` | - |  |
| customerUploadDelete | DELETE | `/adminapi/cleanData/uploadCustomer/delete` | - |  |

## ortherFee (`ortherFee`)

**Service file:** `src/services/OrtherFeeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/otherFee/list` | - |  |
| update | POST | `https://mock.local/operation/otherFee/update` | - |  |
| detail | GET | `https://mock.local/operation/otherFee/get` | - |  |
| delete | DELETE | `https://mock.local/operation/otherFee/delete` | - |  |

## parkingFee (`parkingFee`)

**Service file:** `src/services/ParkingFeeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/parkingFee/list` | - |  |
| update | POST | `https://mock.local/operation/parkingFee/update` | - |  |
| detail | GET | `https://mock.local/operation/parkingFee/get` | - |  |
| delete | DELETE | `https://mock.local/operation/parkingFee/delete` | - |  |

## partner (`partner`)

**Service file:** `src/services/PartnerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/businessPartner/list_paid` | src/services/PartnerService.ts |  |
| update | POST | `/adminapi/businessPartner/update` | src/services/PartnerService.ts |  |
| detail | GET | `/adminapi/businessPartner/get` | src/services/PartnerService.ts |  |
| delete | DELETE | `/adminapi/businessPartner/delete` | src/services/PartnerService.ts |  |
| downloadFile | GET | `/adminapi/businessPartner/import` | src/services/PartnerService.ts |  |
| viewPhone | GET | `/adminapi/businessPartner/get/phone` | src/services/PartnerService.ts |  |
| viewEmail | GET | `/adminapi/businessPartner/get/email` | src/services/PartnerService.ts |  |
| numberFieldPartner | POST | `/adminapi/businessPartner/export/randomBusinessPartners` | src/services/PartnerService.ts |  |
| autoProcess | POST | `/adminapi/businessPartner/import/autoProcess` | src/services/PartnerService.ts |  |
| exAttributes | GET | `/adminapi/businessPartner/export/attributes` | src/services/PartnerService.ts |  |
| filterTable | GET | `/adminapi/businessPartner/listFilter` | src/services/PartnerService.ts |  |
| partnerExchangeList | GET | `/adminapi/businessPartnerExchange/list` | src/services/PartnerService.ts |  |
| partnerExchangeUpdate | POST | `/adminapi/businessPartnerExchange/update` | src/services/PartnerService.ts |  |
| partnerExchangeDelete | DELETE | `/adminapi/businessPartnerExchange/delete` | src/services/PartnerService.ts |  |

### Related DTOs

#### IPartnerCallFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallRequestModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallRequestModel.ts`

#### IPartnerCallResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| partnerName | string | No |
| partnerCode | string | No |
| partnerConfig | string | No |
| contactPhone | string | No |
| contactName | string | No |
| address | string | No |

Source: `src/model/partnerCall/PartnerCallResponseModel.ts`

#### IAddPartnerCallModelProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IPartnerCallResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`

#### IPartnerCallListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/partnerCall/PropsModel.ts`


## partnerAttribute (`partnerAttribute`)

**Service file:** `src/services/PartnerAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/businessPartnerAttribute/list` | src/services/PartnerAttributeService.ts |  |
| update | POST | `/adminapi/businessPartnerAttribute/update` | src/services/PartnerAttributeService.ts |  |
| delete | DELETE | `/adminapi/businessPartnerAttribute/delete` | src/services/PartnerAttributeService.ts |  |
| listAll | GET | `/adminapi/businessPartnerAttribute/listAll` | src/services/PartnerAttributeService.ts |  |
| checkDuplicated | POST | `/adminapi/businessPartnerAttribute/checkDuplicated` | src/services/PartnerAttributeService.ts |  |

## partnerExtraInfo (`partnerExtraInfo`)

**Service file:** `src/services/PartnerExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/businessPartnerExtraInfo/list` | - |  |

## pom (`pom`)

**Service file:** `src/services/PomService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/pom/list` | - |  |
| update | POST | `/adminapi/pom/update` | - |  |
| detail | GET | `/adminapi/pom/get` | - |  |
| delete | DELETE | `/adminapi/pom/delete` | - |  |
| lstPomSales | GET | `/adminapi/pom/list/invoice` | - |  |

### Related DTOs

#### IPomRequest

| Field | Type | Optional |
|-------|------|----------|
| serviceId | number | No |
| productId | number | No |
| unitId | number | No |
| quantity | number | No |
| numerator | number | No |
| denominator | number | No |

Source: `src/model/pom/PomRequestModel.ts`

#### IPomResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| serviceId | number | No |
| productId | number | No |
| productName | string | No |
| unitId | number | No |
| unitName | string | No |
| quantity | number | No |
| numerator | number | No |
| denominator | number | No |
| employeeId | number | No |
| createdTime | string | No |

Source: `src/model/pom/PomResponseModel.ts`

#### IPomModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| infoService | any | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/pom/PropsModel.ts`

#### IAddPomProps

| Field | Type | Optional |
|-------|------|----------|
| data | IPomResponse | No |
| infoService | any | No |
| onReload | (reload: boolean) => void | No |

Source: `src/model/pom/PropsModel.ts`

#### ITablePomProps

| Field | Type | Optional |
|-------|------|----------|
| isLoading | boolean | No |
| listPom | IPomResponse[] | No |
| titles | string[] | No |
| dataFormat | string[] | No |
| dataMappingArray | any | No |
| actionsTable | any | No |
| setIsActiveForm | any | No |
| isPermissions | boolean | No |

Source: `src/model/pom/PropsModel.ts`


## productAttribute (`productAttribute`)

**Service file:** `src/services/ProductAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/productAttribute/list` | - |  |
| update | POST | `/adminapi/productAttribute/update` | - |  |
| delete | DELETE | `/adminapi/productAttribute/delete` | - |  |
| listAll | GET | `/adminapi/productAttribute/listAll` | - |  |
| checkDuplicated | POST | `/adminapi/productAttribute/checkDuplicated` | - |  |

## productDemand (`productDemand`)

**Service file:** `src/services/ProductDemandService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/productDemand/list` | src/services/fintech/ProductDemandService.ts |  |
| update | POST | `https://mock.local/finance/productDemand/update` | src/services/fintech/ProductDemandService.ts |  |
| get | GET | `https://mock.local/finance/productDemand/get` | src/services/fintech/ProductDemandService.ts |  |
| delete | DELETE | `https://mock.local/finance/productDemand/delete` | src/services/fintech/ProductDemandService.ts |  |

## productExtraInfo (`productExtraInfo`)

**Service file:** `src/services/ProductExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/productExtraInfo/list` | - |  |

## productIdApi (`productIdApi`)

**Service file:** `src/services/ProductIdApiService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/product/list` | src/services/ProductIdApiService.ts |  |

## productImport (`productImport`)

**Service file:** `src/services/ProductImportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| update | POST | `https://mock.local/warehouse/product_import/update` | - |  |
| detail | GET | `https://mock.local/warehouse/product_import/detail` | - |  |
| delete | DELETE | `https://mock.local/warehouse/product_import/delete` | - |  |

### Related DTOs

#### AddProductImportModalProps

| Field | Type | Optional |
|-------|------|----------|
| offerId | number | No |
| onShow | boolean | No |
| data | IOfferDetailResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/offer/PropsModel.ts`

#### IProductImportFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| invoiceId | number | No |

Source: `src/model/productImport/ProductImportRequestModel.ts`

#### IProductImportRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| customerId | number | Yes |
| productId | number | No |
| batchNo | string | No |
| unitId | number | No |
| mainCost | number | No |
| quantity | number | No |
| mfgDate | string | No |
| expiryDate | string | No |
| invoiceId | number | No |

Source: `src/model/productImport/ProductImportRequestModel.ts`

#### IProductImportResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| invoiceId | number | No |
| mainCost | number | No |
| bsnId | number | No |
| productId | number | No |
| productName | string | No |
| quantity | number | No |
| unitId | number | No |
| unitName | string | No |
| batchNo | string | No |
| updatedTime | string | No |
| mfgDate | string | No |
| expiryDate | string | No |
| exchange | string | No |
| createdTime | string | No |

Source: `src/model/productImport/ProductImportResponseModel.ts`


## projectReport (`projectReport`)

**Service file:** `src/services/ProjectReportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| report | GET | `/adminapi/cashbook/report` | - |  |

## qrCode (`qrCode`)

**Service file:** `src/services/QrCodeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/qrCode/list` | src/services/QrCodeService.ts |  |
| update | POST | `/adminapi/qrCode/update` | src/services/QrCodeService.ts |  |
| delete | DELETE | `/adminapi/qrCode/delete` | src/services/QrCodeService.ts |  |
| detail | GET | `/adminapi/qrCode/get` | src/services/QrCodeService.ts |  |

## rentalType (`rentalType`)

**Service file:** `src/services/RentalTypeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/rentalType/list` | - |  |
| update | POST | `/adminapi/rentalType/update` | - |  |
| detail | GET | `/adminapi/rentalType/get` | - |  |
| delete | DELETE | `/adminapi/rentalType/delete` | - |  |

### Related DTOs

#### IAddRentalTypeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | IRentalTypeResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/rentalType/PropsModel.ts`

#### IRentalTypeListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/rentalType/PropsModel.ts`

#### IRentalTypeResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| position | number | No |
| bsnId | number | No |

Source: `src/model/rentalType/RentalTypeResponseModel.ts`


## reportBussinessParner (`reportBussinessParner`)

**Service file:** `src/services/ReportBussinessParnerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| report | GET | `/adminapi/contract/report` | - |  |
| reportDetail | GET | `/adminapi/contract/report/detail` | - |  |

## reportContractWarranty (`reportContractWarranty`)

**Service file:** `src/services/ReportContractWarrantyService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| statistical | GET | `/adminapi/contractWarranty/statistical` | - |  |

## reportGuarantee (`reportGuarantee`)

**Service file:** `src/services/ReportGuaranteeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| statistical | GET | `/adminapi/guarantee/statistical` | - |  |

## reportMa (`reportMa`)

**Service file:** `src/services/ReportMaService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| getCustomer | GET | `/adminapi/ma/dashboard/customer/byStatus` | - |  |

## reportOpportunity (`reportOpportunity`)

**Service file:** `src/services/ReportOpportunityService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| totalOpportunity | GET | `/adminapi/campaignOpportunity/total/dashboard` | - |  |
| opportunityByDate | GET | `/adminapi/campaignOpportunity/totalByDate/dashboard` | - |  |
| expectedRevenue | GET | `/adminapi/campaignOpportunity/totalExpectedRevenue/dashboard` | - |  |
| totalByApproach | GET | `/adminapi/campaignOpportunity/totalByApproach/dashboard` | - |  |
| totalOpportunityDetail | GET | `/adminapi/campaignOpportunity/total/dashboard/detail` | - |  |
| expectedRevenueDetail | GET | `/adminapi/campaignOpportunity/totalExpectedRevenue/dashboard/detail` | - |  |
| contractRevenueDetail | GET | `/adminapi/contract/revenue/dashboard/detail` | - |  |

## saleflow (`saleflow`)

**Service file:** `src/services/SaleflowService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/saleflow/list` | src/services/SaleFlowService.ts |  |
| update | POST | `/adminapi/saleflow/update` | src/services/SaleFlowService.ts |  |
| detail | GET | `/adminapi/saleflow/get` | src/services/SaleFlowService.ts |  |
| delete | DELETE | `/adminapi/saleflow/delete` | src/services/SaleFlowService.ts |  |
| activityList | GET | `/adminapi/saleflowActivity/list` | src/services/SaleFlowService.ts |  |
| updateActivity | POST | `/adminapi/saleflowActivity/update` | src/services/SaleFlowService.ts |  |
| deleteActivity | DELETE | `/adminapi/saleflowActivity/delete` | src/services/SaleFlowService.ts |  |
| saleflowEformUpdate | POST | `/adminapi/saleflowEform/update` | src/services/SaleFlowService.ts |  |
| saleflowEformDetail | GET | `/adminapi/saleflowEform/get/criteria` | src/services/SaleFlowService.ts |  |

## saleflowApproach (`saleflowApproach`)

**Service file:** `src/services/SaleflowApproachService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/saleflowApproach/list` | - |  |
| update | POST | `/adminapi/saleflowApproach/update` | - |  |
| detail | GET | `/adminapi/saleflowApproach/get` | - |  |
| delete | DELETE | `/adminapi/saleflowApproach/delete` | - |  |
| updateSLA | POST | `/adminapi/saleflowApproach/update/sla` | - |  |
| activityList | GET | `/adminapi/saleflowActivity/list` | - |  |
| updateActivity | POST | `/adminapi/saleflowActivity/update` | - |  |
| deleteActivity | DELETE | `/adminapi/saleflowActivity/delete` | - |  |
| updateSaleflowSale | POST | `/adminapi/saleflowSale/update` | - |  |
| detailSaleflowSale | GET | `/adminapi/saleflowSale/get/byApproachId` | - |  |

## saleflowInvoice (`saleflowInvoice`)

**Service file:** `src/services/SaleflowInvoiceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/saleflowInvoice/list` | - |  |
| update | POST | `/adminapi/saleflowInvoice/update` | - |  |
| updateApproach | POST | `/adminapi/saleflowInvoice/update/approach` | - |  |
| updateApproachSuccess | POST | `/adminapi/saleflowInvoice/update/success` | - |  |
| updateApproachCancel | POST | `/adminapi/saleflowInvoice/update/cancel` | - |  |
| detail | GET | `/adminapi/saleflowInvoice/get` | - |  |
| delete | DELETE | `/adminapi/saleflowInvoice/delete` | - |  |
| invoiceExchange | GET | `/adminapi/saleflowExchange/list` | - |  |
| deleteInvoiceExchange | DELETE | `/adminapi/saleflowExchange/delete` | - |  |
| addInvoiceExchange | GET | `/adminapi/saleflowExchange/update` | - |  |
| updateInvoiceExchange | POST | `/adminapi/saleflowExchange/get` | - |  |

## serviceAttribute (`serviceAttribute`)

**Service file:** `src/services/ServiceAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/serviceAttribute/list` | - |  |
| update | POST | `/adminapi/serviceAttribute/update` | - |  |
| delete | DELETE | `/adminapi/serviceAttribute/delete` | - |  |
| listAll | GET | `/adminapi/serviceAttribute/listAll` | - |  |
| checkDuplicated | POST | `/adminapi/serviceAttribute/checkDuplicated` | - |  |

## serviceExtraInfo (`serviceExtraInfo`)

**Service file:** `src/services/ServiceExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/serviceExtraInfo/list` | - |  |

## serviceIdApi (`serviceIdApi`)

**Service file:** `src/services/ServiceIdApiService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/service/list` | src/services/ServiceIdApiService.ts |  |

## space (`space`)

**Service file:** `src/services/SpaceService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/space/list` | src/services/SpaceService.ts |  |
| update | POST | `https://mock.local/operation/space/update` | src/services/SpaceService.ts |  |
| detail | GET | `https://mock.local/operation/space/get` | src/services/SpaceService.ts |  |
| delete | DELETE | `https://mock.local/operation/space/delete` | src/services/SpaceService.ts |  |

## spaceCustomer (`spaceCustomer`)

**Service file:** `src/services/SpaceCustomerService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/spaceCustomer/list` | src/services/SpaceCustomerService.ts |  |
| update | POST | `https://mock.local/operation/spaceCustomer/update` | src/services/SpaceCustomerService.ts |  |
| detail | GET | `https://mock.local/operation/spaceCustomer/get` | src/services/SpaceCustomerService.ts |  |
| delete | DELETE | `https://mock.local/operation/spaceCustomer/delete` | src/services/SpaceCustomerService.ts |  |

## spaceType (`spaceType`)

**Service file:** `src/services/SpaceTypeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/spaceType/list` | src/services/SpaceTypeService.ts |  |
| update | POST | `https://mock.local/operation/spaceType/update` | src/services/SpaceTypeService.ts |  |
| detail | GET | `https://mock.local/operation/spaceType/get` | src/services/SpaceTypeService.ts |  |
| delete | DELETE | `https://mock.local/operation/spaceType/delete` | src/services/SpaceTypeService.ts |  |

## subsystemAdministration (`subsystemAdministration`)

**Service file:** `src/services/SubsystemAdministrationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/module/list` | src/services/SubsystemAdministrationService.ts |  |
| update | POST | `/adminapi/module/update` | src/services/SubsystemAdministrationService.ts |  |
| detail | GET | `/adminapi/module/get` | src/services/SubsystemAdministrationService.ts |  |
| delete | DELETE | `/adminapi/module/delete` | src/services/SubsystemAdministrationService.ts |  |
| addModuleResource | POST | `/adminapi/moduleResource/add` | src/services/SubsystemAdministrationService.ts |  |
| removeModuleResource | DELETE | `/adminapi/moduleResource/remove` | src/services/SubsystemAdministrationService.ts |  |

### Related DTOs

#### ISubsystemAdministrationListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/subsystemAdministration/PropsModel.ts`

#### IAddSubsystemAdministrationModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ISubsystemAdministrationResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/subsystemAdministration/PropsModel.ts`


## supplier (`supplier`)

**Service file:** `src/services/SupplierService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/application/organization/list` | src/services/SupplierService.ts |  |
| update | POST | `/application/organization/update` | src/services/SupplierService.ts |  |
| updateActive | POST | `/application/organization/update/active` | src/services/SupplierService.ts |  |
| detail | GET | `/application/organization/get` | src/services/SupplierService.ts |  |
| delete | DELETE | `/application/organization/delete` | src/services/SupplierService.ts |  |
| listContact | GET | `/application/contactOrg/list` | src/services/SupplierService.ts |  |
| deleteContact | DELETE | `/application/contactOrg/delete` | src/services/SupplierService.ts |  |
| detailContact | GET | `/application/contactOrg/get` | src/services/SupplierService.ts |  |

## supportCommon (`supportCommon`)

**Service file:** `src/services/SupportCommonService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| supportConfigLst | GET | `/adminapi/supportConfig/list` | src/services/SupportCommonService.ts |  |
| supportConfigUpdate | POST | `/adminapi/supportConfig/update` | src/services/SupportCommonService.ts |  |
| supportConfigDelete | DELETE | `/adminapi/supportConfig/delete` | src/services/SupportCommonService.ts |  |
| supportConfigDetail | GET | `/adminapi/supportConfig/get` | src/services/SupportCommonService.ts |  |
| updateStatusSupport | POST | `/adminapi/support/update/status` | src/services/SupportCommonService.ts |  |
| supportLinkLst | POST | `/adminapi/supportLink/list` | src/services/SupportCommonService.ts |  |
| supportLinkUpdate | POST | `/adminapi/supportLink/update` | src/services/SupportCommonService.ts |  |
| supportLinkDelete | DELETE | `/adminapi/supportLink/delete` | src/services/SupportCommonService.ts |  |
| supportObjectLst | GET | `/adminapi/supportObject/list` | src/services/SupportCommonService.ts |  |
| supportObjectUpdate | POST | `/adminapi/supportObject/update` | src/services/SupportCommonService.ts |  |
| supportObjectDelete | DELETE | `/adminapi/supportObject/delete` | src/services/SupportCommonService.ts |  |
| takeObject | GET | `/adminapi/supportObject/get/object` | src/services/SupportCommonService.ts |  |
| checkApproved | POST | `/adminapi/supportObject/checkApproved` | src/services/SupportCommonService.ts |  |
| supportLogLst | GET | `/adminapi/supportLog/list` | src/services/SupportCommonService.ts |  |
| supportLogUpdate | POST | `/adminapi/supportLog/update` | src/services/SupportCommonService.ts |  |
| supportLogDelete | DELETE | `/adminapi/supportLog/delete` | src/services/SupportCommonService.ts |  |
| processDone | POST | `/adminapi/supportLog/processDone` | src/services/SupportCommonService.ts |  |
| processReceive | POST | `/adminapi/supportLog/receive` | src/services/SupportCommonService.ts |  |
| processRejected | POST | `/adminapi/supportLog/processRejected` | src/services/SupportCommonService.ts |  |

## templateCategory (`templateCategory`)

**Service file:** `src/services/TemplateCategoryService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/templateCategory/list` | src/services/TemplateCategoryService.ts |  |
| update | POST | `/adminapi/templateCategory/update` | src/services/TemplateCategoryService.ts |  |
| detail | GET | `/adminapi/templateCategory/get` | src/services/TemplateCategoryService.ts |  |
| delete | DELETE | `/adminapi/templateCategory/delete` | src/services/TemplateCategoryService.ts |  |

### Related DTOs

#### AddTemplateCategoryModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| nameChange | string | No |
| data | ITemplateCategoryResponseModel | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/templateCategory/PropsModel.ts`

#### ITemplateCategoryListProps

| Field | Type | Optional |
|-------|------|----------|
| titleProps | string | No |
| nameProps | string | No |
| typeProps | string | No |
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/templateCategory/PropsModel.ts`


## timekeeping (`timekeeping`)

**Service file:** `src/services/TimekeepingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/timekeeping/list` | - |  |
| update | POST | `/adminapi/timekeeping/update` | - |  |
| delete | DELETE | `/adminapi/timekeeping/delete` | - |  |

### Related DTOs

#### ITimekeepingRequest

| Field | Type | Optional |
|-------|------|----------|
| fmtWorkDay | string | No |
| workTypeId | number | No |
| workHour | number | No |
| status | number | No |

Source: `src/model/timekeeping/TimekeepingRequestModel.ts`

#### ITimekeepingFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| month | number | Yes |
| year | number | Yes |
| employeeId | number | Yes |

Source: `src/model/timekeeping/TimekeepingRequestModel.ts`

#### ITimekeepingUpdateCaringEmployeeRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| caringEmployeeId | number | No |

Source: `src/model/timekeeping/TimekeepingRequestModel.ts`


## tipGroup (`tipGroup`)

**Service file:** `src/services/TipGroupService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/tipGroup/list` | src/services/TipGroupService.ts |  |
| update | POST | `/adminapi/tipGroup/update` | src/services/TipGroupService.ts |  |
| delete | DELETE | `/adminapi/tipGroup/delete` | src/services/TipGroupService.ts |  |
| listTipGroupEmloyee | GET | `/adminapi/tipGroupEmployee/list` | src/services/TipGroupService.ts |  |
| updateTipGroupEmloyee | POST | `/adminapi/tipGroupEmployee/update` | src/services/TipGroupService.ts |  |
| deleteTipGroupEmloyee | DELETE | `/adminapi/tipGroupEmployee/delete` | src/services/TipGroupService.ts |  |

### Related DTOs

#### IAddTipGroupModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITipGroupResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipGroupBak/PropsModel.ts`

#### AddTipGroupToTipGroupEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| groupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipGroup/PropsModel.ts`

#### ShowTipGroupToTipGroupEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| showGroupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipGroup/PropsModel.ts`

#### ITipGroupListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/tipGroupBak/PropsModel.ts`

#### ITipGroupFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/tipGroupBak/TipGroupRequestModel.ts`


## tipGroupConfig (`tipGroupConfig`)

**Service file:** `src/services/TipGroupConfigService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/tipGroupConfig/list` | src/services/TipGroupConfigService.ts |  |
| update | POST | `/adminapi/tipGroupConfig/update` | src/services/TipGroupConfigService.ts |  |
| delete | DELETE | `/adminapi/tipGroupConfig/delete` | src/services/TipGroupConfigService.ts |  |

### Related DTOs

#### IAddTipGroupConfigModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITipGroupConfigResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipGroupConfig/PropsModel.ts`

#### ITipGroupConfigListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/tipGroupConfig/PropsModel.ts`

#### ITipGroupConfigFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/tipGroupConfig/TipGroupConfigRequestModel.ts`

#### ITipGroupConfigRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| employeeName | string | No |
| serviceId | number | string | No |
| serviceName | string | No |
| tip | number | string | No |
| unit | number | string | No |
| groupId | number | Yes |

Source: `src/model/tipGroupConfig/TipGroupConfigRequestModel.ts`

#### ITipGroupConfigResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| employeeName | string | No |
| serviceId | number | No |
| serviceName | string | No |
| tip | number | string | No |
| unit | number | string | No |
| groupId | number | No |
| objectType | number | No |
| objectId | number | No |

Source: `src/model/tipGroupConfig/TipGroupConfigResponseModel.ts`


## tipUser (`tipUser`)

**Service file:** `src/services/TipUserService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/tipUser/list` | src/services/TipUserService.ts |  |
| update | POST | `/adminapi/tipUser/update` | src/services/TipUserService.ts |  |
| delete | DELETE | `/adminapi/tipUser/delete` | src/services/TipUserService.ts |  |

### Related DTOs

#### IAddTipUserModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITipUserResponse | Yes |
| tipType | number | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### AddTipUserToTipUserEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| groupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### ShowTipUserToTipUserEmployeeModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| showGroupId | number | No |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### ITipUserProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/tipUser/PropsModel.ts`

#### ITipUserDetail

| Field | Type | Optional |
|-------|------|----------|
| showModalCommissionRate | boolean | No |
| setShowModalCommissionRate | any | No |
| dataTipUser | ITipUserResponse | No |
| dataDetailTip | any | No |
| setDataDetailTip | any | No |

Source: `src/model/tipUser/PropsModel.ts`


## tipUserConfig (`tipUserConfig`)

**Service file:** `src/services/TipUserConfigService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/tipUserConfig/list` | src/services/TipUserConfigService.ts |  |
| update | POST | `/adminapi/tipUserConfig/update` | src/services/TipUserConfigService.ts |  |
| delete | DELETE | `/adminapi/tipUserConfig/delete` | src/services/TipUserConfigService.ts |  |

### Related DTOs

#### IAddTipUserConfigModalProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| data | ITipUserConfigResponse | Yes |
| onHide | (reload: boolean) => void | No |

Source: `src/model/tipUserConfig/PropsModel.ts`

#### ITipUserConfigListProps

| Field | Type | Optional |
|-------|------|----------|
| onBackProps | (isBack: boolean) => void | No |

Source: `src/model/tipUserConfig/PropsModel.ts`

#### ITipUserConfigFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | Yes |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/tipUserConfig/TipUserConfigRequestModel.ts`

#### ITipUserConfigRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| employeeName | string | No |
| serviceId | number | No |
| serviceName | string | No |
| tip | number | string | No |
| unit | number | string | No |
| groupId | number | Yes |

Source: `src/model/tipUserConfig/TipUserConfigRequestModel.ts`

#### ITipUserConfigResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| employeeId | number | No |
| employeeName | string | No |
| serviceId | number | No |
| serviceName | string | No |
| tip | number | string | No |
| unit | number | string | No |
| effectFrom | number | No |
| effectTo | number | No |
| groupId | number | No |
| objectType | number | No |
| objectId | number | No |

Source: `src/model/tipUserConfig/TipUserConfigResponseModel.ts`


## transactionInformation (`transactionInformation`)

**Service file:** `src/services/TransactionInformationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| lst | GET | `https://mock.local/finance/transactionInformation/list` | src/services/fintech/TransactionInformationService.ts |  |
| update | POST | `https://mock.local/finance/transactionInformation/update` | src/services/fintech/TransactionInformationService.ts |  |
| get | GET | `https://mock.local/finance/transactionInformation/get` | src/services/fintech/TransactionInformationService.ts |  |
| delete | DELETE | `https://mock.local/finance/transactionInformation/delete` | src/services/fintech/TransactionInformationService.ts |  |

## utilityReading (`utilityReading`)

**Service file:** `src/services/UtilityReadingService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/utilityReading/list` | - |  |
| update | POST | `https://mock.local/operation/utilityReading/update` | - |  |
| detail | GET | `https://mock.local/operation/utilityReading/get` | - |  |
| delete | DELETE | `https://mock.local/operation/utilityReading/delete` | - |  |

## vehicle (`vehicle`)

**Service file:** `src/services/VehicleService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/vehicle/list` | src/services/VehicleService.ts |  |
| update | POST | `https://mock.local/operation/vehicle/update` | src/services/VehicleService.ts |  |
| detail | GET | `https://mock.local/operation/vehicle/get` | src/services/VehicleService.ts |  |
| delete | DELETE | `https://mock.local/operation/vehicle/delete` | src/services/VehicleService.ts |  |

## vehicleRegistration (`vehicleRegistration`)

**Service file:** `src/services/VehicleRegistrationService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/vehicleRegistration/list` | - |  |
| update | POST | `https://mock.local/operation/vehicleRegistration/update` | - |  |
| detail | GET | `https://mock.local/operation/vehicleRegistration/get` | - |  |
| delete | DELETE | `https://mock.local/operation/vehicleRegistration/delete` | - |  |

## video (`video`)

**Service file:** `src/services/VideoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| upload | GET | `https:` | - | login.mock.local/api/upload/file", |

### Related DTOs

#### IModalAddVideoProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | () => void | No |
| callback | (url: string, thumbnail?: string) => void | Yes |

Source: `src/model/editor/PropsModel.ts`

#### ILstVideoSupportProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | () => void | No |

Source: `src/model/videoSupport/PropsModel.ts`

#### IVideoSupportFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| query | string | Yes |
| module | string | No |
| parentId | number | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/videoSupport/VideoSupportRequestModel.ts`

#### IVideoSupportResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| avatar | string | No |
| content | string | No |
| createdTime | string | No |
| updatedTime | string | No |
| description | string | No |
| link | string | No |
| module | string | No |
| pageDescription | string | No |
| pageKeyword | string | No |
| pageLink | string | No |
| pageTitle | string | No |
| parentId | number | No |
| parentName | string | No |
| position | number | No |
| creatorId | number | No |
| hasSitemap | string | No |

Source: `src/model/videoSupport/VideoSupportResponseModel.ts`


## videoSupport (`videoSupport`)

**Service file:** `src/services/VideoSupportService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/api/support/list` | - |  |

### Related DTOs

#### ILstVideoSupportProps

| Field | Type | Optional |
|-------|------|----------|
| onShow | boolean | No |
| onHide | () => void | No |

Source: `src/model/videoSupport/PropsModel.ts`

#### IVideoSupportFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| query | string | Yes |
| module | string | No |
| parentId | number | No |
| page | number | Yes |
| limit | number | Yes |

Source: `src/model/videoSupport/VideoSupportRequestModel.ts`

#### IVideoSupportResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| title | string | No |
| avatar | string | No |
| content | string | No |
| createdTime | string | No |
| updatedTime | string | No |
| description | string | No |
| link | string | No |
| module | string | No |
| pageDescription | string | No |
| pageKeyword | string | No |
| pageLink | string | No |
| pageTitle | string | No |
| parentId | number | No |
| parentName | string | No |
| position | number | No |
| creatorId | number | No |
| hasSitemap | string | No |

Source: `src/model/videoSupport/VideoSupportResponseModel.ts`


## voucher (`voucher`)

**Service file:** `src/services/VoucherService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/promotion/list-active` | src/services/PromotionService.ts |  |

## warrantyAttachment (`warrantyAttachment`)

**Service file:** `src/services/WarrantyAttachmentService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| warrantyAttachmentList | GET | `/adminapi/contractWarrantyAttachment/list` | - |  |
| warrantyAttachmentUpdate | POST | `/adminapi/contractWarrantyAttachment/update` | - |  |
| warrantyAttachmentDelete | DELETE | `/adminapi/contractWarrantyAttachment/delete` | - |  |

## warrantyAttribute (`warrantyAttribute`)

**Service file:** `src/services/WarrantyAttributeService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractWarrantyAttribute/list` | - |  |
| update | POST | `/adminapi/contractWarrantyAttribute/update` | - |  |
| delete | DELETE | `/adminapi/contractWarrantyAttribute/delete` | - |  |
| listAll | GET | `/adminapi/contractWarrantyAttribute/listAll` | - |  |
| checkDuplicated | POST | `/adminapi/contractWarrantyAttribute/checkDuplicated` | - |  |

## warrantyExtraInfo (`warrantyExtraInfo`)

**Service file:** `src/services/WarrantyExtraInfoService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `/adminapi/contractWarrantyExtraInfo/list` | - |  |

## waterRate (`waterRate`)

**Service file:** `src/services/WaterRateService.ts` (if exists)

| Action | Method | Endpoint | Service File | Comment |
|--------|--------|----------|--------------|--------|
| list | GET | `https://mock.local/operation/waterRate/list` | - |  |
| update | POST | `https://mock.local/operation/waterRate/update` | - |  |
| detail | GET | `https://mock.local/operation/waterRate/get` | - |  |
| delete | DELETE | `https://mock.local/operation/waterRate/delete` | - |  |

---

# DTO Definitions


## ICustomerResponse

| Field | Type | Optional |
|-------|------|----------|
| contactName | any | No |
| id | number | No |
| code | string | Yes |
| profileLink | string | Yes |
| name | string | No |
| gender | number | Yes |
| age | number | Yes |
| address | string | Yes |
| phone | string | Yes |
| phoneMasked | string | Yes |
| phoneUnmasked | string | Yes |
| email | string | Yes |
| emailMasked | string | Yes |
| birthday | string | Yes |
| fmtBirthday | string | Yes |
| areaId | number | Yes |
| job | string | Yes |
| maritalStatus | number | Yes |
| childrenNum | number | Yes |
| presenterId | number | Yes |
| employeeId | number | Yes |
| employeeName | string | Yes |
| employeePhone | string | Yes |
| employeeAvatar | string | Yes |
| departmentName | string | Yes |
| sourceId | number | Yes |
| sourceName | string | Yes |
| note | string | Yes |
| healthHistoryOther | string | Yes |
| userId | number | Yes |
| cardId | number | Yes |
| recommenderPhone | string | Yes |
| bsnId | number | Yes |
| fee | number | Yes |
| paid | number | Yes |
| debt | number | Yes |
| returnedFee | number | Yes |
| cardName | string | Yes |
| serviceNum | number | Yes |
| serviceChargeTotal | number | Yes |
| productNum | number | Yes |
| productChargeTotal | number | Yes |
| branchId | number | Yes |
| careerId | number | Yes |
| careers | any | Yes |
| careerName | string | Yes |
| cgpId | number | Yes |
| avatar | string | No |
| firstCall | string | No |
| height | string | No |
| weight | string | No |
| profileStatus | number | Yes |
| secondProfileLink | string | Yes |
| secondProfileStatus | number | Yes |
| relationshipId | number | Yes |
| groupName | string | Yes |
| contactCount | number | No |
| invoiceChargeTotal | number | No |
| dayNotContact | number | No |
| invoiceCount | number | No |
| lastBoughtDate | any | No |
| lastContactDate | any | No |
| customerExtraInfos | any | No |
| timestamp | number | Yes |
| custType | number | Yes |
| trademark | string | Yes |
| taxCode | string | Yes |
| contactId | number | Yes |
| employeeTitle | string | Yes |
| contractId | number | Yes |
| relationshipName | string | Yes |
| cgpName | string | Yes |
| lastSignDate | any | Yes |
| totalRentedArea | number | string | Yes |
| totalValueContract | number | Yes |
| zaloUserId | number | string | Yes |
| isExternal | number | Yes |
| relationIds | any | No |
| relations | any | No |
| mapCustomerAttribute | any | Yes |
| lstCustomerExtraInfo | any | Yes |
| telesaleCall | any | Yes |
| syncTime | any | Yes |
| saleAssignDate | any | Yes |
| employeeAssignDate | any | Yes |

Source: `src/model/customer/CustomerResponseModel.ts`


## ICustomerRequest

| Field | Type | Optional |
|-------|------|----------|
| id | number | Yes |
| sourceId | number | Yes |
| name | string | No |
| code | string | Yes |
| profileLink | string | Yes |
| recommenderPhone | string | Yes |
| gender | string | Yes |
| address | string | Yes |
| phone | string | Yes |
| birthday | string | Yes |
| branchId | number | Yes |
| careers | any | Yes |
| careerId | number | No |
| employeeId | number | Yes |
| cgpId | number | Yes |
| avatar | string | No |
| email | string | Yes |
| emailMasked | string | Yes |
| firstCall | string | No |
| height | string | No |
| weight | string | No |
| profileStatus | string | Yes |
| secondProfileLink | string | Yes |
| secondProfileStatus | string | Yes |
| custType | number | string | No |
| trademark | string | No |
| taxCode | string | No |
| contactId | number | Yes |
| employeeTitle | string | Yes |
| customerExtraInfos | any | No |
| zaloUserId | number | string | Yes |
| maritalStatus | number | No |
| isExternal | number | string | No |
| relationIds | any | No |

Source: `src/model/customer/CustomerRequestModel.ts`


## ICustomerFilterRequest

| Field | Type | Optional |
|-------|------|----------|
| keyword | string | Yes |
| fmtStartOrderDate | string | Yes |
| fmtEndOrderDate | string | Yes |
| checkDebt | number | Yes |
| page | number | Yes |
| limit | number | Yes |
| branchId | number | Yes |
| custType | number | Yes |

Source: `src/model/customer/CustomerRequestModel.ts`


## ICustomerSchedulerRequest

| Field | Type | Optional |
|-------|------|----------|
| name | string | No |
| address | string | Yes |
| customerId | number | No |
| consultantId | number | No |
| fmtScheduleDate | string | No |
| content | string | Yes |
| note | string | Yes |
| status | string | No |

Source: `src/model/customer/CustomerRequestModel.ts`


## IEmployeeResponse

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| phone | string | No |
| address | string | Yes |
| jteId | number | No |
| status | number | string | No |
| viewMode | number | string | No |
| viewCustomerMode | number | string | No |
| viewContractMode | number | string | Yes |
| viewBusinessPartnerMode | number | string | Yes |
| viewProjectMode | number | string | Yes |
| viewWorkMode | number | string | Yes |
| viewFsMode | number | string | Yes |
| viewQuoteMode | number | string | Yes |
| viewOpportunityMode | number | string | Yes |
| position | number | No |
| userId | number | No |
| bsnId | number | No |
| serviceCount | number | Yes |
| title | string | Yes |
| isOwner | number | No |
| branchId | number | No |
| branchName | string | No |
| departmentId | number | No |
| departmentName | string | No |
| avatar | string | No |
| lstEmployeeId | number[] | No |
| managerId | number | No |
| managerName | string | No |
| email | string | No |
| sip | string | Yes |
| roles | string | Yes |
| code | string | Yes |

Source: `src/model/employee/EmployeeResponseModel.ts`


## IWorkOrderResponseModel

| Field | Type | Optional |
|-------|------|----------|
| id | number | No |
| name | string | No |
| content | string | No |
| contentDelta | string | Yes |
| startTime | string | No |
| endTime | string | No |
| workLoad | number | No |
| workLoadUnit | string | No |
| wteId | number | No |
| workTypeName | string | Yes |
| docLink | string | No |
| projectId | number | No |
| opportunityId | number | No |
| projectName | string | Yes |
| opportunityName | string | Yes |
| managerId | number | No |
| managerName | string | Yes |
| managerAvatar | string | Yes |
| employeeId | number | No |
| employeeName | number | Yes |
| employeeAvatar | number | Yes |
| participants | string | No |
| customers | string | No |
| status | number | No |
| percent | number | No |
| priorityLevel | number | No |
| lstParticipant | any[] | Yes |
| lstCustomer | any[] | Yes |
| notification | string | No |
| reviews | string | Yes |
| nodeName | string | Yes |
| iteration | number | Yes |
| scope | string | Yes |
| taskType | string | Yes |

Source: `src/model/workOrder/WorkOrderResponseModel.ts`


## All TypeScript Interfaces (776 total)

| Interface | File | Field Count |
|-----------|------|-------------|
| AddBeautyBranchModalProps | src/model/beautyBranch/PropsModel.ts | 3 |
| AddBoughtCustomerCardModalProps | src/model/boughtCustomerCard/PropsModel.ts | 5 |
| AddBoughtProductModalProps | src/model/boughtProduct/PropsModel.ts | 6 |
| AddBoughtServiceProps | src/model/boughtService/PropsModel.ts | 5 |
| AddCardModalProps | src/model/card/PropsModel.ts | 3 |
| AddCardServiceModalProps | src/model/cardService/PropsModel.ts | 3 |
| AddCareerModalProps | src/model/career/PropsModel.ts | 4 |
| AddCaringEmployeeProps | src/model/treatment/PropsModel.ts | 5 |
| AddCashBookModalProps | src/model/cashbook/PropsModel.ts | 5 |
| AddCategoryModalProps | src/model/category/PropsModel.ts | 4 |
| AddConfigCodeModalProps | src/model/configCode/PropsModel.ts | 3 |
| AddContactAttributeModalProps | src/model/contactAttribute/PropsModel.ts | 3 |
| AddContactModalProps | src/model/contact/PropsModel.ts | 4 |
| AddContactPipelineModalProps | src/model/contactPipeline/PropsModel.ts | 3 |
| AddContractAttributeModalProps | src/model/contractAttribute/PropsModel.ts | 3 |
| AddContractModalProps | src/model/contract/PropsModel.ts | 21 |
| AddContractPipelineModalProps | src/model/contractPipeline/PropsModel.ts | 3 |
| AddContractProductModalProps | src/model/contractProduct/PropsModel.ts | 3 |
| AddCrmCampaignModalProps | src/model/crmCampaign/PropsModel.ts | 3 |
| AddCustomerAttributeModalProps | src/model/customerAttribute/PropsModel.ts | 3 |
| AddCustomerGroupModalProps | src/model/customerGroup/PropsModel.ts | 3 |
| AddCustomerModalProps | src/model/customer/PropsModel.ts | 8 |
| AddCustomerSourceModalProps | src/model/customerSource/PropsModel.ts | 3 |
| AddDataKeywordModalProps | src/model/keywordData/PropsModel.ts | 3 |
| AddDepartmentModalProps | src/model/department/PropsModel.ts | 3 |
| AddEmployeeModalProps | src/model/employee/PropsModel.ts | 3 |
| AddFanpageModalProps | src/model/fanpageFacebook/PropsModel.ts | 4 |
| AddGiftModalProps | src/model/gift/PropsModel.ts | 3 |
| AddGiftServiceEventModalProps | src/model/gift/PropsModel.ts | 5 |
| AddGiftServiceModalProps | src/model/gift/PropsModel.ts | 2 |
| AddHistoryCallCustomerProps | src/model/treatment/PropsModel.ts | 3 |
| AddInfoCardServiceModalProps | src/model/offer/PropsModel.ts | 5 |
| AddInventoryModalProps | src/model/inventory/PropsModel.ts | 3 |
| AddKpiDatasourceModalProps | src/model/kpiDatasource/PropsModel.ts | 3 |
| AddKpiGoalModalProps | src/model/kpiGoal/PropsModel.ts | 3 |
| AddOfferProductModalProps | src/model/offerProduct/PropsModel.ts | 5 |
| AddOfferServiceProps | src/model/offerService/PropsModel.ts | 5 |
| AddPaymentHistoryModalProps | src/model/paymentHistory/PropsModel.ts | 3 |
| AddProductImportModalProps | src/model/offer/PropsModel.ts | 4 |
| AddProductProps | src/model/product/PropsModel.ts | 4 |
| AddReportTemplateModalProps | src/model/reportTemplate/PropsModel.ts | 3 |
| AddSchedulerModalProps | src/model/customer/PropsModel.ts | 4 |
| AddSettingProps | src/model/setting/PropsModel.ts | 3 |
| AddTemplateCategoryModalProps | src/model/templateCategory/PropsModel.ts | 4 |
| AddTemplateSMSModalProps | src/model/templateSMS/PropsModel.ts | 3 |
| AddTipGroupToTipGroupEmployeeModalProps | src/model/tipGroup/PropsModel.ts | 3 |
| AddTipUserToTipUserEmployeeModalProps | src/model/tipUser/PropsModel.ts | 3 |
| AddUnitModalProps | src/model/unit/PropsModel.ts | 3 |
| AddZnsTemplateModalProps | src/model/znsTemplate/PropsModel.ts | 4 |
| BillModalProps | src/model/customer/PropsModel.ts | 4 |
| ExtendTimeScheduleProps | src/model/treatment/PropsModel.ts | 3 |
| IAction | src/model/OtherModel.ts | 8 |
| IActionModal | src/model/OtherModel.ts | 2 |
| IAddAdjustmentSlipProps | src/model/adjustmentSlip/PropsModel.ts | 3 |
| IAddApplicationModalProps | src/model/installApplication/PropsModel.ts | 3 |
| IAddBrandNameModelProps | src/model/brandName/PropsModel.ts | 3 |
| IAddCampaignApproachModalProps | src/model/campaignApproach/PropsModel.ts | 3 |
| IAddCampaignModalProps | src/model/campaign/PropsModel.ts | 3 |
| IAddCampaignOpportunityModel | src/model/campaignOpportunity/PropsModel.ts | 8 |
| IAddCategoryServiceModelProps | src/model/categoryService/PropsModel.ts | 3 |
| IAddChangeProbabilityModelProps | src/model/campaignOpportunity/PropsModel.ts | 9 |
| IAddChildOptModal | src/model/workOpt/PropsModel.ts | 4 |
| IAddChildProjectModal | src/model/workProject/PropsModel.ts | 4 |
| IAddConfigCallModalProps | src/model/configCode/PropsModel.ts | 3 |
| IAddConfigEmailModalProps | src/model/configCode/PropsModel.ts | 3 |
| IAddConfigSMSModalProps | src/model/configCode/PropsModel.ts | 3 |
| IAddConsultationScheduleModalProps | src/model/scheduleConsultant/PropsModel.ts | 7 |
| IAddContactStatusProps | src/model/contactStatus/PropsModel.ts | 3 |
| IAddContractApproachProps | src/model/contractApproach/PropsModel.ts | 3 |
| IAddCoyViewerRequestModel | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 3 |
| IAddCustomerEmailModelProps | src/model/customerEmail/PropsModel.ts | 4 |
| IAddCustomerSendEmailModalProps | src/model/customer/PropsModel.ts | 6 |
| IAddCustomerSendSMSModalProps | src/model/customer/PropsModel.ts | 5 |
| IAddCustomerSMSModelProps | src/model/customerSMS/PropsModel.ts | 5 |
| IAddCustomerViewerModalProps | src/model/customer/CustomerRequestModel.ts | 3 |
| IAddCustomerViewerRequestModel | src/model/customer/CustomerRequestModel.ts | 3 |
| IAddCustomerZaloModelProps | src/model/customerZalo/PropsModel.ts | 6 |
| IAddDeclareEmailModelProps | src/model/declareEmail/PropsModel.ts | 3 |
| IAddDiarySurgeryModelProps | src/model/diarySurgery/PropsModel.ts | 3 |
| IAddEmailModelProps | src/model/email/PropsModel.ts | 6 |
| IAddFunctionalManagementModalProps | src/model/functionalManagement/PropsModel.ts | 3 |
| IAddKeyWordIndustryModalProps | src/model/industry/PropsModel.ts | 3 |
| IAddKpiApplyModalProps | src/model/kpiApply/PropsModel.ts | 3 |
| IAddKpiModalProps | src/model/kpi/PropsModel.ts | 3 |
| IAddKpiObjectModalProps | src/model/kpiObject/PropsModel.ts | 3 |
| IAddKpiSetupModalProps | src/model/kpiSetup/PropsModel.ts | 3 |
| IAddKpiTemplateGoalModalProps | src/model/kpiTemplateGoal/PropsModel.ts | 3 |
| IAddKpiTemplateModalProps | src/model/kpiTemplate/PropsModel.ts | 3 |
| IAddMailBoxModalProps | src/model/mailBox/PropsModel.ts | 3 |
| IAddParticipantModalProps | src/model/workOrder/PropsModel.ts | 4 |
| IAddPartnerCallModelProps | src/model/partnerCall/PropsModel.ts | 3 |
| IAddPartnerEmailModelProps | src/model/partnerEmail/PropsModel.ts | 3 |
| IAddPartnerSMSModelProps | src/model/partnerSMS/PropsModel.ts | 3 |
| IAddPeopleInvolvedProps | src/model/mailBox/PropsModel.ts | 3 |
| IAddPhoneModalProps | src/model/callCenter/PropsModel.ts | 3 |
| IAddPomProps | src/model/pom/PropsModel.ts | 3 |
| IAddPositionModalProps | src/model/position/PropsModel.ts | 3 |
| IAddPostExamSurveyProps | src/model/surveyForm/PropsModel.ts | 3 |
| IAddPriceServiceProps | src/model/service/PropsModel.ts | 4 |
| IAddPurchaseModalProps | src/model/PurchaseRequest/PropsModel.ts | 7 |
| IAddRelatedCustomerModalProps | src/model/workOrder/PropsModel.ts | 4 |
| IAddRelatedWorkModelProps | src/model/workOrder/PropsModel.ts | 4 |
| IAddRentalTypeModalProps | src/model/rentalType/PropsModel.ts | 3 |
| IAddSeoGiftModalProps | src/model/gift/PropsModel.ts | 3 |
| IAddServiceModalProps | src/model/service/PropsModel.ts | 3 |
| IAddSettingWarrantyModalProps | src/model/warrantyCategory/PropsModel.ts | 3 |
| IAddSubsystemAdministrationModalProps | src/model/subsystemAdministration/PropsModel.ts | 3 |
| IAddSwitchboardModelProps | src/model/switchboard/PropsModel.ts | 3 |
| IAddTemplateEmailModelProps | src/model/templateZalo/PropsModel.ts | 3 |
| IAddTicketCategoryModalProps | src/model/ticketCategory/PropsModel.ts | 3 |
| IAddTicketModalProps | src/model/ticket/PropsModel.ts | 6 |
| IAddTicketProcModalProps | src/model/ticketProc/PropsModel.ts | 3 |
| IAddTicketStepModalProps | src/model/ticketStep/PropsModel.ts | 3 |
| IAddTipGroupConfigModalProps | src/model/tipGroupConfig/PropsModel.ts | 3 |
| IAddTipGroupModalProps | src/model/tipGroupBak/PropsModel.ts | 3 |
| IAddTipRoseProps | src/model/tipUser/PropsModel.ts | 4 |
| IAddTipUserConfigModalProps | src/model/tipUserConfig/PropsModel.ts | 3 |
| IAddTipUserModalProps | src/model/tipUser/PropsModel.ts | 4 |
| IAddTreatmentHistoryModelProps | src/model/treatmentHistory/PropsModel.ts | 4 |
| IAddUpdateProRequest | src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts | 13 |
| IAddWarrantyModelProps | src/model/warranty/PropsModel.ts | 6 |
| IAddWarrantyProcModalProps | src/model/warrantyProc/PropsModel.ts | 3 |
| IAddWarrantyStepModalProps | src/model/warrantyStep/PropsModel.ts | 3 |
| IAddWorkInprogressModalProps | src/model/workOrder/PropsModel.ts | 3 |
| IAddWorkModelProps | src/model/workOrder/PropsModel.ts | 16 |
| IAddWorkOptModalProps | src/model/workOpt/PropsModel.ts | 3 |
| IAddWorkProjectModalProps | src/model/workProject/PropsModel.ts | 5 |
| IAddWorkRatingModalProps | src/model/workOrder/PropsModel.ts | 6 |
| IAddWorkTypeModalProps | src/model/workType/PropsModel.ts | 3 |
| IAdjustmentSlipFilterRequest | src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts | 7 |
| IAdjustmentSlipRequest | src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts | 2 |
| IAdjustmentSlipResponse | src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts | 10 |
| IAnalysisFilterRequest | src/model/analysis/AnalysisRequestModel.ts | 6 |
| IAnalysisResponse | src/model/analysis/AnalysisResponseModel.ts | 31 |
| IAssignNegotiationWorkRequestModal | src/model/workOrder/WorkOrderRequestModel.ts | 15 |
| IAttachmentsListProps | src/model/customer/PropsModel.ts | 1 |
| IAutoProcessModalProps | src/model/customer/CustomerRequestModel.ts | 4 |
| IBeautyBranchFilterRequest | src/model/beautyBranch/BeautyBranchRequestModel.ts | 3 |
| IBeautyBranchRequest | src/model/beautyBranch/BeautyBranchRequestModel.ts | 18 |
| IBeautyBranchResponse | src/model/beautyBranch/BeautyBranchResponseModel.ts | 21 |
| IBoughtCardFilterRequest | src/model/boughtCard/BoughtCardRequestModel.ts | 2 |
| IBoughtCardRequest | src/model/boughtCard/BoughtCardRequestModel.ts | 18 |
| IBoughtCardResponse | src/model/boughtCard/BoughtCardResponseModel.ts | 6 |
| IBoughtCardUpdateRequest | src/model/boughtCard/BoughtCardRequestModel.ts | 2 |
| IBoughtProductFilterRequest | src/model/boughtProduct/BoughtProductRequestModel.ts | 6 |
| IBoughtProductRequest | src/model/boughtProduct/BoughtProductRequestModel.ts | 18 |
| IBoughtProductResponse | src/model/boughtProduct/BoughtProductResponseModel.ts | 25 |
| IBoughtProductToInvoiceRequest | src/model/boughtProduct/BoughtProductRequestModel.ts | 13 |
| IBoughtProductToInvoiceResponse | src/model/boughtProduct/BoughtProductResponseModel.ts | 9 |
| IBoughtServiceByCustomerResponse | src/model/boughtService/BoughtServiceResponseModel.ts | 23 |
| IBoughtServiceFilterRequest | src/model/boughtService/BoughtServiceRequestModel.ts | 1 |
| IBoughtServiceRequest | src/model/boughtService/BoughtServiceRequestModel.ts | 16 |
| IBoughtServiceResponse | src/model/boughtService/BoughtServiceResponseModel.ts | 20 |
| IBoughtServiceToInvoiceRequest | src/model/boughtService/BoughtServiceRequestModel.ts | 14 |
| IBranchListProps | src/model/kpiDatasource/PropsModel.ts | 1 |
| IBrandNameFilterRequest | src/model/brandName/BrandNameRequestModel.ts | 4 |
| IBrandNameListProps | src/model/brandName/PropsModel.ts | 1 |
| IBrandNameRequestModel | src/model/brandName/BrandNameRequestModel.ts | 4 |
| IBrandNameResponseModel | src/model/brandName/BrandNameResponseModel.ts | 8 |
| ICallHistoryListFilterRequest | src/model/callCenter/DoctorQnARequestModel.ts | 8 |
| ICallHistoryProps | src/model/callCenter/PropsModel.ts | 1 |
| ICampaignApproachFilterRequest | src/model/campaignApproach/CampaignApproachRequestModel.ts | 2 |
| ICampaignApproachRequestModel | src/model/campaignApproach/CampaignApproachRequestModel.ts | 5 |
| ICampaignApproachResponseModel | src/model/campaignApproach/CampaignApproachResponseModel.ts | 6 |
| ICampaignFilterRequest | src/model/campaign/CampaignRequestModel.ts | 4 |
| ICampaignOpportunityFilterRequest | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 8 |
| ICampaignOpportunityRequestModel | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 14 |
| ICampaignOpportunityResponseModel | src/model/campaignOpportunity/CampaignOpportunityResponseModel.ts | 36 |
| ICampaignRequestModel | src/model/campaign/CampaignRequestModel.ts | 10 |
| ICampaignResponseModel | src/model/campaign/CampaignResponseModel.ts | 30 |
| ICardFilterRequest | src/model/card/CardRequestModel.ts | 4 |
| ICardRequest | src/model/card/CardRequestModel.ts | 11 |
| ICardResponse | src/model/card/CardResponseModel.ts | 11 |
| ICardServiceFilterRequest | src/model/cardService/CardServiceRequestModel.ts | 3 |
| ICardServiceListProps | src/model/sell/PropsModel.ts | 9 |
| ICardServiceRequest | src/model/cardService/CardServiceRequestModel.ts | 12 |
| ICardServiceResponse | src/model/cardService/CardServiceResponseModel.ts | 12 |
| ICashbookFilterRequest | src/model/cashbook/CashbookRequestModel.ts | 10 |
| ICashbookRequest | src/model/cashbook/CashbookRequestModel.ts | 18 |
| ICashBookResponse | src/model/cashbook/CashbookResponseModel.ts | 19 |
| ICategoryFilterRequest | src/model/category/CategoryResquestModel.ts | 4 |
| ICategoryRequest | src/model/category/CategoryResquestModel.ts | 7 |
| ICategoryServiceFilterRequest | src/model/categoryService/CategoryServiceRequestModel.ts | 5 |
| ICategoryServiceListProps | src/model/categoryService/PropsModel.ts | 1 |
| ICategoryServiceRequestModel | src/model/categoryService/CategoryServiceRequestModel.ts | 6 |
| ICategoryServiceResponseModel | src/model/categoryService/CategoryServiceResponseModel.ts | 10 |
| IChangeEmployeeRequestModel | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 2 |
| IChangePasswordRequest | src/model/user/UserRequestModel.ts | 3 |
| IChangeSaleRequestModel | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 2 |
| IChooseDepartmentDifferentModalProps | src/model/department/PropsModel.ts | 5 |
| IChooseJobTitleDifferentModalProps | src/model/department/PropsModel.ts | 5 |
| IChooseProductModalProps | src/model/adjustmentSlip/PropsModel.ts | 5 |
| IChooseTemplateSMSModelProps | src/model/customer/PropsModel.ts | 5 |
| IColorPickerModal | src/model/editor/PropsModel.ts | 4 |
| IConfigCallListProps | src/model/configCode/PropsModel.ts | 1 |
| IConfigEmailListProps | src/model/configCode/PropsModel.ts | 1 |
| IConfigSMSListProps | src/model/configCode/PropsModel.ts | 1 |
| IConnectFanpageFilterRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 1 |
| IContactAttributeListProps | src/model/contactAttribute/PropsModel.ts | 1 |
| IContactFieldFilterRequest | src/model/contact/ContactRequestModel.ts | 3 |
| IContactFilterRequest | src/model/contact/ContactRequestModel.ts | 9 |
| IContactListProps | src/model/contact/PropsModel.ts | 1 |
| IContactPipelineFilterRequest | src/model/contactPipeline/ContactPipelineRequestModel.ts | 3 |
| IContactPipelineListProps | src/model/contactPipeline/PropsModel.ts | 1 |
| IContactPipelineRequest | src/model/contactPipeline/ContactPipelineRequestModel.ts | 3 |
| IContactPipelineResponse | src/model/contactPipeline/ContactPipelineResponseModel.ts | 4 |
| IContactRequest | src/model/contact/ContactRequestModel.ts | 18 |
| IContactResponse | src/model/contact/ContactResponseModel.ts | 19 |
| IContactStatusFilterRequest | src/model/contactStatus/ContactStatusRequestModel.ts | 3 |
| IContactStatusModalProps | src/model/contactStatus/PropsModel.ts | 3 |
| IContactStatusRequest | src/model/contactStatus/ContactStatusRequestModel.ts | 3 |
| IContactStatusResponse | src/model/contactStatus/ContactStatusResponseModel.ts | 4 |
| IContractAlertRequest | src/model/contract/ContractRequestModel.ts | 3 |
| IContractApproachModalProps | src/model/contractApproach/PropsModel.ts | 3 |
| IContractApproachRequest | src/model/contractApproach/ContractApproachRequestModel.ts | 3 |
| IContractApproachResponse | src/model/contractApproach/ContractApproachResponseModel.ts | 4 |
| IContractAttributeListProps | src/model/contractAttribute/PropsModel.ts | 1 |
| IContractFieldFilterRequest | src/model/contract/ContractRequestModel.ts | 3 |
| IContractFilterRequest | src/model/contract/ContractRequestModel.ts | 9 |
| IContractListProps | src/model/contract/PropsModel.ts | 1 |
| IContractPipelineFilterRequest | src/model/contractPipeline/ContractPipelineRequestModel.ts | 3 |
| IContractPipelineListProps | src/model/contractPipeline/PropsModel.ts | 1 |
| IContractPipelineRequest | src/model/contractPipeline/ContractPipelineRequestModel.ts | 3 |
| IContractPipelineResponse | src/model/contractPipeline/ContractPipelineResponseModel.ts | 4 |
| IContractProductListProps | src/model/contractProduct/PropsModel.ts | 1 |
| IContractProductResponse | src/model/contractProduct/ContractProductResponseModel.ts | 6 |
| IContractRequest | src/model/contract/ContractRequestModel.ts | 57 |
| IContractResponse | src/model/contract/ContractResponseModel.ts | 25 |
| ICreateAccountEmployeeProps | src/model/employee/PropsModel.ts | 3 |
| ICrmCampaignFilterRequest | src/model/crmCampaign/CrmCampaignRequestModel.ts | 2 |
| ICrmCampaignRequest | src/model/crmCampaign/CrmCampaignRequestModel.ts | 4 |
| ICrmCampaignResponse | src/model/crmCampaign/CrmCampaignResponseModel.ts | 4 |
| ICrmCareHistoryFilterRequest | src/model/crmCareHistory/CrmCareHistoryRequestModel.ts | 3 |
| ICrmCareHistoryRequest | src/model/crmCareHistory/CrmCareHistoryRequestModel.ts | 9 |
| ICrmCareHistoryResponse | src/model/crmCareHistory/CrmCareHistoryResponseModel.ts | 11 |
| ICustomerAttributeListProps | src/model/customerAttribute/PropsModel.ts | 1 |
| ICustomerCardListProps | src/model/card/PropsModel.ts | 1 |
| ICustomerCareerListProps | src/model/career/PropsModel.ts | 1 |
| ICustomerEmailFilterRequest | src/model/customerEmail/CustomerEmailRequestModel.ts | 8 |
| ICustomerEmailListProps | src/model/customerEmail/PropsModel.ts | 3 |
| ICustomerEmailResponseModel | src/model/customerEmail/CustomerEmailResponseModel.ts | 13 |
| ICustomerExchangeFilterRequest | src/model/customer/CustomerRequestModel.ts | 4 |
| ICustomerExchangeResponseModel | src/model/customer/CustomerResponseModel.ts | 12 |
| ICustomerExchangeUpdateRequestModel | src/model/customer/CustomerRequestModel.ts | 7 |
| ICustomerFeedbackFilterRequest | src/model/customer/CustomerRequestModel.ts | 4 |
| ICustomerFeedbackResponseModel | src/model/customer/CustomerResponseModel.ts | 12 |
| ICustomerFeedbackUpdateRequestModel | src/model/customer/CustomerRequestModel.ts | 7 |
| ICustomerFilterRequest | src/model/customer/CustomerRequestModel.ts | 8 |
| ICustomerGroupFilterRequest | src/model/customerGroup/CustomerGroupRequestModel.ts | 3 |
| ICustomerGroupListProps | src/model/customerGroup/PropsModel.ts | 1 |
| ICustomerGroupRequest | src/model/customerGroup/CustomerGroupRequestModel.ts | 7 |
| ICustomerGroupResponse | src/model/customerGroup/CustomerGroupResponseModel.ts | 7 |
| ICustomerInvoiceResponse | src/model/customer/CustomerResponseModel.ts | 22 |
| ICustomerLinkUserRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| ICustomerListProps | src/model/callCenter/PropsModel.ts | 2 |
| ICustomerReportProps | src/model/customer/CustomerRequestModel.ts | 4 |
| ICustomerRequest | src/model/customer/CustomerRequestModel.ts | 34 |
| ICustomerResourcesListProps | src/model/customerSource/PropsModel.ts | 1 |
| ICustomerResponse | src/model/customer/CustomerResponseModel.ts | 85 |
| ICustomerSchedulerFilterRequest | src/model/customer/CustomerRequestModel.ts | 13 |
| ICustomerSchedulerRequest | src/model/customer/CustomerRequestModel.ts | 8 |
| ICustomerSendEmailRequestModel | src/model/customer/CustomerRequestModel.ts | 3 |
| ICustomerSendSMSRequestModel | src/model/customer/CustomerRequestModel.ts | 3 |
| ICustomerSendZaloRequestModel | src/model/customer/CustomerRequestModel.ts | 3 |
| ICustomerSMSFilterRequest | src/model/customerSMS/CustomerSMSRequestModel.ts | 8 |
| ICustomerSMSListProps | src/model/customerSMS/PropsModel.ts | 3 |
| ICustomerSMSResponseModel | src/model/customerSMS/CustomerSMSResponseModel.ts | 12 |
| ICustomerZaloFilterRequest | src/model/customerZalo/CustomerZaloRequestModel.ts | 8 |
| ICustomerZaloListProps | src/model/customerZalo/PropsModel.ts | 4 |
| ICustomerZaloResponseModel | src/model/customerZalo/CustomerZaloResponseModel.ts | 12 |
| ICustomPlaceholderModalProps | src/model/customPlaceholder/PropsModel.ts | 3 |
| ICustomPlaceholderRequest | src/model/customPlaceholder/CustomPlaceholderRequestModel.ts | 3 |
| ICustomPlaceholderResponse | src/model/customPlaceholder/CustomPlaceholderResponseModel.ts | 3 |
| IDeclareEmailFilterRequest | src/model/declareEmail/DeclareEmailRequestModel.ts | 3 |
| IDeclareEmailListProps | src/model/declareEmail/PropsModel.ts | 1 |
| IDeclareEmailRequestModel | src/model/declareEmail/DeclareEmailRequestModel.ts | 5 |
| IDeclareEmailResponseModel | src/model/declareEmail/DeclareEmailResponseModel.ts | 8 |
| IDepartmentDirectoryListProps | src/model/department/PropsModel.ts | 2 |
| IDepartmentFilterRequest | src/model/department/DepartmentRequestModel.ts | 4 |
| IDepartmentRequest | src/model/department/DepartmentRequestModel.ts | 7 |
| IDepartmentResponse | src/model/department/DepartmentResponseModel.ts | 14 |
| IDescCustomerReportFilterRequest | src/model/customer/CustomerRequestModel.ts | 3 |
| IDetailAdjustmentSlipResponse | src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts | 3 |
| IDetailCustomerReportProps | src/model/customer/CustomerRequestModel.ts | 7 |
| IDetailManagementOpportunityProps | src/model/campaignOpportunity/PropsModel.ts | 4 |
| IDetailWorkProps | src/model/workOrder/PropsModel.ts | 1 |
| IDiarySurgeryFilterRequest | src/model/diarySurgery/DiarySurgeryRequestModel.ts | 3 |
| IDiarySurgeryRequestModel | src/model/diarySurgery/DiarySurgeryRequestModel.ts | 8 |
| IDiarySurgeryResponseModel | src/model/diarySurgery/DiarySurgeryResponseModel.ts | 17 |
| IDoctorQnAResponseModel | src/model/callCenter/DoctorQnAResponseModel.ts | 17 |
| IEarningResponseModel | src/model/earnings/EarningResponseModel.ts | 0 |
| IEarningsFilterRequest | src/model/earnings/EarningRequestModel.ts | 5 |
| IEditImageModal | src/model/editor/PropsModel.ts | 9 |
| IEmailFilterRequest | src/model/email/EmailRequestModel.ts | 10 |
| IEmailListProps | src/model/email/PropsModel.ts | 1 |
| IEmailRequest | src/model/email/EmailRequestModel.ts | 9 |
| IEmailResponse | src/model/email/EmailResponseModel.ts | 18 |
| IEmojiChatProps | src/model/workOrder/WorkOrderRequestModel.ts | 4 |
| IEmployeeFilterRequest | src/model/employee/EmployeeRequestModel.ts | 8 |
| IEmployeeListProps | src/model/employee/PropsModel.ts | 1 |
| IEmployeeRequest | src/model/employee/EmployeeRequestModel.ts | 29 |
| IEmployeeResponse | src/model/employee/EmployeeResponseModel.ts | 33 |
| IEstimateRequestModel | src/model/estimate/EstimateRequestModel.ts | 4 |
| IEventTransaction | src/model/dashboard/DashboardModel.ts | 4 |
| IExchangeContentListProps | src/model/mailBox/PropsModel.ts | 2 |
| IExchangePersonListProps | src/model/customer/PropsModel.ts | 1 |
| IExpireTimeRequestModel | src/model/contract/ContractResponseModel.ts | 8 |
| IFanpageChatFilterRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 4 |
| IFanpageChatResponse | src/model/fanpageFacebook/FanpageResponseModel.ts | 17 |
| IFanpageChatSendAttachmentRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 3 |
| IFanpageCommentFilterRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 4 |
| IFanpageCommentResponse | src/model/fanpageFacebook/FanpageResponseModel.ts | 16 |
| IFanpageDialogFilterRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 5 |
| IFanpageDialogResponse | src/model/fanpageFacebook/FanpageResponseModel.ts | 11 |
| IFanpageFacebookFilterRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 2 |
| IFanpageFacebookRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 6 |
| IFanpageFacebookResponse | src/model/fanpageFacebook/FanpageResponseModel.ts | 5 |
| IFeedbackPersonListProps | src/model/customer/PropsModel.ts | 1 |
| IFieldCustomerFilterRequest | src/model/customer/CustomerRequestModel.ts | 3 |
| IFieldCustomize | src/model/FormModel.ts | 61 |
| IFilterCalendarModalProps | src/model/scheduleCommon/PropsModel.ts | 5 |
| IFilterItem | src/model/OtherModel.ts | 15 |
| IForgotRequest | src/model/user/UserRequestModel.ts | 6 |
| IFormData | src/model/FormModel.ts | 2 |
| IFunctionalManagementListProps | src/model/functionalManagement/PropsModel.ts | 1 |
| IGiftCheckLinkRequest | src/model/gift/GiftRequestModel.ts | 2 |
| IGiftFilterRequest | src/model/gift/GiftRequestModel.ts | 2 |
| IGiftListProps | src/model/gift/PropsModel.ts | 1 |
| IGiftRequest | src/model/gift/GiftRequestModel.ts | 8 |
| IGiftRespone | src/model/gift/GiftResponseModel.ts | 9 |
| IGiftSeoRequest | src/model/gift/GiftRequestModel.ts | 5 |
| IGiftServiceEventRequest | src/model/gift/GiftRequestModel.ts | 5 |
| IGiftServiceEventResponse | src/model/gift/GiftResponseModel.ts | 5 |
| IGroupsFilterRequest | src/model/workOrder/WorkOrderRequestModel.ts | 4 |
| IHeaderInternalRightMailListProps | src/model/mailBox/PropsModel.ts | 4 |
| IHistoryUseCardModalProps | src/model/offer/PropsModel.ts | 4 |
| IIndustryFilterRequest | src/model/industry/IndustryRequestModel.ts | 3 |
| IIndustryRequestModel | src/model/industry/IndustryRequestModel.ts | 4 |
| IIndustryResponseModel | src/model/industry/IndustryResponseModel.ts | 5 |
| IInfoConversationProps | src/model/mailBox/PropsModel.ts | 1 |
| IInfoCustomerPurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 1 |
| IInfoCustomerTicketProps | src/model/ticket/PropsModel.ts | 1 |
| IInfoCustomerWarrantyProps | src/model/warranty/PropsModel.ts | 1 |
| IInfoExchangePurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 1 |
| IInfoExchangeTicketProps | src/model/ticket/PropsModel.ts | 1 |
| IInfoExchangeWarrantyProps | src/model/warranty/PropsModel.ts | 1 |
| IInfoExpiryDateProductionDate | src/model/warehouse/WarehouseRequestModel.ts | 2 |
| IInfoPersonProps | src/model/customer/PropsModel.ts | 1 |
| IInstallApplicationFilterRequest | src/model/installApplication/InstallApplicationRequestModel.ts | 3 |
| IInstallApplicationRequest | src/model/installApplication/InstallApplicationRequestModel.ts | 5 |
| IInstallApplicationResponse | src/model/installApplication/InstallApplicationResponseModel.ts | 7 |
| IInventoryFilterRequest | src/model/inventory/InventoryRequestModel.ts | 3 |
| IInventoryRequest | src/model/inventory/InventoryRequestModel.ts | 9 |
| IInventoryResponse | src/model/inventory/InventoryResponseModel.ts | 12 |
| IInvoiceCreateRequest | src/model/invoice/InvoiceRequestModel.ts | 21 |
| IInvoiceDetailFilterRequest | src/model/invoice/InvoiceRequestModel.ts | 1 |
| IInvoiceDetailListFilterRequest | src/model/invoice/InvoiceRequestModel.ts | 1 |
| IInvoiceDetailRequest | src/model/invoice/InvoiceRequestModel.ts | 11 |
| IInvoiceFilterRequest | src/model/invoice/InvoiceRequestModel.ts | 10 |
| IInvoiceRequest | src/model/invoice/InvoiceRequestModel.ts | 10 |
| IISurveyFormResponseModel | src/model/surveyForm/SurveyFormResponseModel.ts | 2 |
| IKanbanConstractProps | src/model/contract/PropsModel.ts | 6 |
| IKanbanContactProps | src/model/contact/PropsModel.ts | 6 |
| IKanbanPurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 2 |
| IKanbanTicketProps | src/model/ticket/PropsModel.ts | 2 |
| IKanbanWarrantyProps | src/model/warranty/PropsModel.ts | 1 |
| IKanbanWorkProps | src/model/workOrder/PropsModel.ts | 7 |
| IKeywordDataListProps | src/model/keywordData/PropsModel.ts | 1 |
| IKeywordIndustryListProps | src/model/industry/PropsModel.ts | 1 |
| IKpiApplyFilterRequest | src/model/kpiApply/KpiApplyRequestModel.ts | 5 |
| IKpiApplyRequest | src/model/kpiApply/KpiApplyRequestModel.ts | 2 |
| IKpiApplyResponse | src/model/kpiApply/KpiApplyResponseModel.ts | 8 |
| IKpiDatasourceFilterRequest | src/model/kpiDatasource/KpiDatasourceRequestModel.ts | 3 |
| IKpiDatasourceRequest | src/model/kpiDatasource/KpiDatasourceRequestModel.ts | 6 |
| IKpiDatasourceResponse | src/model/kpiDatasource/KpiDatasourceResponseModel.ts | 8 |
| IKpiExchangeFilterRequest | src/model/kpiObject/KpiObjectRequestModel.ts | 3 |
| IKpiExchangeResponseModal | src/model/kpiObject/KpiObjectResponseModel.ts | 10 |
| IKpiFilterRequest | src/model/kpi/KpiRequestModel.ts | 5 |
| IKpiGoalFilterRequest | src/model/kpiGoal/KpiGoalRequestModel.ts | 3 |
| IKpiGoalListProps | src/model/kpiGoal/PropsModel.ts | 1 |
| IKpiGoalRequest | src/model/kpiGoal/KpiGoalRequestModel.ts | 4 |
| IKpiGoalResponse | src/model/kpiGoal/KpiGoalResponseModel.ts | 18 |
| IKpiObjectFilterRequest | src/model/kpiObject/KpiObjectRequestModel.ts | 4 |
| IKpiObjectModalProps | src/model/kpiObject/PropsModel.ts | 5 |
| IKpiObjectRequest | src/model/kpiObject/KpiObjectRequestModel.ts | 5 |
| IKpiObjectResponse | src/model/kpiObject/KpiObjectResponseModel.ts | 10 |
| IKpiRequest | src/model/kpi/KpiRequestModel.ts | 2 |
| IKpiResponse | src/model/kpi/KpiResponseModel.ts | 6 |
| IKpiSetupFilterRequest | src/model/kpiSetup/KpiSetupRequestModel.ts | 3 |
| IKpiSetupModalProps | src/model/kpiSetup/PropsModel.ts | 5 |
| IKpiSetupRequest | src/model/kpiSetup/KpiSetupRequestModel.ts | 5 |
| IKpiSetupResponse | src/model/kpiSetup/KpiSetupResponseModel.ts | 7 |
| IKpiTemplateFilterRequest | src/model/kpiTemplate/KpiTemplateRequestModel.ts | 5 |
| IKpiTemplateGoalFilterRequest | src/model/kpiTemplateGoal/KpiTemplateGoalRequestModel.ts | 3 |
| IKpiTemplateGoalModalProps | src/model/kpiTemplateGoal/PropsModel.ts | 5 |
| IKpiTemplateGoalRequest | src/model/kpiTemplateGoal/KpiTemplateGoalRequestModel.ts | 5 |
| IKpiTemplateGoalResponse | src/model/kpiTemplateGoal/KpiTemplateGoalResponseModel.ts | 7 |
| IKpiTemplateRequest | src/model/kpiTemplate/KpiTemplateRequestModel.ts | 2 |
| IKpiTemplateResponse | src/model/kpiTemplate/KpiTemplateResponseModel.ts | 6 |
| ILinkEmployeeUserRequest | src/model/employee/EmployeeRequestModel.ts | 2 |
| IListBillProps | src/model/customer/PropsModel.ts | 1 |
| IListByIdFilterRequest | src/model/customer/CustomerRequestModel.ts | 3 |
| IListChatProps | src/model/fanpageFacebook/PropsModel.ts | 2 |
| IListChatZaloProps | src/model/fanpageFacebook/PropsModel.ts | 1 |
| IListCommentProps | src/model/fanpageFacebook/PropsModel.ts | 2 |
| IListMailboxExchangeResponseModel | src/model/mailBox/MailBoxResponseModel.ts | 12 |
| IListTabDetailProps | src/model/customer/PropsModel.ts | 1 |
| IListWarehouseProductFilterRequest | src/model/warehouse/WarehouseRequestModel.ts | 4 |
| IListWorkProps | src/model/workOrder/PropsModel.ts | 13 |
| ILstAttachmentsFilterRequest | src/model/customer/CustomerRequestModel.ts | 3 |
| ILstVideoSupportProps | src/model/videoSupport/PropsModel.ts | 2 |
| IMailboxExchangeFilterRequest | src/model/mailBox/MailBoxRequestModel.ts | 3 |
| IMailboxExchangeRequestModel | src/model/mailBox/MailBoxRequestModel.ts | 5 |
| IMailboxExchangeResponseModel | src/model/mailBox/MailBoxResponseModel.ts | 13 |
| IMailBoxFilterRequest | src/model/mailBox/MailBoxRequestModel.ts | 3 |
| IMailBoxRequestModel | src/model/mailBox/MailBoxRequestModel.ts | 6 |
| IMailBoxResponseModel | src/model/mailBox/MailBoxResponseModel.ts | 13 |
| IMailboxViewerFilterRequest | src/model/mailBox/MailBoxRequestModel.ts | 1 |
| IMailBoxViewerRequestModel | src/model/mailBox/MailBoxRequestModel.ts | 2 |
| IMailboxViewerResponseModel | src/model/mailBox/MailBoxResponseModel.ts | 20 |
| IMakeCallOTPModel | src/model/callCenter/DoctorQnARequestModel.ts | 2 |
| IMedicalAIStatisticsProps | src/model/report/PropsModel.ts | 2 |
| IMenuItem | src/model/OtherModel.ts | 9 |
| IMenuTab | src/model/OtherModel.ts | 2 |
| IMessageChatExchangePersonProps | src/model/customer/PropsModel.ts | 3 |
| IMessageChatFeedbackPersonProps | src/model/customer/PropsModel.ts | 3 |
| IMessageChatKpiProps | src/model/kpiObject/KpiObjectRequestModel.ts | 5 |
| IMessageChatkpiRequestModal | src/model/kpiObject/KpiObjectRequestModel.ts | 4 |
| IMessageChatOpportunityProps | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 5 |
| IMessageChatOpportunityRequestModal | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 5 |
| IMessageChatProps | src/model/mailBox/PropsModel.ts | 4 |
| IMessageChatPurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 3 |
| IMessageChatTicketProps | src/model/ticket/PropsModel.ts | 3 |
| IMessageChatWarrantyProps | src/model/warranty/PropsModel.ts | 3 |
| IMessageChatWorkProps | src/model/workOrder/WorkOrderRequestModel.ts | 5 |
| IMessageChatWorkRequestModal | src/model/workOrder/WorkOrderRequestModel.ts | 4 |
| IModalAddImageProps | src/model/editor/PropsModel.ts | 3 |
| IModalAddVideoProps | src/model/editor/PropsModel.ts | 3 |
| IModalImportCustomerProps | src/model/customer/PropsModel.ts | 2 |
| InfoCardServiceProps | src/model/customer/PropsModel.ts | 9 |
| InfoCustomerProps | src/model/customer/PropsModel.ts | 4 |
| InfoServiceProductProps | src/model/customer/PropsModel.ts | 13 |
| INotification | src/model/OtherModel.ts | 3 |
| INotificationItem | src/model/OtherModel.ts | 7 |
| IObjectSourceFilterRequestModel | src/model/objectSource/ObjectSourceRequestModel.ts | 10 |
| IObjectSourceResponseModel | src/model/objectSource/ObjectSourceResponseModel.ts | 12 |
| IOfferCardFilterRequest | src/model/offerCard/OfferCardRequestModel.ts | 2 |
| IOfferCardRequest | src/model/offerCard/OfferCardRequestModel.ts | 18 |
| IOfferCardResponse | src/model/offerCard/OfferCardResponseModel.ts | 6 |
| IOfferCardUpdateRequest | src/model/offerCard/OfferCardRequestModel.ts | 2 |
| IOfferCreateRequest | src/model/offer/OfferRequestModel.ts | 19 |
| IOfferDetailFilterRequest | src/model/offer/OfferRequestModel.ts | 1 |
| IOfferDetailListFilterRequest | src/model/offer/OfferRequestModel.ts | 1 |
| IOfferDetailRequest | src/model/offer/OfferRequestModel.ts | 11 |
| IOfferFilterRequest | src/model/offer/OfferRequestModel.ts | 8 |
| IOfferProductFilterRequest | src/model/offerProduct/OfferProductRequestModel.ts | 6 |
| IOfferProductRequest | src/model/offerProduct/OfferProductRequestModel.ts | 18 |
| IOfferProductResponse | src/model/offerProduct/OfferProductResponseModel.ts | 25 |
| IOfferProductToInvoiceRequest | src/model/offerProduct/OfferProductRequestModel.ts | 13 |
| IOfferProductToInvoiceResponse | src/model/offerProduct/OfferProductResponseModel.ts | 9 |
| IOfferRequest | src/model/offer/OfferRequestModel.ts | 10 |
| IOfferServiceByCustomerResponse | src/model/offerService/OfferServiceResponseModel.ts | 23 |
| IOfferServiceFilterRequest | src/model/offerService/OfferServiceRequestModel.ts | 1 |
| IOfferServiceRequest | src/model/offerService/OfferServiceRequestModel.ts | 16 |
| IOfferServiceResponse | src/model/offerService/OfferServiceResponseModel.ts | 20 |
| IOfferServiceToInvoiceRequest | src/model/offerService/OfferServiceRequestModel.ts | 14 |
| IOpportunityExchangeFilterRequest | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 3 |
| IOpportunityExchangeResponseModal | src/model/campaignOpportunity/CampaignOpportunityResponseModel.ts | 10 |
| IOpportunityProcessUpdateRequestModel | src/model/campaignOpportunity/CampaignOpportunityRequestModel.ts | 5 |
| IOption | src/model/OtherModel.ts | 6 |
| IOptManagementItemProps | src/model/workOpt/PropsModel.ts | 8 |
| IOptManagementListProps | src/model/workOpt/PropsModel.ts | 6 |
| IOverview | src/model/dashboard/DashboardModel.ts | 5 |
| IPartnerCallFilterRequest | src/model/partnerCall/PartnerCallRequestModel.ts | 3 |
| IPartnerCallListProps | src/model/partnerCall/PropsModel.ts | 1 |
| IPartnerCallRequestModel | src/model/partnerCall/PartnerCallRequestModel.ts | 7 |
| IPartnerCallResponseModel | src/model/partnerCall/PartnerCallResponseModel.ts | 7 |
| IPartnerEmailFilterRequest | src/model/partnerEmail/PartnerEmailRequestModel.ts | 3 |
| IPartnerEmailListProps | src/model/partnerEmail/PropsModel.ts | 1 |
| IPartnerEmailRequestModel | src/model/partnerEmail/PartnerEmailRequestModel.ts | 7 |
| IPartnerEmailResponseModel | src/model/partnerEmail/PartnerEmailResponseModel.ts | 7 |
| IPartnerSMSFilterRequest | src/model/partnerSMS/PartnerSMSRequestModel.ts | 3 |
| IPartnerSMSListProps | src/model/partnerSMS/PropsModel.ts | 1 |
| IPartnerSMSRequestModel | src/model/partnerSMS/PartnerSMSRequestModel.ts | 7 |
| IPartnerSMSResponseModel | src/model/partnerSMS/PartnerSMSResponseModel.ts | 7 |
| IPaymentBillProps | src/model/sell/PropsModel.ts | 9 |
| IPaymentHistoryFilterRequest | src/model/paymentHistory/PaymentHistoryRequestModel.ts | 3 |
| IPaymentHistoryRequest | src/model/paymentHistory/PaymentHistoryRequestModel.ts | 6 |
| IPaymentHistoryResponse | src/model/paymentHistory/PaymentHistoryResponseModel.ts | 0 |
| IPermissionCloneRequest | src/model/permission/PermissionRequestModel.ts | 4 |
| IPermissionDepartmentAddRequest | src/model/permission/PermissionRequestModel.ts | 4 |
| IPomModalProps | src/model/pom/PropsModel.ts | 3 |
| IPomRequest | src/model/pom/PomRequestModel.ts | 6 |
| IPomResponse | src/model/pom/PomResponseModel.ts | 11 |
| IPositionFilterRequest | src/model/position/PositionRequestModel.ts | 3 |
| IPositionListProps | src/model/position/PropsModel.ts | 1 |
| IPositionRequest | src/model/position/PositionRequestModel.ts | 4 |
| IPositionResponse | src/model/position/PositionResponseModel.ts | 4 |
| IPriceVariationResponse | src/model/service/ServiceResponseModel.ts | 5 |
| IProductFilterRequest | src/model/product/ProductRequestModel.ts | 3 |
| IProductImportFilterRequest | src/model/productImport/ProductImportRequestModel.ts | 1 |
| IProductImportRequest | src/model/productImport/ProductImportRequestModel.ts | 10 |
| IProductImportResponse | src/model/productImport/ProductImportResponseModel.ts | 15 |
| IProductListProps | src/model/product/PropsModel.ts | 1 |
| IProductReportTemplateListProps | src/model/reportTemplate/PropsModel.ts | 1 |
| IProductRequest | src/model/product/ProductRequestModel.ts | 20 |
| IProductResponse | src/model/product/ProductResponseModel.ts | 20 |
| IProductUnitListProps | src/model/unit/PropsModel.ts | 1 |
| IProjectManagementItemProps | src/model/workProject/PropsModel.ts | 8 |
| IProjectManagementListProps | src/model/workProject/PropsModel.ts | 5 |
| IPurchaseCategoryFilterRequest | src/model/PurchaseRequest/PurchaseRequestModel.ts | 4 |
| IPurchasedProductProps | src/model/customer/PropsModel.ts | 1 |
| IPurchasedServiceProps | src/model/customer/PropsModel.ts | 1 |
| IPurchaseExchangeFilterRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 3 |
| IPurchaseExchangeListResponseModel | src/model/PurchaseRequest/PurchaseResponseModel.ts | 11 |
| IPurchaseExchangeUpdateRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 5 |
| IPurchaseFilterRequest | src/model/PurchaseRequest/PurchaseRequestModel.ts | 9 |
| IPurchaseProcessRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 7 |
| IPurchaseRepairRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 2 |
| IPurchaseRepairResponseModel | src/model/PurchaseRequest/PurchaseResponseModel.ts | 2 |
| IPurchaseRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 45 |
| IPurchaseResponseModel | src/model/PurchaseRequest/PurchaseResponseModel.ts | 47 |
| IPurchaseStatusRequestModel | src/model/PurchaseRequest/PurchaseRequestModel.ts | 2 |
| IRecoverPublicDebtsProps | src/model/common/PropsModel.ts | 5 |
| IRentalTypeListProps | src/model/rentalType/PropsModel.ts | 1 |
| IRentalTypeResponse | src/model/rentalType/RentalTypeResponseModel.ts | 4 |
| IRentalTyppeFilterRequest | src/model/rentalType/RentalTypeRequestModel.ts | 3 |
| IRentalTyppeRequest | src/model/rentalType/RentalTypeRequestModel.ts | 4 |
| IReplyFanpageChatRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 3 |
| IReplyFanpageCommentRequest | src/model/fanpageFacebook/FanpageFacebookRequestModel.ts | 4 |
| IReportTemplateFilterRequest | src/model/reportTemplate/ReportTemplateRequestModel.ts | 1 |
| IReportTemplateRequest | src/model/reportTemplate/ReportTemplateRequestModel.ts | 4 |
| IReportTemplateResponse | src/model/reportTemplate/ReportTemplateResponseModel.ts | 4 |
| IRouter | src/model/OtherModel.ts | 3 |
| ISaveSearch | src/model/OtherModel.ts | 4 |
| ISaveSearchParam | src/model/OtherModel.ts | 3 |
| IScheduleConsultantFilterRequest | src/model/scheduleConsultant/ScheduleConsultantRequestModel.ts | 3 |
| IScheduleConsultantRequestModelProps | src/model/scheduleConsultant/ScheduleConsultantRequestModel.ts | 15 |
| IScheduleConsultantResponseModelProps | src/model/scheduleConsultant/ScheduleConsultantResponseModel.ts | 15 |
| IScheduleTreatmentFilterRequest | src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts | 7 |
| IScheduleTreatmentRequestModal | src/model/scheduleTreatment/ScheduleTreatmentRequestModel.ts | 13 |
| IScheduleTreatmentResponseModal | src/model/scheduleTreatment/ScheduleTreatmentResponseModel.ts | 14 |
| IScheduleTreatmentResponseModalProps | src/model/scheduleTreatment/PropsModel.ts | 6 |
| ISelectUsersFilterRequest | src/model/user/UserRequestModel.ts | 3 |
| ISendEmail | src/model/sendEmail/PropsModel.ts | 8 |
| ISendSMS | src/model/sendSMS/PropsModel.ts | 9 |
| IServiceCardListProps | src/model/cardService/PropsModel.ts | 1 |
| IServiceCardPurchasedProps | src/model/customer/PropsModel.ts | 1 |
| IServiceFilterRequest | src/model/service/ServiceRequestModel.ts | 5 |
| IServiceListProps | src/model/service/PropsModel.ts | 1 |
| IServiceProductListProps | src/model/customer/PropsModel.ts | 24 |
| IServiceRequestModel | src/model/service/ServiceRequestModel.ts | 19 |
| IServiceRespone | src/model/service/ServiceResponseModel.ts | 36 |
| ISettingFilterRequest | src/model/setting/SettingRequestModel.ts | 2 |
| ISettingRequest | src/model/setting/SettingRequestModel.ts | 9 |
| ISettingResponse | src/model/setting/SettingResponseModel.ts | 9 |
| IShortcut | src/model/dashboard/DashboardModel.ts | 5 |
| IShowCustomerInvoiceProps | src/model/sell/PropsModel.ts | 3 |
| IShowModalSubsystemProps | src/model/subsystemAdministration/PropsModel.ts | 6 |
| ISortItem | src/model/OtherModel.ts | 2 |
| IStepModalProps | src/model/warrantyStep/PropsModel.ts | 5 |
| ISubsystemAdministrationListProps | src/model/subsystemAdministration/PropsModel.ts | 1 |
| ISupportTaskModalProps | src/model/workOrder/PropsModel.ts | 2 |
| ISurveyFormFilterRequest | src/model/surveyForm/SurveyFormRequestModel.ts | 3 |
| ISurveyFormRequestModel | src/model/surveyForm/SurveyFormRequestModel.ts | 8 |
| ISwitchboardFilterRequest | src/model/switchboard/SwitchboardRequestModel.ts | 4 |
| ISwitchboardListProps | src/model/switchboard/PropsModel.ts | 1 |
| ISwitchboardRequestModel | src/model/switchboard/SwitchboardRequestModel.ts | 4 |
| ISwitchboardResponseModel | src/model/switchboard/SwitchboardResponseModel.ts | 8 |
| ITabContent | src/model/OtherModel.ts | 4 |
| ITabelServiceProps | src/model/service/PropsModel.ts | 27 |
| ITableContactStatusProps | src/model/contactStatus/PropsModel.ts | 8 |
| ITableContractApproachProps | src/model/contractApproach/PropsModel.ts | 8 |
| ITableDepartmentProps | src/model/department/PropsModel.ts | 28 |
| ITableFanpageFacebookProps | src/model/fanpageFacebook/PropsModel.ts | 5 |
| ITableKpiObjectProps | src/model/kpiObject/PropsModel.ts | 8 |
| ITableKpiSetupProps | src/model/kpiSetup/PropsModel.ts | 8 |
| ITableKpiTemplateGoalProps | src/model/kpiTemplateGoal/PropsModel.ts | 8 |
| ITablePomProps | src/model/pom/PropsModel.ts | 8 |
| ITablePurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 19 |
| ITableStepProps | src/model/warrantyStep/PropsModel.ts | 8 |
| ITableTemplateEmailProps | src/model/templateEmail/PropsModel.ts | 17 |
| ITableTemplateZaloProps | src/model/templateZalo/PropsModel.ts | 18 |
| ITableTicketProps | src/model/ticket/PropsModel.ts | 20 |
| ITableWarrantyProps | src/model/warranty/PropsModel.ts | 20 |
| ITableWorkInColapsedProps | src/model/workOrder/PropsModel.ts | 8 |
| ITableWorkOrderProps | src/model/workOrder/PropsModel.ts | 17 |
| ITaskItemProps | src/model/workOrder/PropsModel.ts | 4 |
| ITemplateCategoryListProps | src/model/templateCategory/PropsModel.ts | 4 |
| ITemplateEmailFilterRequest | src/model/templateEmail/TemplateEmailRequestModel.ts | 5 |
| ITemplateEmailListProps | src/model/templateEmail/PropsModel.ts | 1 |
| ITemplateEmailRequestModel | src/model/templateEmail/TemplateEmailRequestModel.ts | 7 |
| ITemplateEmailResponseModel | src/model/templateEmail/TemplateEmailResponseModel.ts | 8 |
| ITemplateSMSListProps | src/model/templateSMS/PropsModel.ts | 1 |
| ITemplateZaloFilterRequest | src/model/templateZalo/TemplateZaloRequestModel.ts | 5 |
| ITemplateZaloListProps | src/model/templateZalo/PropsModel.ts | 1 |
| ITemplateZaloRequestModel | src/model/templateZalo/TemplateZaloRequestModel.ts | 7 |
| ITemplateZaloResponseModel | src/model/templateZalo/TemplateZaloResponseModel.ts | 10 |
| ITemporarilyInvoiceRequest | src/model/invoice/InvoiceRequestModel.ts | 1 |
| ITemporarilyOfferRequest | src/model/offer/OfferRequestModel.ts | 1 |
| ITicketCategoryFilterRequest | src/model/ticketCategory/TicketCategoryRequestModel.ts | 4 |
| ITicketCategoryRequest | src/model/ticketCategory/TicketCategoryRequestModel.ts | 3 |
| ITicketCategoryResponse | src/model/ticketCategory/TicketCategoryResponseModel.ts | 4 |
| ITicketExchangeFilterRequestModel | src/model/ticket/TicketRequestModel.ts | 3 |
| ITicketExchangeListResponseModel | src/model/ticket/TicketResponseModel.ts | 12 |
| ITicketExchangeUpdateRequestModel | src/model/ticket/TicketRequestModel.ts | 5 |
| ITicketFilterRequest | src/model/ticket/TicketRequestModel.ts | 8 |
| ITicketPersonListProps | src/model/customer/PropsModel.ts | 1 |
| ITicketProcessRequestModel | src/model/ticket/TicketRequestModel.ts | 4 |
| ITicketProcFilterRequest | src/model/ticketProc/TicketProcRequestModel.ts | 6 |
| ITicketProcRequest | src/model/ticketProc/TicketProcRequestModel.ts | 2 |
| ITicketProcResponse | src/model/ticketProc/TicketProcResponseModel.ts | 7 |
| ITicketRequestModel | src/model/ticket/TicketRequestModel.ts | 16 |
| ITicketResponseModel | src/model/ticket/TicketResponseModel.ts | 34 |
| ITicketStatusRequestModel | src/model/ticket/TicketRequestModel.ts | 2 |
| ITicketStepFilterRequest | src/model/ticketStep/TicketStepRequestModel.ts | 3 |
| ITicketStepRequest | src/model/ticketStep/TicketStepRequestModel.ts | 8 |
| ITicketStepResponse | src/model/ticketStep/TicketStepResponseModel.ts | 9 |
| ITimekeepingFilterRequest | src/model/timekeeping/TimekeepingRequestModel.ts | 3 |
| ITimekeepingRequest | src/model/timekeeping/TimekeepingRequestModel.ts | 4 |
| ITimekeepingUpdateCaringEmployeeRequest | src/model/timekeeping/TimekeepingRequestModel.ts | 2 |
| ITipGroupConfigFilterRequest | src/model/tipGroupConfig/TipGroupConfigRequestModel.ts | 2 |
| ITipGroupConfigListProps | src/model/tipGroupConfig/PropsModel.ts | 1 |
| ITipGroupConfigRequest | src/model/tipGroupConfig/TipGroupConfigRequestModel.ts | 8 |
| ITipGroupConfigResponse | src/model/tipGroupConfig/TipGroupConfigResponseModel.ts | 10 |
| ITipGroupFilterRequest | src/model/tipGroupBak/TipGroupRequestModel.ts | 2 |
| ITipGroupListProps | src/model/tipGroupBak/PropsModel.ts | 1 |
| ITipGroupRequest | src/model/tipGroupBak/TipGroupRequestModel.ts | 7 |
| ITipGroupResponse | src/model/tipGroupBak/TipGroupResponseModel.ts | 9 |
| ITipGroupToTipGroupEmployeeFilterRequest | src/model/tipGroup/TipGroupRequestModel.ts | 3 |
| ITipGroupToTipGroupEmployeeRequest | src/model/tipGroup/TipGroupRequestModel.ts | 5 |
| ITipGroupToTipGroupEmployeeResponse | src/model/tipGroup/TipGroupResponseModel.ts | 15 |
| ITipListUserProps | src/model/tipUser/PropsModel.ts | 5 |
| ITipUserConfigFilterRequest | src/model/tipUserConfig/TipUserConfigRequestModel.ts | 3 |
| ITipUserConfigListProps | src/model/tipUserConfig/PropsModel.ts | 1 |
| ITipUserConfigRequest | src/model/tipUserConfig/TipUserConfigRequestModel.ts | 8 |
| ITipUserConfigResponse | src/model/tipUserConfig/TipUserConfigResponseModel.ts | 12 |
| ITipUserDetail | src/model/tipUser/PropsModel.ts | 5 |
| ITipUserFilterRequest | src/model/tipUser/TipUserRequestModel.ts | 4 |
| ITipUserProps | src/model/tipUser/PropsModel.ts | 1 |
| ITipUserRequest | src/model/tipUser/TipUserRequestModel.ts | 4 |
| ITipUserResponse | src/model/tipUser/TipUserResponseModel.ts | 4 |
| ITipUserToTipUserEmployeeFilterRequest | src/model/tipUser/TipUserRequestModel.ts | 3 |
| ITipUserToTipUserEmployeeRequest | src/model/tipUser/TipUserRequestModel.ts | 5 |
| ITipUserToTipUserEmployeeResponse | src/model/tipUser/TipUserResponseModel.ts | 15 |
| ITransferCallModel | src/model/callCenter/DoctorQnARequestModel.ts | 3 |
| ITransferExecutorProps | src/model/warranty/PropsModel.ts | 5 |
| ITreamentFilterByScheduler | src/model/treatment/TreamentRequestModel.ts | 1 |
| ITreamentFilterRequest | src/model/treatment/TreamentRequestModel.ts | 7 |
| ITreamentRequest | src/model/treatment/TreamentRequestModel.ts | 11 |
| ITreamentResponse | src/model/treatment/TreamentResponseModel.ts | 27 |
| ITreamentSchedulerResponse | src/model/treatment/TreamentResponseModel.ts | 12 |
| ITreamentUpdateCaringEmployeeRequest | src/model/treatment/TreamentRequestModel.ts | 2 |
| ITreamentUpdateNextRequest | src/model/treatment/TreamentRequestModel.ts | 3 |
| ITreatmentHistoryFilterRequest | src/model/treatmentHistory/TreatmentHistoryRequestModel.ts | 7 |
| ITreatmentHistoryListByCustomerFilterRequest | src/model/treatmentHistory/TreatmentHistoryRequestModel.ts | 4 |
| ITreatmentHistoryRequestModel | src/model/treatmentHistory/TreatmentHistoryRequestModel.ts | 19 |
| ITreatmentHistoryResponseModel | src/model/treatmentHistory/TreatmentHistoryResponseModel.ts | 34 |
| IUnitFilterRequest | src/model/unit/UnitRequestModel.ts | 3 |
| IUnitRequest | src/model/unit/UnitRequestModel.ts | 5 |
| IUnitResponse | src/model/unit/UnitResponseModel.ts | 5 |
| IUpdateCommonRequest | src/model/customer/CustomerRequestModel.ts | 5 |
| IUpdateCustomeRelationshipRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| IUpdateCustomerEmployeeRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| IUpdateCustomerGroupRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| IUpdateCustomerSourceRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| IUpdateObjectIdRequest | src/model/gift/GiftRequestModel.ts | 2 |
| IUpdateOneRelationshipRequest | src/model/customer/CustomerRequestModel.ts | 2 |
| IUpdateParticipantRequestModel | src/model/workOrder/WorkOrderRequestModel.ts | 2 |
| IUpdatePeopleInvolvedProps | src/model/workOrder/PropsModel.ts | 1 |
| IUpdatePriorityLevelRequestModal | src/model/workOrder/WorkOrderRequestModel.ts | 2 |
| IUpdateRatingRequestModal | src/model/workOrder/WorkOrderRequestModel.ts | 3 |
| IUpdateRelatedCustomerRequestModel | src/model/workOrder/WorkOrderRequestModel.ts | 2 |
| IUpdateRelatedWorkProps | src/model/workOrder/PropsModel.ts | 1 |
| IUpdateRelatedWorkRequestModel | src/model/workOrder/WorkOrderRequestModel.ts | 2 |
| IUpdateStageRequest | src/model/contract/ContractRequestModel.ts | 14 |
| IUpdateStatusRequest | src/model/workOrder/WorkOrderRequestModel.ts | 2 |
| IUpdateWorkInprogressModel | src/model/workOrder/WorkOrderRequestModel.ts | 4 |
| IUploadDocumentModalProps | src/model/mailBox/PropsModel.ts | 1 |
| IUploadMediaModalProps | src/model/mailBox/PropsModel.ts | 2 |
| IUser | src/model/user/UserResponseModel.ts | 48 |
| IUserLoginRequest | src/model/user/UserRequestModel.ts | 2 |
| IUserRequest | src/model/user/UserRequestModel.ts | 12 |
| IValidate | src/model/OtherModel.ts | 2 |
| IValidation | src/model/FormModel.ts | 2 |
| IValueFilter | src/model/OtherModel.ts | 2 |
| IVideoSupportFilterRequest | src/model/videoSupport/VideoSupportRequestModel.ts | 5 |
| IVideoSupportResponseModel | src/model/videoSupport/VideoSupportResponseModel.ts | 18 |
| IViewAdjustmentSlipProps | src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts | 5 |
| IViewConfigDepartmentProps | src/model/department/PropsModel.ts | 2 |
| IViewDetailDepartmentModalProps | src/model/department/PropsModel.ts | 3 |
| IViewDetailPersonProps | src/model/customer/PropsModel.ts | 5 |
| IViewDetailTreamentHistoryModalProps | src/model/treatmentHistory/PropsModel.ts | 3 |
| IViewEmployeeInDepartmentProps | src/model/department/PropsModel.ts | 4 |
| IViewInfoPurchaseProps | src/model/PurchaseRequest/PropsModel.ts | 4 |
| IViewInfoTicketProps | src/model/ticket/PropsModel.ts | 4 |
| IViewInfoWarrantyProps | src/model/warranty/PropsModel.ts | 4 |
| IViewNewPasswordProps | src/model/employee/PropsModel.ts | 4 |
| IViewOptManagementModalProps | src/model/workOpt/PropsModel.ts | 3 |
| IViewProjectManagementModalProps | src/model/workProject/PropsModel.ts | 4 |
| IViewStatusPurchaseModalProps | src/model/PurchaseRequest/PropsModel.ts | 3 |
| IViewStatusPurchaseResponseModel | src/model/PurchaseRequest/PurchaseResponseModel.ts | 13 |
| IViewStatusTicketModalProps | src/model/ticket/PropsModel.ts | 3 |
| IViewStatusTicketResponseModel | src/model/ticket/TicketResponseModel.ts | 15 |
| IViewStatusWarrantyModalProps | src/model/warranty/PropsModel.ts | 3 |
| IViewWorkInprogressModalProps | src/model/workOrder/PropsModel.ts | 3 |
| IViewWorkModalProps | src/model/workOrder/PropsModel.ts | 3 |
| IWarehouseFilterRequest | src/model/warehouse/WarehouseRequestModel.ts | 3 |
| IWarehouseProFilterRequest | src/model/adjustmentSlip/AdjustmentSlipRequestModel.ts | 4 |
| IWarehouseProResponse | src/model/adjustmentSlip/AdjustmentSlipResponseModel.ts | 14 |
| IWarehouseResponse | src/model/warehouse/WarehouseResponseModel.ts | 11 |
| IWarrantyCategoryFilterRequest | src/model/warrantyCategory/WarrantyCategoryRequestModel.ts | 4 |
| IWarrantyCategoryListResponseModel | src/model/warranty/WarrantyResponseModel.ts | 5 |
| IWarrantyCategoryRequest | src/model/warrantyCategory/WarrantyCategoryRequestModel.ts | 2 |
| IWarrantyCategoryRequestModel | src/model/warranty/WarrantyRequestModel.ts | 1 |
| IWarrantyCategoryResponse | src/model/warrantyCategory/WarrantyCategoryResponseModel.ts | 6 |
| IWarrantyExchangeFilterRequestModel | src/model/warranty/WarrantyRequestModel.ts | 3 |
| IWarrantyExchangeListResponseModel | src/model/warranty/WarrantyResponseModel.ts | 12 |
| IWarrantyExchangeUpdateRequestModel | src/model/warranty/WarrantyRequestModel.ts | 5 |
| IWarrantyFilterRequest | src/model/warranty/WarrantyRequestModel.ts | 8 |
| IWarrantyListProps | src/model/customer/PropsModel.ts | 1 |
| IWarrantyProcessRequestModel | src/model/warranty/WarrantyRequestModel.ts | 5 |
| IWarrantyProcFilterRequest | src/model/warrantyProc/WarrantyProcRequestModel.ts | 3 |
| IWarrantyProcRequest | src/model/warrantyProc/WarrantyProcRequestModel.ts | 2 |
| IWarrantyProcResponse | src/model/warrantyProc/WarrantyProcResponseModel.ts | 5 |
| IWarrantyRequestModel | src/model/warranty/WarrantyRequestModel.ts | 12 |
| IWarrantyResponseModel | src/model/warranty/WarrantyResponseModel.ts | 30 |
| IWarrantyStatusRequestModel | src/model/warranty/WarrantyRequestModel.ts | 2 |
| IWarrantyStepFilterRequest | src/model/warrantyStep/WarrantyStepRequestModel.ts | 3 |
| IWarrantyStepRequest | src/model/warrantyStep/WarrantyStepRequestModel.ts | 7 |
| IWarrantyStepResponse | src/model/warrantyStep/WarrantyStepResponseModel.ts | 9 |
| IWarrantyViewerRequestModel | src/model/warranty/WarrantyRequestModel.ts | 1 |
| IWarrantyViewerResponseModel | src/model/warranty/WarrantyResponseModel.ts | 30 |
| IWorkExchangeFilterRequest | src/model/workOrder/WorkOrderRequestModel.ts | 3 |
| IWorkExchangeResponseModal | src/model/workOrder/WorkOrderResponseModel.ts | 10 |
| IWorkInprogressFilterRequest | src/model/workOrder/WorkOrderRequestModel.ts | 3 |
| IWorkInprogressResponseModal | src/model/workOrder/WorkOrderResponseModel.ts | 6 |
| IWorkOptFilterRequest | src/model/workOpt/WorkOptRequestModel.ts | 7 |
| IWorkOptRequestModel | src/model/workOpt/WorkOptRequestModel.ts | 10 |
| IWorkOptResponseModel | src/model/workOpt/WorkOptResponseModel.ts | 14 |
| IWorkOrderDocFile | src/model/workOrder/WorkOrderResponseModel.ts | 4 |
| IWorkOrderFilterRequest | src/model/workOrder/WorkOrderRequestModel.ts | 18 |
| IWorkOrderRequestModel | src/model/workOrder/WorkOrderRequestModel.ts | 21 |
| IWorkOrderResponseModel | src/model/workOrder/WorkOrderResponseModel.ts | 34 |
| IWorkProjectFilterRequest | src/model/workProject/WorkProjectRequestModel.ts | 7 |
| IWorkProjectRequestModel | src/model/workProject/WorkProjectRequestModel.ts | 11 |
| IWorkProjectResponseModel | src/model/workProject/WorkProjectResponseModel.ts | 15 |
| IWorkTypeFilterRequest | src/model/workType/WorkTypeRequestModel.ts | 3 |
| IWorkTypeRequest | src/model/workType/WorkTypeRequestModel.ts | 3 |
| IWorkTypeResponse | src/model/workType/WorkTypeResponseModel.ts | 4 |
| IZaloDialogResponse | src/model/fanpageFacebook/FanpageResponseModel.ts | 9 |
| IZnsTemplateFilterRequest | src/model/znsTemplate/ZnsTemplateRequestModel.ts | 3 |
| IZnsTemplateListProps | src/model/znsTemplate/PropsModel.ts | 1 |
| IZnsTemplateRequest | src/model/znsTemplate/ZnsTemplateRequestModel.ts | 4 |
| IZnsTemplateResponse | src/model/znsTemplate/ZnsTemplateResponseModel.ts | 8 |
| ListBoughtCardServiceProps | src/model/customer/PropsModel.ts | 2 |
| ListBoughtProductByCustomerProps | src/model/customer/PropsModel.ts | 2 |
| ListBoughtServiceByCustomerProps | src/model/customer/PropsModel.ts | 2 |
| ListCustomerInvoiceProps | src/model/customer/PropsModel.ts | 2 |
| LoginFanpageModalProps | src/model/fanpageFacebook/PropsModel.ts | 3 |
| PaymentImportInvoicesProps | src/model/invoice/PropsModel.ts | 2 |
| PaymentImportOffersProps | src/model/offer/PropsModel.ts | 2 |
| SeeReceiptProps | src/model/offer/PropsModel.ts | 3 |
| ShowCallHistoryProps | src/model/treatment/PropsModel.ts | 6 |
| ShowDetailPostModalProps | src/model/analysis/PropsModel.ts | 3 |
| ShowInvoiceModalProps | src/model/invoice/PropsModel.ts | 2 |
| ShowModalDetailOfferProps | src/model/offer/PropsModel.ts | 3 |
| ShowModalDetailSaleInvoiceProps | src/model/invoice/PropsModel.ts | 3 |
| ShowOfferModalProps | src/model/offer/PropsModel.ts | 2 |
| ShowPaymentBillModalProps | src/model/offer/PropsModel.ts | 3 |
| ShowServiceTreatmentProps | src/model/treatment/PropsModel.ts | 3 |
| ShowTipGroupToTipGroupEmployeeModalProps | src/model/tipGroup/PropsModel.ts | 3 |
| ShowTipUserToTipUserEmployeeModalProps | src/model/tipUser/PropsModel.ts | 3 |
| UpdateCommonModalProps | src/model/customer/PropsModel.ts | 8 |
| UpdateTreatmentHistoryProps | src/model/treatment/PropsModel.ts | 3 |
| UpUpdateCardServiceModalProps | src/model/offer/PropsModel.ts | 3 |

---

# Enum & Status Values

## Customer Gender

| Value | Meaning |
|-------|--------|
| 0 | Female (mock data) |
| 1 | Male (mock data) |

## Customer Type (custType)

| Value | Meaning |
|-------|--------|
| 0 | Individual |
| 1 | Business |

## Appointment Status (customerScheduler)

| Value | statusName (mock) |
|-------|------------------|
| 0 | Chờ xác nhận |
| 1 | Đã xác nhận |
| 2 | Đã hoàn thành |

## BPM Process Status

| Value | Meaning |
|-------|--------|
| 0 | Inactive/Draft |
| 1 | Active |

## BPM State Mapping (stateCode)

| stateCode | stateName |
|-----------|----------|
| NEW | Mới tiếp nhận |
| IN_PROGRESS | Đang xử lý |
| WAITING | Chờ kết quả |
| DONE | Hoàn thành |
| REJECTED | Từ chối |

## Processed Object Priority

| Value | Meaning |
|-------|--------|
| normal | Normal priority |
| high | High priority |
| urgent | Urgent priority |

## BPM Node ID Format

⚠️ **CRITICAL:** `nodeId`, `linkId`, BPMN element IDs are **Strings** (e.g. `Task_1`, `Gateway_1`, `Flow_1`, `StartEvent_1`, `EndEvent_1`, `SE_TiepNhan`, `UT_KhamChanDoan`). Backend MUST NOT convert to numeric IDs.

## Work Order Status

| Value | Meaning (inferred from mock) |
|-------|-----------------------------|
| 0 | Pending |
| 1 | In progress |
| 2 | Completed |
| 4 | Special state |


---

*Document auto-generated from CareFollow CRM Frontend. MSW handlers: `src/mocks/handlers/`. URL config: `src/configs/urls.ts`. Models: `src/model/`.*
