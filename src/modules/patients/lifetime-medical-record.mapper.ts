import {
  AllergyIntoleranceDto,
  AllergyKnowledgeStateDto,
  LifetimeRecordClinicalItemDto,
  LifetimeRecordDocumentDto,
  LifetimeRecordEventDto,
  LifetimeRecordPatientDto,
  LifetimeRecordProvenanceDto,
  LifetimeRecordSourceDto,
  LifetimeRecordSummaryDto,
  PatientProfileNarrativeDto,
  VitalObservationDto,
} from './dto/responses/lifetime-medical-record-response.dto';
import { LifetimeMedicalRecordRepository } from './lifetime-medical-record.repository';

type EncounterAggregate = Awaited<
  ReturnType<LifetimeMedicalRecordRepository['findEncountersForPatient']>
>[number];
type DiagnosisRow = EncounterAggregate['diagnoses'][number];
type PrescriptionRow = Awaited<
  ReturnType<LifetimeMedicalRecordRepository['findPrescriptions']>
>[number];
type DocumentRow = Awaited<ReturnType<LifetimeMedicalRecordRepository['findDocuments']>>[number];
type PatientCore = NonNullable<
  Awaited<ReturnType<LifetimeMedicalRecordRepository['findPatientCore']>>
>;
type AllergyRow = Awaited<ReturnType<LifetimeMedicalRecordRepository['findAllergies']>>[number];
type VitalRow = Awaited<
  ReturnType<LifetimeMedicalRecordRepository['findVitalObservations']>
>[number];
type NarrativeRow = NonNullable<
  Awaited<ReturnType<LifetimeMedicalRecordRepository['findProfileNarrative']>>
>;

type PrescriptionMedication = { name: string; dose: string; durationDays: number };

const ORDER_TYPE_LABEL: Record<string, string> = {
  laboratory: 'Xét nghiệm',
  imaging: 'Chẩn đoán hình ảnh',
  consultation: 'Hội chẩn',
};

/** ClinicalOrderType -> lifetime-record event type. There is no dedicated
 * "Procedure" resource in this schema yet, so a consultation order — the
 * closest existing analog — is surfaced as `procedure` rather than left
 * unrepresented. */
function orderEventType(orderType: string): 'laboratory' | 'imaging' | 'procedure' {
  if (orderType === 'laboratory') return 'laboratory';
  if (orderType === 'imaging') return 'imaging';
  return 'procedure';
}

function diagnosisItem(d: DiagnosisRow): LifetimeRecordClinicalItemDto {
  return {
    id: d.id,
    code: d.conditionCode,
    display: d.conditionName,
    status: d.status,
    value: null,
    note: d.rationale,
  };
}

function orderItem(o: EncounterAggregate['clinicalOrders'][number]): LifetimeRecordClinicalItemDto {
  return {
    id: o.id,
    code: null,
    display: `${ORDER_TYPE_LABEL[o.type] ?? o.type}: ${o.justification}`,
    status: o.status,
    value: null,
    note: o.invalidSampleReason,
  };
}

function resultItem(
  result: NonNullable<EncounterAggregate['clinicalOrders'][number]['result']>,
): LifetimeRecordClinicalItemDto {
  return {
    id: result.orderId,
    code: null,
    display: result.summary,
    status: result.abnormal ? 'abnormal' : 'normal',
    value: null,
    note: null,
  };
}

function medicationItems(p: PrescriptionRow): LifetimeRecordClinicalItemDto[] {
  const medications = p.medications as unknown as PrescriptionMedication[];
  return medications.map((m, index) => ({
    id: `${p.id}:${index}`,
    code: null,
    display: m.name,
    status: null,
    value: `${m.dose} · ${m.durationDays} ngày`,
    note: null,
  }));
}

function documentItem(doc: DocumentRow): LifetimeRecordDocumentDto {
  return {
    id: doc.id,
    title: doc.fileName,
    // No contentType/signedAt column on ClinicalDocument, and no
    // GET /documents/:id/content endpoint exists yet to build a real
    // downloadUrl against — left null rather than fabricated.
    contentType: null,
    signedAt: null,
    downloadUrl: null,
  };
}

function sourceOf(e: EncounterAggregate): LifetimeRecordSourceDto {
  return {
    organizationId: e.organizationId,
    organizationName: e.organization.name,
    facilityId: e.clinicLocationId,
    facilityName: e.clinicLocation?.name ?? null,
    province: null,
    // Every event here originates inside this backend — cross-system
    // provenance (`system`, `sourceSystem`) is populated once the
    // POST .../imports pipeline (spec section 3, not yet built) writes
    // externally-sourced rows.
    system: null,
  };
}

function provenanceOf(sourceRecordId: string): LifetimeRecordProvenanceDto {
  return {
    sourceRecordId,
    sourceSystem: null,
    importedAt: null,
    lastVerifiedAt: null,
    integrityHash: null,
  };
}

export function collectDoctorIds(
  encounters: EncounterAggregate[],
  prescriptions: PrescriptionRow[],
  documents: DocumentRow[],
): string[] {
  const ids: string[] = [];
  for (const e of encounters) {
    for (const d of e.diagnoses) ids.push(d.doctorId);
    if (e.clinicalPlan) ids.push(e.clinicalPlan.doctorId);
    for (const o of e.clinicalOrders) {
      ids.push(o.orderedByDoctorId);
      if (o.result) ids.push(o.result.recordedBy);
    }
  }
  for (const p of prescriptions) ids.push(p.doctorId);
  for (const doc of documents) ids.push(doc.uploadedBy);
  return ids;
}

/**
 * Builds the flat, filterable events timeline. One `encounter` event per
 * visit aggregates everything that happened during it (matches the sample
 * response in LIFETIME_MEDICAL_RECORD_API.md section 2); each clinically
 * distinct item *also* gets its own standalone typed event so the `type`
 * query filter (diagnosis/prescription/laboratory/imaging/document/
 * care_plan) has something real to filter down to, per the frontend's
 * EVENT_TYPE_LABEL dropdown in LifetimeMedicalRecord.tsx.
 */
export function buildEvents(
  encounters: EncounterAggregate[],
  prescriptions: PrescriptionRow[],
  documents: DocumentRow[],
  userNames: Map<string, string>,
): LifetimeRecordEventDto[] {
  const prescriptionsByEncounter = new Map<string, PrescriptionRow[]>();
  for (const p of prescriptions) {
    const list = prescriptionsByEncounter.get(p.encounterId) ?? [];
    list.push(p);
    prescriptionsByEncounter.set(p.encounterId, list);
  }
  const documentsByEncounter = new Map<string, DocumentRow[]>();
  for (const doc of documents) {
    const list = documentsByEncounter.get(doc.encounterId) ?? [];
    list.push(doc);
    documentsByEncounter.set(doc.encounterId, list);
  }

  const events: LifetimeRecordEventDto[] = [];

  for (const e of encounters) {
    const encounterPrescriptions = prescriptionsByEncounter.get(e.id) ?? [];
    const encounterDocuments = documentsByEncounter.get(e.id) ?? [];
    const source = sourceOf(e);

    events.push({
      id: `encounter:${e.id}`,
      occurredAt: e.createdAt.toISOString(),
      endedAt: null,
      type: 'encounter',
      title: `Khám ${e.department}`,
      summary: e.clinicalPlan?.summary ?? null,
      status: e.status,
      specialty: e.department,
      practitionerName: e.currentDoctor?.displayName ?? null,
      source,
      diagnoses: e.diagnoses.filter((d) => d.status !== 'revised').map(diagnosisItem),
      medications: encounterPrescriptions.flatMap(medicationItems),
      orders: e.clinicalOrders.map(orderItem),
      results: e.clinicalOrders.filter((o) => o.result).map((o) => resultItem(o.result!)),
      procedures: [],
      documents: encounterDocuments.map(documentItem),
      provenance: provenanceOf(e.id),
    });

    for (const d of e.diagnoses) {
      events.push({
        id: `diagnosis:${d.id}`,
        occurredAt: d.recordedAt.toISOString(),
        endedAt: null,
        type: 'diagnosis',
        title: d.conditionName,
        summary: d.rationale,
        status: d.status,
        specialty: e.department,
        practitionerName: userNames.get(d.doctorId) ?? null,
        source,
        diagnoses: [diagnosisItem(d)],
        medications: [],
        orders: [],
        results: [],
        procedures: [],
        documents: [],
        provenance: provenanceOf(d.id),
      });
    }

    for (const p of encounterPrescriptions) {
      events.push({
        id: `prescription:${p.id}`,
        occurredAt: p.issuedAt.toISOString(),
        endedAt: null,
        type: 'prescription',
        title: 'Đơn thuốc',
        summary: null,
        status: null,
        specialty: e.department,
        practitionerName: userNames.get(p.doctorId) ?? null,
        source,
        diagnoses: [],
        medications: medicationItems(p),
        orders: [],
        results: [],
        procedures: [],
        documents: [],
        provenance: provenanceOf(p.id),
      });
    }

    for (const o of e.clinicalOrders) {
      events.push({
        id: `order:${o.id}`,
        occurredAt: o.createdAt.toISOString(),
        endedAt: null,
        type: orderEventType(o.type),
        title: `${ORDER_TYPE_LABEL[o.type] ?? o.type}: ${o.justification}`,
        summary: null,
        status: o.status,
        specialty: e.department,
        practitionerName: userNames.get(o.orderedByDoctorId) ?? null,
        source,
        diagnoses: [],
        medications: [],
        orders: [orderItem(o)],
        results: o.result ? [resultItem(o.result)] : [],
        procedures: [],
        documents: [],
        provenance: provenanceOf(o.id),
      });
    }

    for (const doc of encounterDocuments) {
      events.push({
        id: `document:${doc.id}`,
        occurredAt: doc.uploadedAt.toISOString(),
        endedAt: null,
        type: 'document',
        title: doc.fileName,
        summary: null,
        status: doc.reviewStatus,
        specialty: e.department,
        practitionerName: userNames.get(doc.uploadedBy) ?? null,
        source,
        diagnoses: [],
        medications: [],
        orders: [],
        results: [],
        procedures: [],
        documents: [documentItem(doc)],
        provenance: provenanceOf(doc.id),
      });
    }

    if (e.clinicalPlan) {
      const plan = e.clinicalPlan;
      events.push({
        id: `care_plan:${plan.id}`,
        occurredAt: plan.approvedAt.toISOString(),
        endedAt: null,
        type: 'care_plan',
        title: 'Kế hoạch điều trị',
        summary: plan.summary,
        status: null,
        specialty: e.department,
        practitionerName: userNames.get(plan.doctorId) ?? null,
        source,
        diagnoses: [],
        medications: [],
        orders: [],
        results: [],
        procedures: [],
        documents: [],
        provenance: provenanceOf(plan.id),
      });
    }
  }

  return events;
}

export function buildAllergyKnowledgeStateDto(
  latestAssessment: Awaited<
    ReturnType<LifetimeMedicalRecordRepository['findLatestAllergyKnowledgeAssessment']>
  >,
): AllergyKnowledgeStateDto {
  if (!latestAssessment) {
    return { state: 'unknown', assessedAt: null, assessedByUserId: null, organizationId: null };
  }
  return {
    state: latestAssessment.knowledgeState as AllergyKnowledgeStateDto['state'],
    assessedAt: latestAssessment.assessedAt.toISOString(),
    assessedByUserId: latestAssessment.assessedByUserId,
    organizationId: latestAssessment.organizationId,
  };
}

export function buildSummary(
  encounters: EncounterAggregate[],
  prescriptions: PrescriptionRow[],
  allergies: AllergyRow[],
  allergyKnowledgeState: AllergyKnowledgeStateDto,
): LifetimeRecordSummaryDto {
  const organizationIds = new Set(encounters.map((e) => e.organizationId));
  const facilityIds = new Set(
    encounters.filter((e) => e.clinicLocationId).map((e) => e.clinicLocationId as string),
  );
  const occurredAtMs = encounters.map((e) => e.createdAt.getTime());
  const first = occurredAtMs.length ? new Date(Math.min(...occurredAtMs)) : null;
  const last = occurredAtMs.length ? new Date(Math.max(...occurredAtMs)) : null;

  const activeByKey = new Map<string, DiagnosisRow>();
  for (const e of encounters) {
    for (const d of e.diagnoses) {
      if (d.status === 'revised' || d.status === 'none') continue;
      const key = d.conditionCode ?? d.conditionName;
      const existing = activeByKey.get(key);
      if (!existing || d.recordedAt > existing.recordedAt) activeByKey.set(key, d);
    }
  }

  let latestPrescription: PrescriptionRow | null = null;
  for (const p of prescriptions) {
    if (!latestPrescription || p.issuedAt > latestPrescription.issuedAt) latestPrescription = p;
  }

  return {
    encounterCount: encounters.length,
    organizationCount: organizationIds.size,
    facilityCount: facilityIds.size,
    firstRecordedAt: first?.toISOString() ?? null,
    lastRecordedAt: last?.toISOString() ?? null,
    activeConditions: [...activeByKey.values()].map(diagnosisItem),
    // Only include allergies that are active and not superseded/entered-in-error.
    allergies: allergies
      .filter(
        (a) =>
          a.active &&
          a.verificationStatus !== 'superseded' &&
          a.verificationStatus !== 'entered_in_error',
      )
      .map((a) => ({
        id: a.id,
        code: a.substanceCode,
        display: a.substance,
        status: a.verificationStatus,
        value: a.severity,
        note: a.reaction,
      })),
    currentMedications: latestPrescription ? medicationItems(latestPrescription) : [],
    allergyKnowledgeState,
  };
}

export function toAllergyDto(a: AllergyRow): AllergyIntoleranceDto {
  return {
    id: a.id,
    substance: a.substance,
    substanceCode: a.substanceCode,
    category: a.category,
    reaction: a.reaction,
    severity: a.severity,
    onsetDate: a.onsetDate ? a.onsetDate.toISOString().slice(0, 10) : null,
    effectiveAt: a.effectiveAt ? a.effectiveAt.toISOString() : null,
    verificationStatus: a.verificationStatus,
    verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
    verifiedByUserId: a.verifiedByUserId,
    note: a.note,
    active: a.active,
    recordedAt: a.recordedAt.toISOString(),
    sourceType: a.sourceType,
    organizationId: a.organizationId,
    clinicLocationId: a.clinicLocationId,
    encounterId: a.encounterId,
    supersedesId: a.supersedesId,
    enteredInErrorAt: a.enteredInErrorAt ? a.enteredInErrorAt.toISOString() : null,
  };
}

export function toVitalDto(v: VitalRow): VitalObservationDto {
  return {
    id: v.id,
    type: v.type,
    value: Number(v.value),
    unit: v.unit,
    observedAt: v.observedAt.toISOString(),
    recordedAt: v.recordedAt.toISOString(),
    sourceType: v.sourceType,
    organizationId: v.organizationId,
    clinicLocationId: v.clinicLocationId,
    encounterId: v.encounterId,
    method: v.method,
    note: v.note,
    bmiSourceHeightId: v.bmiSourceHeightId,
    bmiSourceWeightId: v.bmiSourceWeightId,
  };
}

export function toNarrativeDto(n: NarrativeRow | null): PatientProfileNarrativeDto | null {
  if (!n) return null;
  return {
    chiefComplaint: n.chiefComplaint,
    medicalHistory: n.medicalHistory,
    familyHistory: n.familyHistory,
    socialHistory: n.socialHistory,
    currentSymptoms: n.currentSymptoms,
    lifestyle: n.lifestyle,
    occupation: n.occupation,
    // PatientProfileNarrative is always patient-provided by design.
    isPatientProvided: true,
    updatedAt: n.updatedAt.toISOString(),
  };
}

export function toPatientDto(patient: PatientCore): LifetimeRecordPatientDto {
  return {
    id: patient.id,
    // Not a stored field yet (docs section 6 flags external identifiers as
    // a Phase-3/identity-matching concern) — always null until then.
    nationalHealthId: null,
    code: patient.code,
    name: patient.name,
    dob: patient.dob.toISOString().slice(0, 10),
    gender: patient.gender,
    bloodType: patient.bloodType,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    heightCm: patient.heightCm === null ? null : Number(patient.heightCm),
    weightKg: patient.weightKg === null ? null : Number(patient.weightKg),
  };
}
