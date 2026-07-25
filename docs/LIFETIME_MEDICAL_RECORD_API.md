# API Hồ sơ bệnh án trọn đời

## Trạng thái triển khai (BE) — cập nhật ở v2.7.1

| Phần | Endpoint | Trạng thái |
|---|---|---|
| §2 Endpoint tổng hợp | `GET /patients/:patientId/lifetime-medical-record` | ✅ Đã triển khai (Phase 1, v2.7.1) |
| §3 Nhập hồ sơ từ hệ thống khác | `POST /patients/:patientId/lifetime-medical-record/imports` | ⏳ Chưa triển khai |
| §4 Chia sẻ bệnh án | `POST /patients/:patientId/lifetime-medical-record/shares` | ⏳ Chưa triển khai |
| §5 Đối sánh người bệnh (cross-org identity) | `patient_identity_links` + hàng đợi xác minh | ⏳ Chưa triển khai — `Patient` hiện vẫn scoped theo 1 `organizationId`, chưa có khái niệm định danh liên-cơ-sở |

Phase 1 chỉ tổng hợp dữ liệu **trong phạm vi tổ chức hiện có của bệnh nhân**
(encounter, chẩn đoán, đơn thuốc, chỉ định/kết quả cận lâm sàng, tài liệu, kế
hoạch điều trị) từ các bảng lâm sàng đã có sẵn — không có bảng mới, không có
hợp nhất đa tổ chức. Các khoảng trống đã biết so với hợp đồng bên dưới:

- `patient.nationalHealthId` luôn `null` — chưa có cột lưu định danh y tế quốc gia.
- `summary.allergies` luôn `[]` — chưa có model AllergyIntolerance-equivalent.
- `type=vaccination|allergy` luôn trả rỗng — chưa có dữ liệu nguồn cho 2 loại này.
- `events[].documents[].contentType/signedAt/downloadUrl` luôn `null` — `ClinicalDocument`
  chưa lưu content-type/signed-at, và chưa có endpoint `GET /documents/:id/content`
  để phát `downloadUrl` thật (có kiểm tra quyền lại khi tải).
- `events[].provenance.sourceSystem/importedAt/lastVerifiedAt/integrityHash` luôn
  `null` cho dữ liệu nội bộ — các trường này chỉ có ý nghĩa cho hồ sơ nhập qua
  §3 (chưa triển khai).
- Lọc/sắp xếp/phân trang thực hiện in-memory trên toàn bộ dữ liệu của bệnh
  nhân — đủ dùng ở quy mô hiện tại, chưa đạt mục tiêu P95 < 1s @ 10.000 sự
  kiện/bệnh nhân nêu ở §8 (cần index/cache riêng, xem §6).
- Quyền xem: `patient` (chính mình), `doctor` (có quan hệ điều trị còn hiệu
  lực — `primaryDoctorId` hoặc `PatientCareTeamMember` còn hạn),
  `medical_administrator` (cùng tổ chức), `super_administrator` (toàn quyền
  đọc, không có bypass ghi). `receptionist` **không** được xem — endpoint này
  trả toàn bộ lịch sử lâm sàng, rộng hơn phạm vi hành chính/liên hệ mà
  receptionist cần. Không đúng phạm vi → `403 RECORD_ACCESS_DENIED` (không
  ẩn dưới dạng 404 như `GET /patients/:id`).
- Mọi lượt đọc (kể cả bị từ chối) đều ghi `audit_events` với
  `action = 'lifetime_medical_record.read'`.
- Break-glass/MFA cho truy cập ngoài phạm vi (§2 "Truy cập ngoài phạm vi")
  chưa được nối vào endpoint này — hiện chỉ có break-glass theo từng
  encounter (`MedicalRecordBreakGlassGrant`) và break-glass toàn nền tảng
  của Owner, không phải break-glass theo phạm vi "hồ sơ trọn đời".

Mã nguồn: `src/modules/patients/lifetime-medical-record.{controller,service,repository,mapper}.ts`,
`src/modules/patients/policies/lifetime-medical-record-policies.ts`.

---

## 1. Mục tiêu

Hợp nhất lịch sử khám chữa bệnh của một người bệnh qua nhiều lượt khám, cơ sở và
hệ thống nguồn thành một dòng thời gian có thể truy vết.

Nguyên tắc bắt buộc:

- Không ghi đè hồ sơ nguồn.
- Mỗi bản ghi phải giữ `sourceRecordId`, đơn vị cung cấp và thời điểm đồng bộ.
- Hồ sơ đã ký chỉ được bổ sung phiên bản hoặc phụ lục, không sửa âm thầm.
- Mọi lượt xem, chia sẻ, nhập dữ liệu và tải tài liệu phải được audit.
- Quyền xem phải kiểm tra đồng thời permission, quan hệ điều trị, phạm vi tổ
  chức và consent của người bệnh.
- Dữ liệu giữa các cơ sở chỉ được hợp nhất sau khi đối sánh đúng người bệnh.

Frontend đã khai báo contract tại:
`src/api/lifetimeMedicalRecord.ts`.

## 2. Endpoint tổng hợp bệnh án

### `GET /api/v1/patients/:patientId/lifetime-medical-record`

Permission đề xuất:

- Người bệnh: xem hồ sơ của chính mình.
- Bác sĩ: `patient.read.assigned` và có quan hệ điều trị còn hiệu lực.
- Quản trị y tế: theo scope tổ chức và mục đích nghiệp vụ hợp lệ.
- Truy cập ngoài phạm vi: phải qua break-glass, MFA và audit mức nghiêm trọng.

Query:

| Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `from` | ISO date-time | Không | Thời điểm bắt đầu |
| `to` | ISO date-time | Không | Thời điểm kết thúc |
| `organizationId` | UUID | Không | Lọc đơn vị y tế |
| `facilityId` | UUID | Không | Lọc cơ sở |
| `type` | enum | Không | Loại sự kiện |
| `search` | string | Không | Tìm chẩn đoán, thuốc, bác sĩ, cơ sở |
| `page` | integer | Không | Mặc định `1` |
| `limit` | integer | Không | Mặc định `20`, tối đa `100` |

`type`:

```text
encounter | diagnosis | procedure | prescription | laboratory |
imaging | vaccination | allergy | document | care_plan
```

Response `200`:

```json
{
  "patient": {
    "id": "patient-uuid",
    "nationalHealthId": "optional-national-health-id",
    "code": "BN000123",
    "name": "Nguyễn Văn A",
    "dob": "1990-01-20",
    "gender": "male",
    "bloodType": "O+"
  },
  "summary": {
    "encounterCount": 18,
    "organizationCount": 3,
    "facilityCount": 5,
    "firstRecordedAt": "2018-03-12T08:30:00Z",
    "lastRecordedAt": "2026-07-25T09:00:00Z",
    "activeConditions": [
      {
        "id": "condition-1",
        "code": "L70.0",
        "display": "Mụn trứng cá",
        "status": "active"
      }
    ],
    "allergies": [],
    "currentMedications": []
  },
  "events": [
    {
      "id": "event-uuid",
      "occurredAt": "2026-07-25T08:00:00Z",
      "endedAt": "2026-07-25T09:00:00Z",
      "type": "encounter",
      "title": "Khám chuyên khoa Da liễu",
      "summary": "Tái khám và đánh giá đáp ứng điều trị",
      "status": "completed",
      "specialty": "Da liễu",
      "practitionerName": "BS. Nguyễn Thị An",
      "source": {
        "organizationId": "org-uuid",
        "organizationName": "Bệnh viện A",
        "facilityId": "facility-uuid",
        "facilityName": "Cơ sở trung tâm",
        "province": "Hà Nội",
        "system": "HIS-A"
      },
      "diagnoses": [
        {
          "id": "diagnosis-uuid",
          "code": "L70.0",
          "display": "Mụn trứng cá",
          "status": "confirmed",
          "note": null
        }
      ],
      "medications": [],
      "orders": [],
      "results": [],
      "procedures": [],
      "documents": [
        {
          "id": "document-uuid",
          "title": "Phiếu khám",
          "contentType": "application/pdf",
          "signedAt": "2026-07-25T09:00:00Z",
          "downloadUrl": "/api/v1/documents/document-uuid/content"
        }
      ],
      "provenance": {
        "sourceRecordId": "HIS-A-12345",
        "sourceSystem": "HIS-A",
        "importedAt": "2026-07-25T09:05:00Z",
        "lastVerifiedAt": "2026-07-25T09:05:00Z",
        "integrityHash": "sha256:..."
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 18,
  "synchronizedAt": "2026-07-25T09:05:00Z"
}
```

Quy ước:

- Mảng không có dữ liệu trả `[]`, không trả `null`.
- Ngày giờ dùng ISO 8601 UTC.
- `downloadUrl` nên là URL ngắn hạn hoặc endpoint kiểm tra quyền lại khi tải.
- Sắp xếp `events` theo `occurredAt DESC`.

## 3. Nhập hồ sơ từ hệ thống/cơ sở khác

### `POST /api/v1/patients/:patientId/lifetime-medical-record/imports`

Không nên cho browser gọi trực tiếp trong production. Endpoint dành cho
integration service hoặc tài khoản hệ thống có mTLS/service credential.

Body:

```json
{
  "sourceOrganizationId": "org-source-uuid",
  "sourceFacilityId": "facility-source-uuid",
  "sourceSystem": "HIS-A",
  "externalPatientId": "BN-EXT-1001",
  "consentId": "consent-uuid",
  "records": [
    {
      "resourceType": "Encounter",
      "externalId": "ENC-10001",
      "occurredAt": "2026-07-25T08:00:00Z",
      "payload": {},
      "integrityHash": "sha256:..."
    }
  ]
}
```

Response `202`:

```json
{
  "importJobId": "job-uuid",
  "accepted": 1,
  "rejected": 0
}
```

Idempotency:

- Nhận header `Idempotency-Key`.
- Unique key đề xuất:
  `(sourceOrganizationId, sourceSystem, resourceType, externalId, version)`.
- Gửi lại cùng phiên bản không được tạo sự kiện trùng.

## 4. Chia sẻ bệnh án

### `POST /api/v1/patients/:patientId/lifetime-medical-record/shares`

Body:

```json
{
  "recipientOrganizationId": "recipient-org-uuid",
  "recipientPractitionerId": "doctor-uuid",
  "purpose": "treatment",
  "eventIds": ["event-1", "event-2"],
  "expiresAt": "2026-07-26T09:00:00Z",
  "consentId": "consent-uuid"
}
```

`purpose`:

```text
treatment | referral | emergency | patient_request
```

Response `201`:

```json
{
  "shareId": "share-uuid",
  "accessUrl": "https://...",
  "expiresAt": "2026-07-26T09:00:00Z"
}
```

Yêu cầu:

- Link có thời hạn, một recipient rõ ràng và có thể thu hồi.
- Không đưa access token dài hạn vào URL.
- Audit người tạo, recipient, purpose, event được chia sẻ và thời gian xem.

## 5. Đối sánh người bệnh

Không hợp nhất chỉ dựa trên họ tên hoặc số điện thoại.

Luồng đề xuất:

1. Chuẩn hóa định danh.
2. Đối sánh bằng định danh y tế/quốc gia khi được phép.
3. Kết hợp ngày sinh, giới tính và thông tin liên hệ.
4. Trường hợp không chắc chắn đưa vào hàng đợi xác minh thủ công.
5. Lưu `patient_identity_links` có confidence, evidence, người phê duyệt và
   thời điểm.
6. Hỗ trợ tách liên kết sai mà không xóa hồ sơ nguồn.

## 6. Mô hình lưu trữ đề xuất

- `lifetime_record_events`: chỉ mục dòng thời gian đã chuẩn hóa.
- `external_clinical_resources`: payload nguồn, version, hash và provenance.
- `patient_identity_links`: liên kết định danh giữa các hệ thống.
- `record_shares`: consent, recipient, purpose, expiry, revokedAt.
- `record_access_audits`: actor, patient, event/document, purpose, IP/device,
  organization, decision.
- Tài liệu nhị phân lưu object storage; database chỉ lưu metadata và hash.

Nên chuẩn hóa resource theo FHIR R4/R5 khi tích hợp:

- Patient, Encounter, Condition, AllergyIntolerance
- MedicationRequest, MedicationStatement
- Observation, DiagnosticReport, ServiceRequest
- Procedure, Immunization, CarePlan
- DocumentReference, Provenance, Consent

## 7. Lỗi chuẩn

| HTTP | `code` | Ý nghĩa |
|---:|---|---|
| 400 | `INVALID_FILTER` | Bộ lọc không hợp lệ |
| 401 | `AUTHENTICATION_REQUIRED` | Chưa đăng nhập |
| 403 | `RECORD_ACCESS_DENIED` | Không đủ quyền/scope/consent |
| 404 | `PATIENT_NOT_FOUND` | Không tìm thấy người bệnh |
| 409 | `IDENTITY_MATCH_UNRESOLVED` | Chưa xác minh liên kết định danh |
| 409 | `IMPORT_VERSION_CONFLICT` | Phiên bản nguồn xung đột |
| 422 | `CONSENT_INVALID` | Consent hết hạn hoặc sai mục đích |

Envelope lỗi cần có `requestId` để tra audit/log.

## 8. Tiêu chí hoàn thành backend

- Endpoint tổng hợp có phân trang và lọc.
- Không trả bản ghi ngoài scope/consent.
- Có provenance cho 100% event.
- Import idempotent và không làm mất phiên bản cũ.
- Tải tài liệu kiểm tra quyền lại.
- Tất cả read/share/import/break-glass được audit.
- Có test cho phân quyền chéo tổ chức, consent hết hạn, hồ sơ trùng và liên kết
  định danh sai.
- P95 của endpoint tổng hợp dưới 1 giây với 10.000 sự kiện/người bệnh sau khi
  có index/cache phù hợp.
