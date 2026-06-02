# BPM API — Hướng dẫn tích hợp cho Frontend Team

> Base URL: `https://<host>/bpmapi`
> Tất cả request cần header: `Authorization: Bearer <jwt_token>`
> Response envelope: `{ code: 0, message: "Success", result: <data> }`

---

## Mục lục

1. [Quản lý Quy trình (Business Process / Diagram)](#1-quản-lý-quy-trình)
2. [Cấu hình Node & Link trên sơ đồ](#2-cấu-hình-node--link)
3. [Cài đặt thuộc tính UserTask (BPM Designer)](#3-cài-đặt-thuộc-tính-usertask--bpm-designer)
4. [Ca bệnh chờ xử lý (Work Order Runtime)](#4-ca-bệnh-chờ-xử-lý--work-order-runtime)
5. [Form & Variable Mapping](#5-form--variable-mapping)
6. [Bảng mapping field: FE ↔ BE](#6-bảng-mapping-field-fe--be)
7. [Bảng trạng thái (status)](#7-bảng-trạng-thái-status)

---

## 1. Quản lý Quy trình

### Lấy danh sách quy trình

```
GET /bpmapi/businessProcess/list
Query: page=1&limit=20&keyword=Viêm Da
```

**Response `result`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Điều trị ca Viêm Da Nặng",
      "code": "VIEM_DA_01",
      "status": "draft",          // "draft" | "published" | "archived"
      "category": "dermatology",
      "description": "...",
      "nodes": [...],
      "edges": [...],
      "createdAt": "2026-06-02T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Lấy chi tiết (bao gồm toàn bộ nodes + edges)

```
GET /bpmapi/businessProcess/detail?id={processId}
GET /bpmapi/businessProcess/get?id={processId}      // alias
```

### Lưu bản vẽ XML (Save Diagram)

```
POST /bpmapi/businessProcess/update/config
POST /bpmapi/businessProcess/updateConfig           // alias — dùng một trong hai
```

**Request body:**
```json
{
  "id": "uuid-cua-process",
  "config": "<?xml version=\"1.0\"?>..."
}
```

> **Lưu ý:** `config` là chuỗi XML từ BPMN.js / ReactFlow. BE lưu nguyên chuỗi, FE tự parse lại khi render.

### Cập nhật SLA

```
POST /bpmapi/businessProcess/update/sla
```

```json
{
  "id": "uuid-cua-process",
  "slaTime": 24,
  "slaUnit": "HOURS"
}
```

### Tạo / Cập nhật / Xoá quy trình

```
POST   /bpmapi/businessProcess/update     // upsert (có id → update, không có id → create)
DELETE /bpmapi/businessProcess/delete?id={processId}
POST   /bpmapi/businessProcess/clone      // body: { "id": "uuid" }
```

---

## 2. Cấu hình Node & Link

### Thêm / Cập nhật Node (bpmAddNode)

```
POST /bpmapi/businessProcess/configNode/update
```

**Request body:**
```json
{
  "name": "Kiểm tra hồ sơ",
  "nodeType": "bpmn:UserTask",
  "templateId": "uuid-cua-process",
  "nodeKey": "UserTask_012xyz",
  "positionX": 320,
  "positionY": 150,
  "childProcessId": null,
  "config": {}
}
```

> `nodeKey` = ID node do BPMN.js tự sinh (ví dụ `Event_0s58xyf`). BE dùng đây làm khoá đối soát với XML.

**Response:** Object `BpmNode` vừa tạo/cập nhật.

### Xoá Node

```
DELETE /bpmapi/businessProcess/node/delete?id={nodeKey_hoac_uuid}
```

### Thêm / Cập nhật Link (SequenceFlow)

```
POST /bpmapi/businessProcess/updateConfig
```

**Request body (bpmAddLinkNode):**
```json
{
  "edgeKey": "SequenceFlow_456abc",
  "templateId": "uuid-cua-process",
  "fromNodeId": "uuid-cua-node-nguon",
  "toNodeId": "uuid-cua-node-dich",
  "label": "Rõ ràng",
  "condition": {
    "expression": "${diagnosisType == 'clear'}"
  }
}
```

### Xoá Link

```
DELETE /bpmapi/bpmConfigLinkNode/delete?id={edgeId}
```

### Lấy danh sách nodes / edges của một process

```
GET /bpmapi/bpmConfigNode/list?templateId={processId}&page=1&limit=50
GET /bpmapi/bpmConfigLinkNode/list?templateId={processId}
```

---

## 3. Cài đặt thuộc tính UserTask (BPM Designer)

Khi click vào node **UserTask** trên canvas → mở modal cài đặt → gọi:

### Lấy config hiện tại của node

```
GET /bpmapi/userTask/detail?nodeId={bpmn_node_id}
GET /bpmapi/userTask/get?id={bpmn_node_id}          // alias
```

**Response:** Object `BpmNode` với field `config` chứa các thuộc tính đã lưu.

### Lưu cài đặt node

```
POST /bpmapi/userTask/update
```

```json
{
  "nodeKey": "UserTask_012xyz",
  "templateId": "uuid-cua-process",
  "name": "Kiểm tra hồ sơ",
  "config": {
    "assignee": "uuid-nhan-vien",
    "candidateGroups": "uuid-phong-ban",
    "formKey": "form_kham_benh_01",
    "dueDate": "P2D"
  }
}
```

> Endpoint này **chỉ dùng cho BPM Designer** (lưu cấu hình node). Không dùng cho màn hình Ca bệnh.

---

## 4. Ca bệnh chờ xử lý (Work Order Runtime)

Màn hình: **Ca bệnh chờ xử lý**, **Ca bệnh đã hoàn thành**, **Phân công xử lý ca**

### 4.1 Danh sách & chi tiết

```
GET /bpmapi/userTask/list
Query: page=1&limit=20&status=pending&iamAssigneeId={uuid}&instanceId={uuid}
```

```
GET /bpmapi/userTask/get?id={workOrderId}
```

**Response `result` (chi tiết):**
```json
{
  "id": "uuid",
  "code": "WO-1717891234567",
  "title": "Khám tổng quát KH Nguyễn Văn A",
  "content": "Ghi chú...",
  "contentDelta": {},
  "status": "pending",
  "priority": 2,
  "percentDone": 0,
  "startTime": "2026-06-02T08:00:00Z",
  "dueDate": "2026-06-03T17:00:00Z",
  "workLoad": 1.0,
  "workLoadUnit": "DAY",
  "managerId": "uuid-quan-ly",
  "iamAssigneeId": "uuid-nhan-vien",
  "participants": ["uuid-1", "uuid-2"],
  "customers": ["uuid-kh-90"],
  "ratingMark": null,
  "ratingContent": null,
  "pausedAt": null,
  "completedAt": null,
  "instance": {
    "id": "uuid",
    "template": { "id": "uuid", "name": "Điều trị Viêm Da" }
  },
  "exchanges": [...],
  "rowVersion": 3
}
```

### 4.2 Cập nhật đầy đủ thông tin ca (`IWorkOrderRequestModel`)

```
POST /bpmapi/userTask/update
```

```json
{
  "id": "uuid-work-order",
  "name": "Khám tổng quát KH Nguyễn Văn A",
  "content": "Ghi chú nội dung...",
  "contentDelta": {},
  "startTime": "2026-06-02T10:00:00Z",
  "endTime": "2026-06-03T10:00:00Z",
  "workLoad": 1,
  "workLoadUnit": "DAY",
  "managerId": "uuid-quan-ly",
  "employeeId": "uuid-nhan-vien",
  "participants": ["uuid-1", "uuid-2"],
  "customers": ["uuid-90"],
  "status": "in_progress",
  "percent": 50,
  "priorityLevel": 2,
  "rowVersion": 3
}
```

> **Mapping field quan trọng:**
> - FE `name` → BE `title`
> - FE `employeeId` → BE `iamAssigneeId`
> - FE `endTime` → BE `dueDate`
> - FE `percent` → BE `percentDone`
> - FE `priorityLevel` → BE `priority`
> - FE `participants` có thể là `string "1,2,3"` hoặc `Array` — BE tự parse cả hai
> - `rowVersion` nên gửi lên để tránh conflict (optimistic locking)

### 4.3 Cập nhật trạng thái

```
POST /bpmapi/userTask/updateStatus
```

```json
{
  "id": "uuid-work-order",
  "status": "completed"
}
```

| Giá trị `status` | Ý nghĩa |
|---|---|
| `"pending"` | Mới tạo, chờ nhận |
| `"in_progress"` | Đang xử lý |
| `"paused"` | Tạm dừng |
| `"completed"` | Hoàn thành (BE tự set `completedAt`) |
| `"cancelled"` | Huỷ |

> **Quan trọng:** Khi `status = "completed"`, BE cần trigger BPM Engine đi tiếp (TODO phía BE). FE không cần làm gì thêm.

### 4.4 Đánh giá sao

```
POST /bpmapi/userTask/updateRating
```

```json
{
  "worId": "uuid-work-order",
  "mark": 5,
  "content": "Bác sĩ xử lý rất tận tâm"
}
```

### 4.5 Trao đổi / Bình luận trong ca

```
POST /bpmapi/userTask/addWorkExchange
```

```json
{
  "worId": "uuid-work-order",
  "content": "Hồ sơ cần bổ sung thêm X quang",
  "employeeId": "uuid-nguoi-comment"
}
```

> Nếu không truyền `employeeId`, BE tự lấy ID người dùng đang đăng nhập từ JWT.

### 4.6 Cập nhật người liên quan

```
POST /bpmapi/userTask/updateParticipant
```

```json
{
  "id": "uuid-work-order",
  "participants": "uuid-1,uuid-2,uuid-3"
}
```

### 4.7 Cập nhật khách hàng

```
POST /bpmapi/userTask/updateCustomer
```

```json
{
  "id": "uuid-work-order",
  "customers": "uuid-kh-100"
}
```

### 4.8 Cập nhật mức ưu tiên

```
POST /bpmapi/userTask/updatePriorityLevel
```

```json
{
  "id": "uuid-work-order",
  "priorityLevel": 3
}
```

| `priorityLevel` | Hiển thị |
|---|---|
| `1` | Thấp |
| `2` | Trung bình |
| `3` | Cao |
| `4` | Gấp |

### 4.9 Tạm dừng / Tiếp tục

```
POST /bpmapi/userTask/updatePause
```

```json
{
  "id": "uuid-work-order"
}
```

> Toggle: nếu đang `in_progress` → chuyển thành `paused`. Nếu đang `paused` → chuyển về `in_progress`. BE tự xử lý `pausedAt`.

---

## 5. Form & Variable Mapping

### Lấy danh sách BPM Form

```
GET /bpmapi/bpmForm/list?page=1&limit=20&keyword=...
GET /bpmapi/businessProcess/bpmForm/list          // alias (cùng kết quả)
```

### Clone Form Mapping

```
POST /bpmapi/formMapping/clone
POST /bpmapi/businessProcess/formMapping/clone    // alias
```

```json
{ "id": "uuid-form-mapping-goc" }
```

### Khai báo biến (Variable Declare)

```
POST /bpmapi/variableDeclare/update
POST /bpmapi/businessProcess/variableDeclare/update   // alias
```

```json
{
  "processId": "uuid-process",
  "variableName": "totalAmount",
  "variableType": "Integer",
  "defaultValue": "0"
}
```

---

## 6. Bảng mapping field: FE ↔ BE

| FE field (IWorkOrderRequestModel) | BE field (BpmWorkOrder) | Ghi chú |
|---|---|---|
| `id` | `id` | UUID work order |
| `name` | `title` | BE nhận cả `name` lẫn `title` |
| `content` | `content` | Plain text |
| `contentDelta` | `contentDelta` | JSON delta từ Quill/Slate |
| `startTime` | `startTime` | ISO 8601 |
| `endTime` | `dueDate` | BE nhận cả `endTime` lẫn `dueDate` |
| `workLoad` | `workLoad` | Số thực |
| `workLoadUnit` | `workLoadUnit` | `"DAY"` hoặc `"HOUR"` |
| `projectId` | _(chưa có)_ | Trường này chưa được map |
| `managerId` | `managerId` | UUID IAM |
| `employeeId` | `iamAssigneeId` | UUID IAM |
| `participants` | `participants` | Array UUID hoặc chuỗi `"id1,id2"` |
| `customers` | `customers` | Array UUID hoặc chuỗi `"id1,id2"` |
| `status` | `status` | Xem bảng trạng thái |
| `percent` | `percentDone` | 0–100 |
| `priorityLevel` | `priority` | 1–4 |
| `rowVersion` | `rowVersion` | Gửi lên để tránh conflict |

---

## 7. Bảng trạng thái (status)

| String value | Ý nghĩa | completedAt | pausedAt |
|---|---|---|---|
| `"pending"` | Mới, chờ nhận | — | — |
| `"in_progress"` | Đang xử lý | — | tự clear |
| `"paused"` | Tạm dừng | — | tự set |
| `"completed"` | Hoàn thành | tự set | — |
| `"cancelled"` | Đã huỷ | — | — |

> Nếu FE truyền số nguyên (legacy): `0` = pending, `1` = in_progress, `2` = completed. BE tự coerce sang string.

---

## Checklist tích hợp nhanh

- [ ] Kiểm tra header `Authorization: Bearer <token>` có mặt trong mọi request
- [ ] Sử dụng `id` (UUID) khi gọi các endpoint update/delete — không dùng `code`
- [ ] Truyền `rowVersion` trong payload update để tránh lỗi `409 Conflict`
- [ ] Màn hình **BPM Designer**: dùng nhóm `/businessProcess/*` và `/userTask/detail` + `/userTask/update` (Section 3)
- [ ] Màn hình **Ca bệnh chờ xử lý**: dùng nhóm `/userTask/*` (Section 4) — KHÔNG nhầm với endpoint designer
- [ ] `participants` và `customers` có thể gửi dạng Array JSON hoặc string CSV — khuyến nghị dùng Array
- [ ] `status = "completed"` sẽ trigger logic BPM Engine phía BE (không cần gọi thêm API)
