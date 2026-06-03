# Response Contract Gaps

**Date:** 2026-06-03  
**Source:** Frontend runtime field access audit vs backend Prisma model + service responses

---

## GAP-01: Notification List — `unread`, `timeReceived`, `type` [P0]

**Frontend expects:**
```json
{
  "result": {
    "items": [{
      "id": "uuid",
      "title": "string",
      "content": "string",
      "type": 1,
      "unread": 1,
      "timeReceived": "2026-01-01T00:00:00Z",
      "workId": null,
      "projectName": null
    }]
  }
}
```

**Backend returns:**
```json
{
  "result": {
    "items": [{
      "id": "uuid",
      "title": "string",
      "body": "string",
      "isRead": false,
      "createdAt": "2026-01-01T00:00:00Z"
    }]
  }
}
```

**Required fix:**
```typescript
items.map(n => ({
  ...n,
  unread: n.isRead ? 0 : 1,
  is_read: n.isRead,
  timeReceived: n.createdAt,
  type: n.refType ?? 'system',
  workId: (n.data as any)?.workId ?? null,
  projectName: (n.data as any)?.projectName ?? null,
}))
```

---

## GAP-02: Notification Count — returns object, FE expects number [P0]

**Frontend expects:** `response.result = 5` (plain number)  
**Backend returns:** `response.result = { count: 5 }`  
**Fix:** `return count;` instead of `return { count };`

---

## GAP-03: BPM Process Detail — `configs` vs `edges` [P0]

**Frontend expects:** `result.configs: [{ id, fromNodeId, toNodeId, condition }]`  
**Backend returns:** `result.edges: [{ id, fromKey, toKey, ... }]`  
**Fix:** In `BpmTemplateService.getById()`:
```typescript
return { ...template, nodes: template.nodes, configs: template.edges };
```

---

## GAP-04: BPM Route Case — `businessProcess/list` [P0]

**Frontend calls:** `GET /bpmapi/businessProcess/list` (capital P)  
**Backend has:** `@Get('businessprocess/list')` (lowercase)  
**Fix:** Add `@Get('businessProcess/list')` camelCase alias

---

## GAP-05: WorkOrder — `startTime`, `endTime`, `createdTime` [P1]

**Frontend expects:**
```json
{ "startTime": "...", "endTime": "...", "createdTime": "..." }
```
**Backend returns:**
```json
{ "startDate": "...", "dueDate": "...", "createdAt": "..." }
```
**Fix in WorkOrder mapper:**
```typescript
startTime: w.startDate,
endTime: w.dueDate,
createdTime: w.createdAt,
name: w.title,
```

---

## GAP-06: CustomerExchange — `createdTime`, `employeeId`, `employeeUserId` [P1]

**Frontend expects:**
```json
{
  "createdTime": "...",
  "employeeId": 1,
  "employeeName": "...",
  "employeeAvatar": "...",
  "employeeUserId": 1
}
```
**Backend returns:** `{ "createdAt": "...", "iamAuthorId": "uuid" }`  
**Fix:**
```typescript
items.map(ex => ({
  ...ex,
  createdTime: ex.createdAt,
  employeeId: ex.iamAuthorId,
  employeeUserId: ex.iamAuthorId,
  employeeName: null,
  employeeAvatar: null,
}))
```

---

## GAP-07: Customer List — `phoneMasked`, `custType`, relationship fields [P1]

**Frontend expects:**
```json
{
  "phoneMasked": "0901***567",
  "custType": 0,
  "relationshipId": 1,
  "relationshipName": "Khách hàng mới",
  "branchId": 1,
  "branchName": "Chi nhánh HN"
}
```
**Backend returns:** None of these fields  
**Fix:** Add mapping in customer service list()

---

## GAP-08: Relationship List — `color`, `colorText` [P1]

**Frontend expects:** `{ color: "#007FFF", colorText: "#FFFFFF" }`  
**Backend returns:** ContactPipeline without color fields  
**Fix:** Add color/colorText from first status OR hardcode defaults by position

---

## GAP-09: Customer Detail — `mapCustomerAttribute`, `avatar` [P1]

**Frontend expects:**
```json
{
  "mapCustomerAttribute": { "group1": [{ "id": "uuid", "name": "Attr Name" }] },
  "lstCustomerExtraInfo": [],
  "avatar": "...",
  "phoneMasked": "...",
  "gender": 0
}
```
**Backend returns:** `avatarUrl`, no `mapCustomerAttribute`, no `phoneMasked`, `gender` as string  
**Fix:** Build `mapCustomerAttribute` from CustomerAttribute + CustomerExtraInfo

---

## GAP-10: WorkOrder Exchange — `createdTime` [P1]

**Frontend expects:** `item.createdTime`  
**Backend returns:** `createdAt`  
**Fix:** Add `createdTime: ex.createdAt` alias in exchange mapper

---

## GAP-11: BPM Node Comparison — UUID coercion [P0 — FE bug, needs backend workaround]

**Issue:** `+el.id === item.fromNodeId` — UUID string → NaN  
**FE file:** `SettingBusinessProcess.tsx:169`  
**Backend workaround:** Ensure `fromNodeId`/`toNodeId` in `configs` are same type as node `id`
