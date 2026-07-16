# Tài liệu tổng hợp API cho hệ thống DermaHealth (BE Specification)

> **Mục đích**: Tài liệu này quét toàn bộ frontend hiện có (React 19 + TypeScript, prototype chạy hoàn toàn bằng dữ liệu mẫu lưu trong `localStorage`, không có backend thật) để liệt kê **đầy đủ** các API mà đội Backend cần thiết kế & xây dựng nhằm thay thế lớp dữ liệu giả lập.
>
> **Nguồn phân tích**: `src/domain/core/entities.ts`, `enums.ts`, `ids.ts`, `src/domain/repositories.ts`, toàn bộ `src/domain/services/*.ts` (13 service = business logic hiện tại), `src/domain/guards.ts` (RBAC), `src/App.tsx` (routes + phân quyền theo role), `src/state/AppStateContext.tsx` (auth giả lập), và toàn bộ 26 trang trong `src/pages/**`.
>
> **Quy ước đọc tài liệu**: Mỗi entity/field trong phần "Mô hình dữ liệu" bám sát 1:1 theo TypeScript interface hiện có trong FE — đây chính là "hợp đồng" tối thiểu mà API response cần thỏa mãn để FE không phải sửa lại logic hiển thị. Các mục đánh dấu **[MỚI — CHƯA CÓ TRONG FE]** là suy luận cần thiết (ví dụ Auth) vì FE hiện đang giả lập hoàn toàn ở phía client.

---

## Mục lục

1. [Bối cảnh & phạm vi](#1-bối-cảnh--phạm-vi)
2. [Quy ước chung cho toàn bộ API](#2-quy-ước-chung-cho-toàn-bộ-api)
3. [Vai trò & phân quyền (RBAC)](#3-vai-trò--phân-quyền-rbac)
4. [Mô hình dữ liệu tổng quan (Entity Catalog)](#4-mô-hình-dữ-liệu-tổng-quan-entity-catalog)
5. [Máy trạng thái (State Machines) bắt buộc phải enforce ở BE](#5-máy-trạng-thái-state-machines-bắt-buộc-phải-enforce-ở-be)
6. [Nhóm API theo module nghiệp vụ](#6-nhóm-api-theo-module-nghiệp-vụ)
   - 6.1 Authentication & User
   - 6.2 Patient Profile & Consent
   - 6.3 Appointment & QR Check-in
   - 6.4 Queue (Hàng đợi khám) & Reception
   - 6.5 Medical Encounter (Lượt khám)
   - 6.6 Symptom Intake & AI Preliminary Assessment
   - 6.7 Doctor Decision (Review / Diagnosis / Clinical Plan)
   - 6.8 Clinical Order & Result (Cận lâm sàng)
   - 6.9 Workflow / BPM (Template & Runtime)
   - 6.10 Medical Record (EMR) — Document, Prescription, Ký hồ sơ
   - 6.11 CRM — Care Plan, Follow-up, Escalation Alert
   - 6.12 Notification
   - 6.13 Audit Log
   - 6.14 Integration Monitoring (Admin)
   - 6.15 Dashboard & Reporting (Aggregation APIs)
7. [Các tính năng FE có UI nhưng CHƯA có backing service — cần thiết kế API mới hoàn toàn](#7-các-tính-năng-fe-có-ui-nhưng-chưa-có-backing-service--cần-thiết-kế-api-mới-hoàn-toàn)
8. [Yêu cầu phi chức năng (Non-functional)](#8-yêu-cầu-phi-chức-năng-non-functional)
9. [Khuyến nghị ưu tiên triển khai theo giai đoạn](#9-khuyến-nghị-ưu-tiên-triển-khai-theo-giai-đoạn)

---

## 1. Bối cảnh & phạm vi

Hệ thống mô phỏng một **chuỗi phòng khám da liễu** với luồng nghiệp vụ đầy đủ: bệnh nhân đặt lịch → check-in QR → xếp hàng chờ khám → khai báo triệu chứng → AI đánh giá sơ bộ → bác sĩ xem xét & chẩn đoán → duyệt phác đồ điều trị → kích hoạt quy trình vận hành (BPM) với các tác vụ liên khoa (xét nghiệm, CĐHA, dược, thủ thuật...) → ký hồ sơ bệnh án → chăm sóc/theo dõi sau khám (CRM) → tái khám.

Toàn bộ luồng trên **hiện chạy 100% ở client**, dữ liệu lưu `localStorage`, không có server, không có xác thực thật. Vì vậy tài liệu này không chỉ liệt kê CRUD mà còn mô tả lại **các quy tắc nghiệp vụ (business rules) đang được enforce trong code FE** (ví dụ: "không thể đóng lượt khám khi hồ sơ chưa ký", "AI không được phép tạo chẩn đoán cuối") — BE **bắt buộc phải enforce lại các quy tắc này ở server**, vì mọi validate ở FE có thể bị bỏ qua bởi client giả mạo.

## 2. Quy ước chung cho toàn bộ API

### 2.1 Base URL & versioning
```
https://api.dermahealth.vn/v1/...
```
Đề xuất versioning qua path (`/v1/`), không dùng header versioning để dễ debug qua Postman/log.

### 2.2 Envelope phản hồi chuẩn

**Thành công:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req_8f2a1c", "timestamp": "2026-07-16T08:00:00Z" }
}
```

**Danh sách có phân trang:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "pageSize": 20, "total": 134, "totalPages": 7 }
}
```

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Không thể chuyển trạng thái từ \"under_doctor_review\" sang \"closed\".",
    "details": { "from": "under_doctor_review", "to": "closed" }
  },
  "meta": { "requestId": "req_8f2a1c" }
}
```

### 2.3 Mã lỗi chuẩn hoá từ business exception hiện có trong FE

FE hiện có 2 exception class dùng xuyên suốt toàn bộ service layer (`src/domain/guards.ts`) — BE cần map 1:1 sang HTTP status + error code để FE giữ nguyên UX xử lý lỗi hiện tại:

| FE Exception | HTTP Status | error.code | Ý nghĩa |
|---|---|---|---|
| `PermissionError` | 403 Forbidden | `PERMISSION_DENIED` | Role của actor không nằm trong danh sách được phép thực hiện hành động (xem `assertRole`) |
| `InvalidTransitionError` | 409 Conflict | `INVALID_TRANSITION` | Vi phạm máy trạng thái (encounter/task/activity) hoặc vi phạm ràng buộc nghiệp vụ (VD: hồ sơ đã ký không thể sửa) |
| Not found (`Không tìm thấy...`) | 404 Not Found | `NOT_FOUND` | |
| Validate input rỗng/sai định dạng | 422 Unprocessable Entity | `VALIDATION_ERROR` | Trả kèm `details.fields[]` |
| Xung đột do 2 actor cùng sửa | 409 Conflict | `CONCURRENT_MODIFICATION` | Khuyến nghị dùng optimistic locking (`version`/`updatedAt` If-Match) |

### 2.4 Xác thực (header)
```
Authorization: Bearer <access_token JWT>
```
JWT payload tối thiểu cần: `sub` (userId), `role`, `department` (nếu có), `exp`. Toàn bộ endpoint trong tài liệu này (trừ mục 6.1 và các route public kiosk/board) yêu cầu header này.

### 2.5 Phân trang, lọc, sắp xếp — quy ước query param

| Param | Kiểu | Ghi chú |
|---|---|---|
| `page`, `pageSize` | number | mặc định `page=1`, `pageSize=20`, tối đa `100` |
| `sort` | string | ví dụ `sort=-createdAt` (dấu `-` = giảm dần) |
| `q` | string | full-text search (áp dụng cho các API có ô tìm kiếm) |
| `dateFrom`, `dateTo` | ISO 8601 | lọc khoảng thời gian |
| Các field lọc riêng | — | liệt kê cụ thể trong từng bảng bên dưới, lấy trực tiếp từ filter UI thực tế của FE (không suy đoán thêm) |

### 2.6 Idempotency
Các API có khả năng bị gọi lặp do người dùng thao tác lại trên thiết bị (đặc biệt **QR check-in** — bệnh nhân quét lại QR nhiều lần) phải hỗ trợ idempotent theo `tokenHash`/`Idempotency-Key` header, trả về **cùng kết quả** thay vì tạo bản ghi trùng (xem mục 6.3).

---

## 3. Vai trò & phân quyền (RBAC)

Lấy nguyên trạng từ `src/domain/core/enums.ts` (`UserRole`) — đây là danh sách role **đóng** (closed set), BE nên định nghĩa enum tương ứng trong DB/JWT:

| Role code | Nhãn hiển thị | Ghi chú |
|---|---|---|
| `super_administrator` | Quản trị viên cấp cao | **Override toàn bộ role-gate** — pass mọi kiểm tra quyền (xem `hasRoleAccess`). BE cần 1 quyền "break-glass" tương đương, phải audit log riêng mọi hành động của role này. |
| `patient` | Bệnh nhân | |
| `doctor` | Bác sĩ | Role **duy nhất** được: ký hồ sơ, chốt chẩn đoán, duyệt phác đồ, review AI |
| `nurse` | Điều dưỡng | |
| `receptionist` | Lễ tân | Quản lý check-in, hàng đợi |
| `lab_technician` | KTV xét nghiệm | |
| `imaging_technician` | KTV chẩn đoán hình ảnh | |
| `pharmacist` | Dược sĩ | |
| `care_coordinator` | Điều phối viên chăm sóc | CRM, tạo alert, không được sửa chẩn đoán/đơn thuốc |
| `customer_care_employee` | Nhân viên CSKH | |
| `medical_administrator` | Quản trị viên y tế | Duyệt yêu cầu tạo lượt khám từ CRM, publish workflow template, mở lại hồ sơ đã ký |
| `system_administrator` | Quản trị viên hệ thống | Xem audit log, integrations |
| `clinical_process_designer` | Chuyên viên thiết kế quy trình | Soạn thảo workflow template (chỉ role này + `medical_administrator`) |

**Nguyên tắc phân quyền theo route** (đối chiếu `src/App.tsx`), BE phải enforce **lại toàn bộ** ở tầng API (không chỉ FE):

| Route/Module | Roles được phép |
|---|---|
| Appointments (đặt lịch, xem lịch) | `patient`, `receptionist` |
| AI Analysis (khai triệu chứng) | `patient` |
| Doctor Review | `doctor` |
| Profile / Prescriptions / Progress / Reports | `patient` |
| Care (CRM) | `patient`, `care_coordinator`, `customer_care_employee`, `medical_administrator` |
| Workflow Template Design | `clinical_process_designer`, `medical_administrator` |
| Workflow Instance / Work Queue | `doctor`, `nurse`, `receptionist`, `lab_technician`, `imaging_technician`, `pharmacist`, `care_coordinator`, `medical_administrator` |
| Audit Viewer | `medical_administrator`, `system_administrator` |
| Integrations | `medical_administrator`, `system_administrator` |
| Reception / QR check-in / Queue control | `receptionist`, `medical_administrator` (+ `nurse`, `doctor` cho điều phối hàng đợi) |

**Business-rule-level RBAC** (không thấy ở route, chỉ nằm sâu trong service — dễ bị BE bỏ sót nếu chỉ đọc router):

- Chỉ `doctor` mới được: `reviewAssessment`, `recordDiagnosis`, `reviseDiagnosis`, `approveClinicalPlan`, `signRecord`, `addAddendum`, `issuePrescription`.
- Chỉ `medical_administrator` mới được: `reopenRecord` (mở lại hồ sơ đã ký), `publishVersion`/`archiveVersion` workflow.
- `activateWorkflow` yêu cầu `doctor` hoặc `medical_administrator`.
- `decideEncounterCreationRequest` (duyệt/từ chối yêu cầu tạo lượt khám từ CRM) yêu cầu `medical_administrator` hoặc `doctor`.
- `closeAlert` (đóng cảnh báo lâm sàng CRM) yêu cầu `doctor`, `medical_administrator`, hoặc `care_coordinator` — **CRM không được tự đóng cảnh báo lâm sàng nếu không có xác nhận có thẩm quyền** (nguyên văn business rule trong code).
- `clinicalOrderService.createOrder` chỉ `doctor`.

---

## 4. Mô hình dữ liệu tổng quan (Entity Catalog)

> Toàn bộ field bên dưới lấy nguyên văn từ `entities.ts`. BE thiết kế bảng/collection tương ứng — tên field response JSON nên giữ nguyên `camelCase` như liệt kê để FE không phải viết lớp mapping.

### 4.1 Nhóm Người dùng & Bệnh nhân
- **User**: `id, name, role, department?, specialty?, online?`
- **Patient**: `id, code, name, profile{dob, gender, phone, email, address, bloodType}, primaryDoctorId`
- **Consent**: `id, patientId, type, granted, grantedAt?, withdrawnAt?`

### 4.2 Nhóm Lịch hẹn & Check-in
- **Appointment**: `id, patientId, doctorId, date, time, mode(video|in_person), status(upcoming|done|cancelled|missed), encounterId?, clinicLocationId?, clinicName?, department?, consultationType?`
- **AppointmentCheckInToken**: `id, appointmentId, patientId, plannedEncounterId, clinicLocationId, token, tokenHash, issuedAt, validFrom, expiresAt, status(active|used|expired|revoked|replaced), usedAt?, usedByDeviceId?, revokedAt?, revokedReason?, version`
- **QueueTicket**: `id, appointmentId, patientId, encounterId, number, department, serviceStation, room?, waitingArea, priority(normal|priority|urgent), status(waiting|called|acknowledged|in_service|skipped|completed|routed), issuedAt, calledAt?, acknowledgedAt?, serviceStartedAt?, completedAt?, peopleAhead, estimatedWaitMinutes, preparationInstructions[], nextStation?`

### 4.3 Nhóm Lượt khám (Encounter)
- **MedicalEncounter**: `id, patientId, parentEncounterId?, appointmentId?, type(standard|emergency|follow_up|remote), origin(appointment|walk_in|follow_up_request), status(EncounterStatus — 20 giá trị, xem mục 5.1), department, room?, queueNumber?, peopleAheadInQueue?, estimatedWaitMinutes?, createdAt, updatedAt, currentDoctorId?, symptomIntakeId?, aiAssessmentIds[], doctorReviewIds[], diagnosisIds[], clinicalPlanId?, clinicalOrderIds[], workflowInstanceId?, medicalRecordId?, blockingCondition?, events[EncounterEvent]`
- **EncounterEvent** (audit trail nội bộ, append-only): `id, at, label, kind(info|warning|success|danger)`

### 4.4 Nhóm AI & Chẩn đoán
- **SymptomIntake**: `id, encounterId, chiefComplaint, severity(số), durationDays, symptoms[], history[], currentMedication[], images[], submittedAt`
- **AIPreliminaryAssessment**: `id, encounterId, status(completed|insufficient_data|failed), candidateConditions[CandidateCondition], redFlag{triggered, urgency, reasons[]}, suggestedSpecialty?, suggestedNextActions[], modelVersion, inputSnapshotId, generatedAt, missingDataHints[], supersededBy?`
  - **CandidateCondition**: `code, name, confidenceBand(low|moderate|high), confidenceScore, supportingEvidence[], conflictingEvidence[], rationale`
- **DoctorReview**: `id, encounterId, aiAssessmentId?, doctorId, action(pending|accepted|partial|rejected), acceptedConditionCode?, rationale?, reviewedAt`
- **DoctorDiagnosis**: `id, encounterId, doctorId, status(none|provisional|differential|confirmed|revised|signed), conditionName, conditionCode?, aiAssessmentId?, isAdditionalToAI, rationale?, revisionOf?, recordedAt`
- **ClinicalPlan**: `id, encounterId, doctorId, diagnosisId, summary, approvedAt`

### 4.5 Nhóm Cận lâm sàng
- **ClinicalOrder**: `id, encounterId, type(laboratory|imaging|consultation), orderedByDoctorId, justification, status(requested|in_progress|invalid_sample|result_ready|completed|cancelled), assignedRole, createdAt, resultId?`
- **ClinicalResult**: `id, orderId, summary, abnormal, recordedAt, recordedBy`

### 4.6 Nhóm Workflow/BPM
- **WorkflowTemplate**: `id, name, specialty, description, createdBy, versionIds[], latestPublishedVersionId?`
- **WorkflowTemplateVersion**: `id, templateId, version(số), status(draft|in_review|published|deprecated|archived), steps[WorkflowStepDefinition], nodePositions?{code:{x,y}}, createdAt, publishedAt?`
- **WorkflowStepDefinition**: `code, icon?, executorType?(16 giá trị — patient/receptionist/nurse/doctor/lab_technician/imaging_technician/pharmacist/procedure_team/cashier/care_coordinator/customer_care/clinic_manager/ai_automation/system_automation/decision/waiting), name, description, taskType, responsibleRole, department, skill?, location?, mandatory(bool), conditionalRule?, estimatedDurationMinutes, maxWaitingMinutes, skipPermission[UserRole], reworkRule?, escalationRule?, notificationRule?, requiredOutput?, prerequisiteStepCodes[]`
- **WorkflowInstance**: `id, patientId, encounterId, templateId, templateVersionId, instanceCode, integrityHash, identityVersion, status(created|active|suspended|completed|cancelled), activatedBy, activatedAt, completedAt?, suspendedReason?, taskIds[]`
  - Ghi chú kỹ thuật quan trọng: `integrityHash`/`identityVersion` là **seal toàn vẹn** ràng buộc patientId + encounterId + templateVersionId đã pin tại thời điểm activate — BE phải tính lại hash này theo đúng thuật toán và cho phép FE gọi `GET .../identity-verify` để hiển thị cảnh báo nếu dữ liệu bị chỉnh sửa trái phép (xem `workflowIdentity.ts`).
- **WorkflowTask**: `id, instanceId, encounterId, stepCode, name, responsibleRole, department, status(WorkflowTaskStatus — 16 giá trị, xem mục 5.2), assigneeId?, dependsOnStepCodes[], slaMinutes, priority(low|medium|high), urgency(routine|urgent|emergency), createdAt, startedAt?, completedAt?, clinicalWarning?, patientArrivalStatus?(not_arrived|arrived|in_room), reworkCount`

### 4.7 Nhóm Hồ sơ bệnh án (EMR)
- **MedicalRecord**: `id, encounterId, status(draft|in_review|awaiting_completion|awaiting_signature|signed|addendum_required|amended|reopened), diagnosisId?, prescriptionId?, documentIds[], discharge?{instructions[], followUpNeeded}, followUp?{description, dueInDays}, signedBy?, signedAt?, addenda[MedicalRecordAddendum], reopenedReason?`
- **MedicalRecordAddendum**: `id, text, addedBy, addedAt`
- **ClinicalDocument**: `id, encounterId, workflowTaskId?, clinicalOrderId?, type, fileName, fileHash, version, uploadedBy, uploadedAt, reviewStatus(pending|reviewed), signatureStatus(unsigned|signed), incorrectLinkFlag?`
- **Prescription**: `id, encounterId, doctorId, medications[Medication], issuedAt`
- **Medication**: `id, name, dose, durationDays`

### 4.8 Nhóm CRM / Chăm sóc sau khám
- **CRMCarePlan**: `id, patientId, encounterId, status(not_started|active|completed|suspended), createdAt`
- **FollowUpActivity**: `id, carePlanId, type, title, description, dueDate, priority, status(scheduled|due|completed|escalated|cancelled), automationMode?(automatic|patient_action|human_review), automationAction?, lastAutomatedAt?, automationRunCount?`
- **ClinicalAlert**: `id, carePlanId, patientId, encounterId?, trigger, severity(low|medium|high|critical), responsibleActor, responseDeadlineHours, requiresLinkedEncounter, status(open|acknowledged|encounter_requested|resolved), note, detectedAt, closedBy?, closedAt?`
- **EncounterCreationRequest**: `id, patientId, sourceAlertId?, requestedByRole, reason, status(requested|approved|rejected|encounter_created), requestedAt, decidedBy?, decidedAt?, createdEncounterId?`

### 4.9 Nhóm hệ thống
- **Notification**: `id, event, recipientId, recipientRole, channel(in_app|sms|email|push), status(queued|sent|delivered|failed|retrying), message, relatedPatientId?, relatedEncounterId?, relatedWorkflowTaskId?, createdAt, deliveredAt?, failureReason?, retryCount, read`
- **AuditEvent**: `id, at, actorId, actorName, role, action, entityType, entityId, patientId?, encounterId?, previousState?, newState?, reason?, sourceModule, severity(info|warning|critical)`
- **IntegrationConnection**: `id, name, status(healthy|degraded|down), lastSuccessAt?, lastFailureAt?, pendingMessages, retryCount, deadLetterCount`
- **IntegrationMessage**: `id, connectionId, correlationId, idempotencyKey, status(pending|delivered|failed|duplicate_rejected), createdAt`

---

## 5. Máy trạng thái (State Machines) bắt buộc phải enforce ở BE

Đây là phần **quan trọng nhất** để BE không làm sai nghiệp vụ — toàn bộ transition table lấy nguyên văn từ code, KHÔNG được tự ý mở rộng.

### 5.1 `MedicalEncounter.status` (`ENCOUNTER_TRANSITIONS` — `encounterService.ts`)

| Từ trạng thái | Được chuyển sang |
|---|---|
| `registered` | `intake_in_progress` |
| `intake_in_progress` | `intake_complete` |
| `intake_complete` | `ai_assessed`, `under_doctor_review` |
| `ai_assessed` | `routed`, `escalated`, `under_doctor_review` |
| `routed` | `checked_in`, `escalated` |
| `checked_in` | `under_doctor_review` |
| `under_doctor_review` | `awaiting_results`, `diagnosed`, `escalated` |
| `awaiting_results` | `under_doctor_review`, `diagnosed` |
| `diagnosed` | `plan_approved` |
| `plan_approved` | `workflow_active` |
| `workflow_active` | `in_progress` |
| `in_progress` | `results_complete`, `final_review` |
| `results_complete` | `final_review` |
| `final_review` | `discharge_ready`, `awaiting_results` |
| `discharge_ready` | `record_signed` |
| `record_signed` | `closed` |
| `closed` | `post_visit_monitoring` |
| `post_visit_monitoring` | `escalated`, `closed` |
| `escalated` | `routed`, `post_visit_monitoring`, `follow_up_linked`, `under_doctor_review` |
| `follow_up_linked` | *(terminal)* |

Ràng buộc bổ sung không nằm trong bảng transition nhưng bắt buộc phải check trước khi cho transition sang `closed`:
- **Không được đóng lượt khám nếu chưa ở `record_signed` VÀ `MedicalRecord.status !== 'signed'`.**

### 5.2 `WorkflowTask.status` (`ALLOWED_TASK_TRANSITIONS` — `workflowService.ts`)

| Từ | Được chuyển sang |
|---|---|
| `pending` | `blocked`, `ready` |
| `blocked` | `ready` |
| `ready` | `assigned`, `escalated` |
| `assigned` | `accepted`, `escalated` |
| `accepted` | `in_progress`, `escalated` |
| `in_progress` | `waiting_for_patient`, `waiting_for_result`, `waiting_for_approval`, `completed`, `failed`, `escalated` |
| `waiting_for_patient` | `in_progress`, `expired`, `escalated` |
| `waiting_for_result` | `in_progress`, `failed`, `escalated` |
| `waiting_for_approval` | `completed`, `rejected`, `escalated` |
| `completed` | *(terminal)* |
| `failed` | `redo_required` |
| `rejected` | `redo_required` |
| `redo_required` | `ready`, `assigned` |
| `skipped` | *(terminal)* |
| `cancelled` | *(terminal)* |
| `expired` | `ready`, `escalated` |
| `escalated` | `ready`, `assigned`, `cancelled` |

Ràng buộc bổ sung:
- Task có `mandatory: true` trong step definition **không được `skip`**.
- Khi 1 task chuyển sang `completed`/`skipped`, BE phải tự động re-evaluate các task `pending`/`blocked` phụ thuộc (`dependsOnStepCodes`) để mở khoá (`ready`) — logic `refreshDependentTasks`.
- `WorkflowInstance` chỉ được `completed` khi **toàn bộ task bắt buộc** (`mandatory=true`) đã `completed` hoặc `skipped` hợp lệ.

### 5.3 `FollowUpActivity.status` (`ALLOWED_ACTIVITY_TRANSITIONS` — `crmService.ts`)

| Từ | Được chuyển sang |
|---|---|
| `scheduled` | `due`, `cancelled`, `escalated` |
| `due` | `completed`, `cancelled`, `escalated` |
| `completed` / `escalated` / `cancelled` | *(terminal)* |

### 5.4 `ClinicalOrderStatus`: `requested → in_progress → (invalid_sample | result_ready | completed) → cancelled` (không có transition table tường minh trong code — FE chỉ set trực tiếp qua `markInvalidSample`/`completeOrder`; BE nên tự định nghĩa transition chặt hơn khi chuẩn hoá).

### 5.5 `MedicalRecord.status` — quy tắc bất biến (immutability)

- Trạng thái `signed` hoặc `amended` = **khoá nội dung lâm sàng**. Mọi hành động sửa (`attachDiagnosis`, `setDischargeAndFollowUp`, `issuePrescription`) phải bị chặn bằng lỗi `INVALID_TRANSITION` nếu record đã ở 1 trong 2 trạng thái này.
- Cách duy nhất để "sửa" hồ sơ đã ký: **`addAddendum`** (chỉ `doctor`, append-only, chuyển status → `amended`) hoặc **`reopenRecord`** (chỉ `medical_administrator`, có `reason` bắt buộc, log severity `warning`).
- **`signRecord`** chỉ thành công nếu `checkCompletionRequirements` pass — tối thiểu phải có `diagnosisId` trỏ tới 1 `DoctorDiagnosis` có status `confirmed` hoặc `revised`. BE nên coi đây là 1 validation server-side bắt buộc, không tin dữ liệu điều kiện gửi từ FE.
- Kết quả cận lâm sàng đến **sau khi** hồ sơ đã ký: không được tự ý sửa hồ sơ — chỉ được set flag (`flagLateResult` → `addendum_required`) để bác sĩ tự quyết định addendum/reopen.

---

## 6. Nhóm API theo module nghiệp vụ

> Ký hiệu: 🔒 = yêu cầu role cụ thể (ghi chú ngay dưới bảng), ⏱ = có ảnh hưởng đến state machine ở mục 5.

### 6.1 Authentication & User **[MỚI — CHƯA CÓ TRONG FE]**

FE hiện tại (`Login.tsx`) **không gọi API nào** — nút "Đăng nhập" chỉ `navigate('/app/dashboard')`, người dùng thật được chọn qua session giả lập (`localStorage` lưu `currentUserId`, mặc định `U-0001`). Google/Apple login chỉ là nút trang trí. **BE cần thiết kế toàn bộ module Auth từ đầu**, khớp với danh sách 13 role ở mục 3.

| Method | Endpoint | Mô tả | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | Đăng nhập bằng email/mật khẩu | `{email, password}` | `{accessToken, refreshToken, expiresIn, user: User}` |
| POST | `/auth/refresh` | Cấp lại access token | `{refreshToken}` | `{accessToken, expiresIn}` |
| POST | `/auth/logout` | Thu hồi refresh token hiện tại | — | `204` |
| POST | `/auth/forgot-password` | Gửi email reset | `{email}` | `202` |
| POST | `/auth/reset-password` | Đặt lại mật khẩu bằng token | `{token, newPassword}` | `204` |
| GET | `/auth/me` | Lấy thông tin user đang đăng nhập + role | — | `User` |
| GET | `/users` | Danh sách user, dùng cho các picker (bác sĩ phụ trách, gán task...) | Query: `role`, `department`, `q` | `User[]` phân trang |
| GET | `/users/:id` | Chi tiết 1 user | — | `User` |
| PATCH | `/users/:id` | Cập nhật hồ sơ cá nhân (Profile.tsx có nút "Chỉnh sửa hồ sơ" nhưng chưa nối handler) | `{name?, department?, specialty?}` | `User` |
| GET | `/doctors` | **[MỚI]** Danh mục bác sĩ kèm chuyên khoa/đánh giá — hiện `Appointments.tsx` đang dùng mảng hardcode (rating, reviews, avail) | Query: `specialty`, `date` | `Doctor[]{id,name,specialty,rating,reviewCount,avatarUrl}` |
| GET | `/doctors/:id/availability` | **[MỚI]** Khung giờ trống theo ngày — `Appointments.tsx` hiện hardcode `TIMES_AM/TIMES_PM` | Query: `date` | `{slots: [{time, available}]}` |

> 🔒 Ghi chú bảo mật quan trọng: `super_administrator` là quyền **break-glass** override mọi role-gate (`hasRoleAccess`) — BE phải audit-log **mọi** hành động của role này với `severity: critical` mặc định, không được optional.

### 6.2 Patient Profile & Consent

| Method | Endpoint | Mô tả | Request/Response |
|---|---|---|---|
| GET | `/patients/me` | Lấy hồ sơ bệnh nhân hiện tại (theo token) | → `Patient` |
| GET | `/patients/:id` 🔒 staff | Chi tiết bệnh nhân | → `Patient` |
| PATCH | `/patients/:id` | Cập nhật hồ sơ (`profile{dob,gender,phone,email,address,bloodType}`) | |
| GET | `/patients/:id/consents` | Danh sách đồng ý (VD: chia sẻ dữ liệu, nhận thông báo) | → `Consent[]` |
| PUT | `/patients/:id/consents/:type` | Bật/tắt 1 loại consent | `{granted: boolean}` → `Consent` |

### 6.3 Appointment & QR Check-in

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/appointments` | Query: `patientId`, `status`, `doctorId`, `dateFrom/dateTo` | patient (chỉ của mình), receptionist |
| GET | `/appointments/:id` | Chi tiết | |
| POST | `/appointments` | Đặt lịch — **side-effect quan trọng**: tạo kèm 1 `MedicalEncounter` (status `registered`) + phát hành QR token ngay lập tức, gửi notification `appointment_qr_issued` | patient, receptionist |
| PATCH | `/appointments/:id/status` | `{status: 'missed'\|'cancelled'}` | receptionist |
| POST | `/appointments/:id/check-in-token` | Phát hành/luân phiên QR mới — **thu hồi tự động** mọi token `active` cũ của cùng appointment (status → `replaced`) trước khi tạo token mới, tăng `version` | patient, receptionist |
| POST | `/appointments/:id/check-in-token/revoke` | `{reason}` — thu hồi toàn bộ token active | receptionist |
| POST | `/check-in` | **Endpoint quét QR** (dùng ở Kiosk lẫn quầy lễ tân) — xem chi tiết idempotency bên dưới | receptionist, kiosk device |

**Chi tiết nghiệp vụ `POST /check-in`** (đúng theo `checkInService.checkIn`):

Request: `{token, clinicLocationId, deviceId, patientId?, allowOutsideWindow?}`

Luồng xử lý bắt buộc ở BE:
1. Tra `tokenHash` — nếu không khớp → `422 { code: "QR_INVALID" }`.
2. **Idempotency**: nếu đã tồn tại `QueueTicket` active cho appointment này VÀ token đã ở status `used` → trả về **ticket hiện có** với `repeated: true`, KHÔNG tạo ticket mới, KHÔNG lỗi (đây là case bệnh nhân quét lại QR).
3. Validate: token phải `active`, appointment phải `upcoming`, `clinicLocationId` khớp, nếu có truyền `patientId` phải khớp chủ token, thời điểm hiện tại phải nằm trong `[validFrom, expiresAt]` (trừ khi `allowOutsideWindow=true`, chỉ dành cho lễ tân override thủ công) → sai bất kỳ điều kiện nào → `422 QR_INVALID`.
4. Tạo `QueueTicket` mới: số thứ tự tự tăng theo prefix khoa (`D001`, `D002`...), tính `peopleAhead`/`estimatedWaitMinutes` dựa trên số ticket đang `waiting`/`called` cùng `department`.
5. Đánh dấu token `used`, gắn `usedByDeviceId`.
6. Cập nhật `MedicalEncounter` liên quan: gắn `queueNumber`, `room`, thêm `EncounterEvent` "Đã check-in bằng mã QR".
7. Ghi audit `QR_CHECK_IN_SUCCEEDED` (hoặc `QR_VALIDATION_FAILED` nếu lỗi, `QR_RESCAN_IDEMPOTENT` nếu lặp).

Response: `{ok: true, ticket: QueueTicket, repeated: boolean}` hoặc `{ok: false, message}`.

> ⚠️ **Lưu ý cho BE**: `KioskCheckIn.tsx` hiện đang hardcode `clinicLocationId='CS-HCM-01'` và tự sinh `deviceId`/`actorId` ở client — đây là giá trị **placeholder**, BE không nên tin tưởng các giá trị này mà cần cấu hình thiết bị kiosk qua device-registration riêng (xem mục 7).

### 6.4 Queue (Hàng đợi khám) & Reception

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/queue` | Query: `department`, `status`, `serviceStation` | staff |
| GET | `/queue/stations` | Danh sách trạm phục vụ + số người chờ mỗi trạm (derive từ `QueueTicket`) | staff |
| POST | `/queue/call-next` | `{department}` — chọn ticket ưu tiên cao nhất đang `waiting` (thứ tự: `urgent` > `priority` > `normal`, rồi theo `issuedAt`) và chuyển `called` | receptionist, nurse, doctor |
| POST | `/queue/:id/acknowledge` | → `acknowledged` | staff |
| POST | `/queue/:id/start-service` | → `in_service` | staff |
| POST | `/queue/:id/skip` | → `skipped` | staff |
| POST | `/queue/:id/complete` | `{nextStation?}` — nếu có `nextStation` → chuyển `routed` thay vì `completed` (điều hướng sang trạm kế tiếp) | staff |
| GET | `/reception/summary` | 3 số liệu tổng hợp cho `Reception.tsx`: số lịch hẹn sắp tới, số đang chờ, số đang gọi/phục vụ | receptionist |

> **Real-time**: `ClinicQueue.tsx` có chế độ **board** (`/display/queue`, `/queue-display/:locationId`) chạy full-screen tại khu vực chờ, tự làm mới theo mọi thay đổi store. Hiện tại chỉ "live" trong 1 tab do dùng `localStorage`. **BE bắt buộc cung cấp kênh real-time (WebSocket hoặc SSE) `/queue/stream?department=` hoặc `?locationId=`** để nhiều màn hình hiển thị đồng bộ khi có nhiều bệnh nhân/nhiều quầy — đây là gap lớn nhất về hạ tầng so với yêu cầu vận hành thực tế của phòng khám.

### 6.5 Medical Encounter (Lượt khám)

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/encounters` | Query: `patientId`, `status`, `department` | |
| GET | `/encounters/:id` | Chi tiết đầy đủ (bao gồm mảng ID liên kết tới AI assessment, order, diagnosis...) | |
| GET | `/encounters/:id/events` | Timeline audit nội bộ (`EncounterEvent[]`) | |
| GET | `/encounters/active?patientId=` | Lượt khám "đang sống" — encounter chưa đóng, mới cập nhật nhất (dùng cho trang chủ bệnh nhân) | |
| POST | `/encounters` | Tạo lượt khám mới (walk-in hoặc follow-up) `{patientId, type, origin, department, appointmentId?, parentEncounterId?}` | |
| POST | `/encounters/:id/transition` ⏱ | `{toStatus, reason?, blockingCondition?}` — validate theo bảng 5.1 | |
| POST | `/encounters/:id/close` ⏱ | Kiểm tra `record_signed` + `MedicalRecord.status==='signed'` trước khi cho đóng | |

### 6.6 Symptom Intake & AI Preliminary Assessment

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| POST | `/encounters/:id/intake` | `{chiefComplaint, severity(1-5), durationDays, symptoms[], history[], currentMedication[], images[]}` → tạo `SymptomIntake` + **tự động** trigger AI assessment (side-effect, không phải API riêng ở FE hiện tại) | patient |
| GET | `/encounters/:id/ai-assessments` | Lịch sử tất cả assessment (kể cả bị `supersededBy`) | |
| GET | `/ai-assessments/:id` | Chi tiết 1 assessment | |
| POST | `/encounters/:id/ai-assessments/reassess` | Yêu cầu đánh giá lại (khai lại triệu chứng), đánh dấu `supersededBy` lên assessment cũ | patient |

**Business logic BE phải triển khai lại (thuật toán scoring hiện chạy client-side, mục đích demo — BE nên thay bằng model AI thật hoặc rule-engine tương đương):**
- Nếu `severity >= 4` AND (`fever` hoặc `bleeding` trong symptoms) → `redFlag.urgency = 'emergency'`.
- Nếu `severity >= 3` AND `rapid_spreading` → `urgency = 'urgent'`.
- Nếu `severity >= 5` → `urgent`.
- Nếu `symptoms.length === 0` → `status = 'insufficient_data'`, không tính `candidateConditions`.
- Sau khi có assessment: nếu `redFlag.triggered` → tự động transition encounter sang `escalated` (kèm `blockingCondition`); ngược lại → `ai_assessed`.
- **Ranh giới nghiêm ngặt**: AI **không bao giờ** được phép tạo `DoctorDiagnosis`, `Prescription`, ký `MedicalRecord`, hay tự đóng encounter — đây là business rule ghi rõ trong code (`aiAssessmentService.ts` comment đầu file), BE phải tách quyền ghi của service/AI-pipeline riêng khỏi các bảng này ở tầng DB/IAM, không chỉ dựa vào application logic.

### 6.7 Doctor Decision (Review / Diagnosis / Clinical Plan) 🔒 toàn bộ chỉ `doctor`

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/encounters/:id/ai-assessments/:aiAssessmentId/review` | `{action: accepted\|partial\|rejected, acceptedConditionCode?, rationale?}`. **Validate bắt buộc**: nếu `action !== 'accepted'` → `rationale` bắt buộc; nếu chọn `acceptedConditionCode` khác với gợi ý xếp hạng cao nhất của AI → `rationale` cũng bắt buộc. |
| GET | `/encounters/:id/reviews` | |
| POST | `/encounters/:id/diagnoses` ⏱ | `{conditionName, conditionCode?, aiAssessmentId?, isAdditionalToAI, rationale?, status: provisional\|confirmed}`. Nếu `status=confirmed` → tự động transition encounter → `diagnosed`. |
| GET | `/encounters/:id/diagnoses` | |
| POST | `/diagnoses/:id/revise` | `{conditionName, rationale}` — đánh dấu bản ghi cũ `revised`, tạo bản ghi mới `confirmed` liên kết `revisionOf` |
| POST | `/encounters/:id/clinical-plan` ⏱ | `{diagnosisId, summary}` → tạo `ClinicalPlan`, gắn vào encounter, transition → `plan_approved`. **Side-effect**: nếu encounter chưa có `workflowInstanceId`, BE tự tìm workflow template phù hợp theo `department` (fuzzy match chuyên khoa) và **tự động activate workflow**. |
| GET | `/encounters/:id/clinical-plan` | |

### 6.8 Clinical Order & Result (Cận lâm sàng)

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| POST | `/encounters/:id/clinical-orders` ⏱ | `{type: laboratory\|imaging\|consultation, justification, assignedRole}` → transition encounter sang `awaiting_results` nếu hợp lệ | doctor |
| GET | `/encounters/:id/clinical-orders` | | |
| PATCH | `/clinical-orders/:id/invalid-sample` | `{reason}` → status `invalid_sample`, audit `severity: warning` | lab_technician, imaging_technician |
| POST | `/clinical-orders/:id/result` | `{summary, abnormal: boolean}` → tạo `ClinicalResult`, order chuyển `result_ready` (nếu abnormal) hoặc `completed` | lab_technician, imaging_technician |
| GET | `/clinical-orders/:id/result` | | |

### 6.9 Workflow / BPM

#### 6.9.1 Thiết kế template 🔒 `clinical_process_designer`, `medical_administrator` (riêng publish/archive chỉ `medical_administrator`)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/workflow-templates` | `{name, specialty, description}` → tạo template + version nháp #1 rỗng |
| PATCH | `/workflow-templates/:id` | `{name, specialty, description}` |
| GET | `/workflow-templates` | Query: `specialty` |
| GET | `/workflow-templates/recommend?specialty=` | Gợi ý template phù hợp nhất theo chuyên khoa (đã publish, mới nhất) — dùng khi bác sĩ duyệt phác đồ |
| GET | `/workflow-templates/:id/versions` | |
| GET | `/workflow-template-versions/:id` | |
| POST | `/workflow-templates/:id/versions` | Tạo bản nháp mới từ version đã publish gần nhất (copy toàn bộ step + node position) |
| POST | `/workflow-template-versions/:id/steps` | Thêm 1 `WorkflowStepDefinition` vào version **nháp** (chỉ sửa được version đang `draft`) |
| PATCH | `/workflow-template-versions/:id/steps/:code` | Sửa step — BE phải re-validate: không tự tham chiếu chính nó, không tạo chu trình (cycle) trong `prerequisiteStepCodes` (thuật toán DFS phát hiện cycle giống `assertAcyclic` trong code) |
| DELETE | `/workflow-template-versions/:id/steps/:code` | Chặn xoá nếu `mandatory=true` |
| POST | `/workflow-template-versions/:id/steps/reorder` | `{orderedCodes[]}` |
| POST | `/workflow-template-versions/:id/edges` | `{sourceCode, targetCode}` — nối phụ thuộc, chặn tự nối và chặn tạo cycle |
| DELETE | `/workflow-template-versions/:id/edges` | `{sourceCode, targetCode}` |
| PUT | `/workflow-template-versions/:id/node-positions` | `{positions: {code:{x,y}}}` — lưu vị trí sơ đồ trực quan (merge, không replace toàn bộ) |
| POST | `/workflow-template-versions/:id/publish` 🔒 admin only | Yêu cầu ≥1 step. Version publish trước đó (nếu có) tự động chuyển `deprecated`. |
| POST | `/workflow-template-versions/:id/archive` 🔒 admin only | |

#### 6.9.2 Vận hành runtime (instance & task)

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| POST | `/encounters/:id/workflow/activate` ⏱ | `{templateId}` — **Guard bắt buộc**: encounter phải đã có `clinicalPlanId` (đã duyệt phác đồ), nếu không → `409`. Copy-on-instantiate: sinh toàn bộ `WorkflowTask` từ `steps` của version đã publish tại thời điểm activate (sửa template sau này không ảnh hưởng instance đã chạy). Sinh `instanceCode` + `integrityHash`. Transition encounter → `workflow_active` → `in_progress`. | doctor, medical_administrator |
| GET | `/workflow-instances/:id` | | |
| GET | `/workflow-instances/:id/identity-verify` | Trả `{valid: boolean}` — so khớp lại `integrityHash` | |
| GET | `/workflow-instances?patientId=` | | |
| POST | `/workflow-instances/:id/suspend` | `{reason}` | |
| POST | `/workflow-instances/:id/resume` | | |
| POST | `/workflow-instances/:id/cancel` | `{reason}` | doctor, medical_administrator |
| POST | `/workflow-instances/:id/complete` | Kiểm tra toàn bộ task `mandatory` đã `completed`/`skipped`, nếu đạt → set `completed`, transition encounter → `results_complete` (không tự đóng encounter) | |
| GET | `/workflow-tasks` | Query: `encounterId`, `role`, `assigneeId`, `department`, `status`, `priority`, `urgency` — **đây là bộ filter thực tế của trang Work Queue**, phải hỗ trợ đủ 4 filter kết hợp | |
| POST | `/workflow-tasks/:id/accept` ⏱ | Gán `assigneeId = actorId`, status → `accepted` | |
| POST | `/workflow-tasks/:id/start` ⏱ | → `in_progress` | |
| POST | `/workflow-tasks/:id/complete` ⏱ | → `completed`, tự động mở khoá task phụ thuộc | |
| POST | `/workflow-tasks/:id/redo` | `{reason}` — chuyển qua `failed` rồi `redo_required` (2 bước, tăng `reworkCount`) | |
| POST | `/workflow-tasks/:id/reject` | `{reason}` — tương tự nhưng qua `rejected` | |
| POST | `/workflow-tasks/:id/escalate` | `{reason}` | |
| POST | `/workflow-tasks/:id/skip` | `{reason}` — chặn nếu step `mandatory` | |
| POST | `/workflow-tasks/:id/reassign` | `{assigneeId}` | |

### 6.10 Medical Record (EMR)

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/encounters/:id/medical-record` | Auto-tạo draft nếu chưa tồn tại (`ensureDraft`) | |
| POST | `/encounters/:id/prescriptions` ⏱ | `{medications: [{name, dose, durationDays}]}` — chặn nếu record đã `signed`/`amended`; set record status → `in_review` | doctor |
| GET | `/encounters/:id/prescriptions` | | |
| POST | `/encounters/:id/documents` (multipart) | `{type, file, workflowTaskId?, clinicalOrderId?}` → lưu file + tính `fileHash`, `reviewStatus=pending`, `signatureStatus=unsigned` | |
| GET | `/encounters/:id/documents` | | |
| POST | `/documents/:id/review` | Đánh dấu `reviewStatus=reviewed` | |
| POST | `/documents/:id/flag-incorrect-link` | `{reason}` — đánh dấu `incorrectLinkFlag`, audit `warning` | |
| PATCH | `/encounters/:id/medical-record/diagnosis` | `{diagnosisId}` → gắn diagnosis, status → `in_review` | doctor |
| PATCH | `/encounters/:id/medical-record/discharge-followup` | `{discharge?{instructions[],followUpNeeded}, followUp?{description,dueInDays}}` → status → `awaiting_signature` | doctor |
| GET | `/medical-records/:id/completion-check` | Trả `{ok, missing[]}` — kiểm tra điều kiện đủ để ký (tối thiểu: có diagnosis đã `confirmed`/`revised`) | |
| POST | `/medical-records/:id/sign` ⏱ | Chặn nếu đã `signed`; validate lại `completion-check` ở server (không tin FE) | doctor |
| POST | `/medical-records/:id/addendum` | `{text}` — chỉ áp dụng khi record đã `signed`/`amended`, append-only, status → `amended` | doctor |
| POST | `/medical-records/:id/reopen` | `{reason}` bắt buộc, audit `severity: warning` | medical_administrator |
| POST | `/medical-records/:id/flag-late-result` | `{description}` — nếu record đã `signed` thì **không sửa gì cả**, chỉ audit; nếu chưa ký thì set `addendum_required` | |

### 6.11 CRM — Care Plan, Follow-up, Escalation Alert

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/patients/:id/care-plan` | | |
| GET | `/care-plans/:id/activities` | | |
| POST | `/care-plans/:id/activities` | `{type, title, description, dueDate, priority, status}` | care_coordinator, medical_administrator |
| POST | `/activities/:id/advance` ⏱ | `{toStatus}` theo bảng 5.3 | |
| POST | `/activities/:id/confirm` | Bệnh nhân xác nhận đã thực hiện (VD: uống thuốc, làm khảo sát) — nếu đang `scheduled` tự chuyển `due` rồi `completed` | patient |
| POST | `/care-plans/:id/run-automation` | Chạy engine tự động gửi nhắc nhở cho các activity thuộc nhóm tự động hoá (`medication_reminder`, `lifestyle_guidance`, `patient_education`, `symptom_questionnaire`, `satisfaction_survey`, `adherence_check`) đang `scheduled`/`due` — trả `{processed, notifications}` | system (cron) |
| POST | `/patients/:id/alerts` | `{trigger, note}` — trigger phải thuộc 1 trong 9 `EscalationTrigger` cố định (bảng dưới), server tự tra `severity/responsibleActor/responseDeadlineHours/requiresLinkedEncounter` theo rule, **không nhận các field này từ client** | care_coordinator, system |
| GET | `/patients/:id/alerts` | | |
| GET | `/alerts?status=open` | Danh sách toàn bộ alert chưa `resolved` (dashboard vận hành) | staff |
| POST | `/alerts/:id/close` | Chặn nếu actor không phải `doctor`/`medical_administrator`/`care_coordinator` | |
| POST | `/patients/:id/encounter-requests` | `{reason, requestedByRole, sourceAlertId?}` — **tự động sinh** khi alert có `requiresLinkedEncounter=true` | |
| GET | `/encounter-requests` | | medical_administrator, doctor |
| POST | `/encounter-requests/:id/decide` ⏱ | `{decision: approve\|reject, department?}` — approve sẽ **tạo `MedicalEncounter` mới** loại `follow_up`, liên kết `parentEncounterId` = lượt khám gần nhất của bệnh nhân | medical_administrator, doctor |

**Bảng `EscalationTrigger` → rule cố định (BE hard-code, không cho client override):**

| trigger | severity | responsibleActor | deadline (giờ) | cần tạo encounter? |
|---|---|---|---|---|
| `new_red_flag_symptom` | critical | Bác sĩ trực / Cấp cứu | 1 | có |
| `worsening_symptoms` | high | Điều phối viên chăm sóc | 4 | có |
| `treatment_failure` | high | Điều phối → Quản trị viên y tế | 24 | có |
| `urgent_contact_request` | high | Điều phối viên chăm sóc | 2 | không |
| `abnormal_home_monitoring` | medium | Điều phối viên chăm sóc | 6 | có |
| `medication_side_effect` | medium | Dược sĩ → Bác sĩ | 12 | không |
| `missed_follow_up` | medium | Nhân viên CSKH | 24 | không |
| `no_response` | medium | Nhân viên CSKH | 24 | không |
| `medication_non_adherence` | low | Điều phối viên chăm sóc | 48 | không |

**Hành vi CRM tuyệt đối bị cấm (ghi rõ trong code, BE nên enforce ở tầng API/permission, không chỉ UI):** đổi chẩn đoán, đổi/kê đơn thuốc, sửa hồ sơ bệnh án đã ký, tự tạo lượt khám không qua phê duyệt, tự đóng cảnh báo lâm sàng không có xác nhận thẩm quyền.

### 6.12 Notification

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/notifications?userId=` | Sắp xếp `createdAt` giảm dần |
| GET | `/notifications/unread-count?userId=` | |
| POST | `/notifications/:id/read` | |
| POST | `/notifications/:id/retry` | Đặt lại `status=delivered`, tăng `retryCount`, xoá `failureReason` |
| GET | `/notifications` 🔒 admin | Toàn bộ notification hệ thống (màn giám sát) |

> Notification được **sinh tự động** bởi các service khác (đặt lịch, CRM automation...) chứ FE không có form tạo notification thủ công — BE nên thiết kế như 1 internal event bus / outbox pattern, expose kênh gửi qua `sms`/`email`/`push`/`in_app` thật (hiện FE mô phỏng "SMS luôn fail nếu id kết thúc bằng số 3" — chỉ là logic demo, bỏ qua khi làm thật).

### 6.13 Audit Log

| Method | Endpoint | Mô tả | 🔒 |
|---|---|---|---|
| GET | `/audit` | Query: `sourceModule`, `severity`, `entityType`, `patientId`, `encounterId`, `dateFrom`, `dateTo`, `page`, `pageSize` (UI hiện tại mới có filter `module` + `severity`, nhưng nên chuẩn bị sẵn `dateFrom/dateTo`/`q` vì đây là màn tra cứu tuân thủ, khả năng cao sẽ cần) | medical_administrator, system_administrator |
| GET | `/audit/encounters/:id` | | |
| GET | `/audit/patients/:id` | | |
| POST | `/audit/client-events` | **Ghi log lỗi crash từ FE** — `GlobalErrorListener.tsx` bắt mọi `window.error`/`unhandledrejection` và gọi audit log với `action: UNHANDLED_CLIENT_ERROR`, `severity: critical`. BE cần 1 endpoint riêng nhận telemetry lỗi client (không đi qua flow nghiệp vụ bình thường), có rate-limit để tránh bị spam bởi client lỗi vòng lặp. | tất cả user đã đăng nhập |

> Mọi API ghi (POST/PATCH/PUT/DELETE) ở toàn bộ mục 6 phải tự động sinh **1 `AuditEvent`** — đối chiếu code cho thấy **không có ngoại lệ**: mọi mutation nghiệp vụ (từ đặt lịch, check-in, đổi trạng thái, ký hồ sơ, đến đóng alert) đều gọi `auditService.log(...)`. Đây nên là 1 middleware/interceptor chung ở BE, không phải logic thủ công từng endpoint.

### 6.14 Integration Monitoring (Admin) 🔒 `medical_administrator`, `system_administrator`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/integrations/connections` | Trạng thái các kết nối hệ thống ngoài (HIS/LIS/PACS/thanh toán...) |
| GET | `/integrations/connections/:id/messages` | Hàng đợi message của 1 kết nối |
| POST | `/integrations/connections/:id/retry` | Gửi lại message lỗi |
| POST | `/integrations/connections/:id/reconcile` | Đối soát lại trạng thái kết nối |

> ⚠️ Lưu ý: FE hiện **không có `integrationService.ts`** — trang `Integrations.tsx` gọi trực tiếp `integrationRepository.upsert(...)`, bỏ qua toàn bộ lớp service. Đây là dấu hiệu tính năng này **chưa hoàn thiện ở FE**; BE cần làm việc với FE để chốt lại chính xác quy tắc retry/reconcile (hiện tại logic chỉ là giả lập UI, comment ghi rõ "mô phỏng — không có backend thật").

### 6.15 Dashboard & Reporting (Aggregation APIs) **[MỚI — CẦN AGGREGATION, HIỆN ĐANG HARDCODE]**

Toàn bộ số liệu dưới đây hiện đang là **mảng dữ liệu tĩnh viết cứng trong JSX** (không tính toán từ đâu cả) — BE cần cung cấp API tính toán thật:

| Method | Endpoint | Dùng cho | Cách tính (suy ra từ tên biến & bối cảnh, KHÔNG có công thức chính xác trong FE — cần chốt lại với Product) |
|---|---|---|---|
| GET | `/dashboard/operational-kpis` | Dashboard vai trò nhân viên: 8 thẻ KPI | `activeEncounters` = encounter có status khác `closed`/`follow_up_linked`; `awaitingDoctorReview` = status `under_doctor_review`; `emergencyEncounters` = status `escalated`; `overdueSlaTasks` = task chưa `completed` và `(now - createdAt) > slaMinutes`; `recordsAwaitingSignature` = MedicalRecord status `awaiting_signature`; `openCrmAlerts` = ClinicalAlert status ≠ `resolved`; `failedNotifications` = Notification status `failed`; `unhealthyIntegrations` = IntegrationConnection status ≠ `healthy` |
| GET | `/patients/:id/health-summary` | Dashboard/Profile bệnh nhân: điểm sức khoẻ da, % tiến triển điều trị, mức độ rủi ro | **Chưa có công thức trong FE** — hiện là số cố định (85/72/"Thấp"). Cần Product/Clinical team định nghĩa thuật toán chấm điểm. |
| GET | `/patients/:id/health-score-history` | Biểu đồ 8 tuần (điểm tổng, viêm, sắc tố, độ ẩm) ở Dashboard & Progress | Cần entity theo dõi định kỳ (weekly skin metrics) — hiện không tồn tại trong domain model, phải thiết kế mới |
| GET | `/patients/:id/reports/overview` | Tab "Tổng quan" trang Reports | Số buổi khám hoàn thành, % tuân thủ điều trị, v.v. |
| GET | `/patients/:id/reports/treatment-history` | Tab "Điều trị" | Lịch sử điều trị theo mốc thời gian |
| GET | `/patients/:id/reports/medicine-history` | Tab "Thuốc" | Lịch sử dùng thuốc |
| GET | `/patients/:id/reports/ai-summary` | Tab "AI Báo cáo" — tổng hợp AI, xếp hạng chữ (VD "A+") | Cần định nghĩa thuật toán/mô hình tạo báo cáo tổng hợp |
| GET | `/patients/:id/reports/export?format=pdf` | Nút "Xuất PDF" (hiện chưa nối handler) | BE sinh file PDF server-side, trả về presigned URL hoặc stream file |

---

## 7. Các tính năng FE có UI nhưng CHƯA có backing service — cần thiết kế API mới hoàn toàn

Đây là danh sách **quan trọng để không bị bỏ sót** khi lập kế hoạch — các màn hình này tồn tại đầy đủ trên UI, người dùng bấm được, nhưng **không có bất kỳ entity/service nào phía sau**, hoặc dùng dữ liệu tĩnh biên dịch sẵn trong file `src/data/mockData.ts`.

| Màn hình | Hiện trạng | Việc BE cần làm |
|---|---|---|
| **Prescriptions.tsx** (Đơn thuốc bệnh nhân) | Toàn bộ dùng `mockPrescriptions`, `mockMedicineReminders` tĩnh; nút "Yêu cầu tái kê đơn", "Lịch sử đơn thuốc", "Đặt nhắc nhở tùy chỉnh" không có handler | Thiết kế entity `MedicationReminder` (giờ uống, loại, trạng thái đã-uống theo ngày) tách biệt với `Prescription` hiện có ở EMR; API `GET/POST /patients/:id/medication-reminders`, `PATCH .../taken`, `POST /prescriptions/:id/refill-request` |
| **Progress.tsx** (Ảnh tiến triển da) | `mockProgressData`, `mockProgressPhotos` tĩnh; nút "Upload ảnh mới" không có input file thật; toàn bộ % cải thiện, nhận định AI là hardcode | Cần entity `ProgressPhoto{id, patientId, takenAt, imageUrl, aiScore, note}` + pipeline chấm điểm ảnh bằng AI; `POST /patients/:id/progress-photos` (multipart) |
| **Records.tsx → Tab "Kế hoạch điều trị" (Kanban)** | State cục bộ React (`useState`), kéo-thả không lưu lại đâu cả, mất khi refresh | Thiết kế entity `CarePlanTask` (khác `WorkflowTask`) hoặc dùng lại `FollowUpActivity` với board view; cần API CRUD + đổi cột (status) |
| **Reports.tsx** | Phần lớn (breakdown cải thiện, lịch sử điều trị/thuốc, AI report 4 phần, nút Xuất PDF) hardcode, không có handler xuất PDF | Xem mục 6.15; cần thêm report-generation service |
| **Support.tsx** | Form gửi yêu cầu hỗ trợ chỉ `clear()` input, không gửi đi đâu | `POST /support/tickets {topic, message}` + kênh liên hệ (hotline/chat/email) hiện đang là danh sách tĩnh, có thể để tĩnh nếu không đổi thường xuyên |
| **SettingsPage.tsx** | Toggle thông báo/quyền riêng tư/thiết bị chỉ là state cục bộ, nút "Lưu cài đặt" không hoạt động; "Xóa tài khoản" không có handler | `GET/PUT /users/:id/preferences {notifications, privacy, device, display, language}`; `POST /users/:id/deletion-request` (nên là luồng có xác nhận, không xoá ngay) |
| **AIAnalysis.tsx — upload ảnh/camera** | `Upload.Dragger` với `beforeUpload={() => false}` — không lưu file thật; nút "Dùng camera" không có handler | Cần generic file-upload endpoint (xem mục 8.4) tích hợp vào `POST /encounters/:id/intake` |
| **Profile.tsx — avatar upload, "Chỉnh sửa hồ sơ", "Cài đặt thông báo", "Quyền riêng tư"** | Icon camera và các nút menu không có handler | Nối vào `PATCH /users/:id` (avatar cần presigned upload URL) và `/users/:id/preferences` ở trên |
| **Integrations.tsx** | Gọi thẳng repository, không qua service — xem mục 6.14 | Chốt lại chính xác nghiệp vụ retry/reconcile trước khi build |

---

## 8. Yêu cầu phi chức năng (Non-functional)

### 8.1 Real-time / Push
- **Bắt buộc** cho: bảng hiển thị hàng đợi công khai (`ClinicQueue` board mode), số hàng chờ tại quầy lễ tân, danh sách task trong `WorkQueue` (nhiều nhân viên thao tác đồng thời), notification center.
- Khuyến nghị: WebSocket (Socket.io hoặc tương đương) theo room `department:{code}` / `user:{id}` / `encounter:{id}`; fallback polling 5–10s cho thiết bị kiosk cũ.

### 8.2 Optimistic locking / Concurrency
- Các entity nhiều actor cùng sửa (`WorkflowTask`, `QueueTicket`, `MedicalRecord`) nên trả kèm `version`/`updatedAt` và validate `If-Match` khi update, tránh 2 nhân viên "accept" cùng 1 task cùng lúc.

### 8.3 Idempotency
- `POST /check-in`: bắt buộc (đã mô tả ở 6.3).
- `POST /encounters/:id/workflow/activate`: nếu encounter đã có `workflowInstanceId`, trả về instance hiện có thay vì lỗi hoặc tạo trùng (đúng hành vi FE hiện tại).
- Khuyến nghị dùng header `Idempotency-Key` chuẩn cho toàn bộ POST tạo mới.

### 8.4 File/Media Upload
Chưa có bất kỳ chuẩn upload nào tồn tại thực sự trong FE (toàn bộ đang là input giả). Khuyến nghị 1 service dùng chung, theo mô hình **presigned URL**:
1. `POST /uploads/presign {fileName, contentType, context: 'clinical-document'|'progress-photo'|'avatar'|'intake-image'}` → `{uploadUrl, fileId, expiresAt}`
2. Client PUT thẳng lên storage (S3-compatible).
3. `POST /uploads/:fileId/confirm` → BE verify, gắn vào entity tương ứng (`ClinicalDocument.fileHash`, `ProgressPhoto.imageUrl`,...).

Áp dụng cho: tài liệu lâm sàng (`ClinicalDocument`), ảnh khai triệu chứng AI, ảnh tiến triển da, avatar người dùng.

### 8.5 Data ownership / Multi-tenant
FE hiện là **prototype đơn bệnh nhân** (`patientService.getCurrentPatient()` luôn trả bệnh nhân đầu tiên trong seed data). BE khi làm thật **phải** suy ra `patientId` từ token đăng nhập, không nhận `patientId` tuỳ ý từ client cho các API "của tôi" (`/patients/me`, `/appointments?patientId=me`...) để tránh IDOR (Insecure Direct Object Reference) — đối chiếu phát hiện tại `PatientJourneyDetail.tsx`: FE tự kiểm tra `encounter.patientId !== currentPatient.id` để chặn xem chéo hồ sơ, đây **chỉ là kiểm tra phía client**, BE bắt buộc phải enforce lại ở server, không được tin tưởng route param.

### 8.6 Xuất dữ liệu & bảo mật hồ sơ
- API audit log, EMR, break-glass access (mô tả ở `Records.tsx` — nhân viên không đủ quyền có thể tự ghi lý do để "truy cập khẩn cấp") cần được BE **re-authorize thật sự** (VD: yêu cầu thêm xác thực bước 2, hoặc giới hạn thời gian truy cập, thông báo cho quản lý) — hiện FE chỉ ghi audit log chứ không chặn truy cập, đây là hành vi **chỉ chấp nhận được ở prototype**, không được đưa thẳng vào production.

---

## 9. Khuyến nghị ưu tiên triển khai theo giai đoạn

**Giai đoạn 1 — Nền tảng (bắt buộc trước mọi thứ khác):**
Auth thật (6.1) → User/Patient (6.1–6.2) → Audit middleware dùng chung (6.13) → Encounter + state machine (6.5) → Appointment + QR check-in + idempotency (6.3) → Queue (6.4, kèm real-time).

**Giai đoạn 2 — Luồng khám lâm sàng cốt lõi:**
Symptom Intake + AI Assessment (6.6) → Doctor Decision (6.7) → Clinical Order/Result (6.8) → Workflow/BPM đầy đủ (6.9) → Medical Record/EMR + ký số (6.10).

**Giai đoạn 3 — Sau khám & vận hành:**
CRM/Care Plan/Alert (6.11) → Notification thật qua SMS/email/push (6.12) → Integration monitoring (6.14) → Dashboard aggregation (6.15).

**Giai đoạn 4 — Các tính năng UI đã có nhưng chưa có backend (mục 7):**
Cần họp với Product để chốt lại phạm vi trước khi thiết kế DB — đặc biệt `MedicationReminder`, `ProgressPhoto` + AI scoring, report PDF export, vì đây là các entity **hoàn toàn mới**, không suy ra được từ code hiện có.

---

*Tài liệu được tổng hợp tự động từ toàn bộ mã nguồn frontend tại thời điểm 2026-07-16. Khi FE có thay đổi nghiệp vụ (đặc biệt các bảng máy trạng thái ở mục 5 và bảng `ESCALATION_RULES` ở mục 6.11), cần rà soát lại tài liệu này để tránh lệch hợp đồng API.*
