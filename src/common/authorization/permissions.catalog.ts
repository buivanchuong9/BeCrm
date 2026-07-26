import { UserRole } from '@prisma/client';

/**
 * Static permission catalog + default role→permission matrix. This is the
 * "Role + Permission" half of the authorization decision (the other half —
 * Resource Scope and Feature Flag — is evaluated per-request by
 * PolicyEngine, never baked into this table).
 *
 * The matrix is code, not tenant/clinical data: it is initialized into
 * `RolePermission` (see prisma/seed/index.ts) so an Owner can extend/revoke a
 * mapping at runtime via `POST/DELETE /owner/role-permissions`, but the
 * *default* shape of what each role can do is a reviewed code change, not a
 * runtime toggle a single click can silently widen.
 */
export interface PermissionDefinition {
  code: string;
  description: string;
  /** Practically unobtainable via a plain role check — only ever exercised
   * through DangerousActionsService after a 2-of-4 Owner quorum executes. */
  dangerous?: boolean;
}

export const PERMISSIONS = {
  // Module visibility. These govern navigation/page discovery; action
  // permissions below still authorize the concrete API operation.
  MODULE_DASHBOARD_VIEW: 'module.dashboard.view',
  MODULE_APPOINTMENTS_ACCESS: 'module.appointments.access',
  MODULE_PROFILE_ACCESS: 'module.profile.access',
  MODULE_AI_ANALYSIS_ACCESS: 'module.ai_analysis.access',
  MODULE_JOURNEY_ACCESS: 'module.journey.access',
  MODULE_DOCTOR_REVIEW_ACCESS: 'module.doctor_review.access',
  MODULE_WORK_QUEUE_ACCESS: 'module.work_queue.access',
  MODULE_WORKFLOW_DESIGN_ACCESS: 'module.workflow_design.access',
  MODULE_RECORDS_ACCESS: 'module.records.access',
  MODULE_PROGRESS_ACCESS: 'module.progress.access',
  MODULE_CARE_ACCESS: 'module.care.access',
  MODULE_PRESCRIPTIONS_ACCESS: 'module.prescriptions.access',
  MODULE_REPORTS_ACCESS: 'module.reports.access',
  MODULE_CHECKIN_ACCESS: 'module.checkin.access',
  MODULE_RECEPTION_ACCESS: 'module.reception.access',
  MODULE_QUEUE_ACCESS: 'module.queue.access',
  MODULE_AUDIT_ACCESS: 'module.audit.access',
  MODULE_INTEGRATIONS_ACCESS: 'module.integrations.access',
  MODULE_STAFF_ACCESS: 'module.staff.access',
  MODULE_PRACTITIONER_SCHEDULE_ACCESS: 'module.practitioner_schedule.access',
  MODULE_OWNER_ACCESS: 'module.owner.access',
  MODULE_SETTINGS_ACCESS: 'module.settings.access',
  MODULE_SUPPORT_ACCESS: 'module.support.access',

  // Patients / clinical data
  PATIENT_READ_ASSIGNED: 'patient.read.assigned',
  PATIENT_READ_ORG: 'patient.read.organization',
  PATIENT_WRITE_CONTACT: 'patient.write.contact',
  PATIENT_WRITE_CLINICAL: 'patient.write.clinical',
  CONSENT_MANAGE_SELF: 'consent.manage.self',

  // Appointments / QR / queue
  APPOINTMENT_BOOK: 'appointment.book',
  APPOINTMENT_MANAGE: 'appointment.manage',
  CHECKIN_QR_REDEEM: 'checkin.qr_redeem',
  QUEUE_VIEW: 'queue.view',
  QUEUE_CALL: 'queue.call',

  // Encounters / clinical authorship
  ENCOUNTER_CREATE: 'encounter.create',
  ENCOUNTER_TRANSITION: 'encounter.transition',
  ENCOUNTER_CLOSE: 'encounter.close',
  DIAGNOSIS_CREATE: 'diagnosis.create',
  CLINICAL_ORDER_CREATE: 'clinical_order.create',
  CLINICAL_ORDER_RESULT: 'clinical_order.result',
  CLINICAL_PLAN_APPROVE: 'clinical_plan.approve',
  RECORD_SIGN: 'record.sign',
  WORKFLOW_TASK_EXECUTE: 'workflow_task.execute',
  WORKFLOW_TEMPLATE_AUTHOR: 'workflow_template.author',
  WORKFLOW_TEMPLATE_PUBLISH: 'workflow_template.publish',

  // Identity / platform administration (Owner "một owner tự làm được")
  USER_INVITE: 'user.invite',
  USER_LOCK: 'user.lock',
  USER_ROLE_ASSIGN: 'user.role.assign',
  CLINIC_MANAGE: 'clinic.manage',
  FEATURE_FLAG_TOGGLE: 'feature_flag.toggle',
  AUDIT_VIEW: 'audit.view',
  BREAK_GLASS_REQUEST: 'break_glass.request',
  DANGEROUS_ACTION_PROPOSE: 'dangerous_action.propose',
  DANGEROUS_ACTION_APPROVE: 'dangerous_action.approve',

  // Dangerous actions themselves — never granted by a role check; only
  // reachable via DangerousActionsService after quorum (see class doc).
  OWNER_ADD: 'owner.add',
  SECURITY_REVOKE_ALL_SESSIONS: 'security.revoke_all_sessions',
  DIRECTORY_EXPORT_BULK: 'directory.export_bulk',
  MEMBERSHIP_REVOKE_BULK: 'membership.revoke_bulk',
  AUDIT_DISABLE: 'audit.disable',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    code: PERMISSIONS.MODULE_DASHBOARD_VIEW,
    description: 'Open the operational dashboard module.',
  },
  {
    code: PERMISSIONS.MODULE_APPOINTMENTS_ACCESS,
    description: 'Open appointment list and appointment detail screens.',
  },
  {
    code: PERMISSIONS.MODULE_PROFILE_ACCESS,
    description: 'Open the patient profile screen.',
  },
  {
    code: PERMISSIONS.MODULE_AI_ANALYSIS_ACCESS,
    description: 'Open the patient AI skin-analysis module.',
  },
  {
    code: PERMISSIONS.MODULE_JOURNEY_ACCESS,
    description: 'Open patient/encounter journey screens.',
  },
  {
    code: PERMISSIONS.MODULE_DOCTOR_REVIEW_ACCESS,
    description: 'Open doctor review and diagnosis screens.',
  },
  {
    code: PERMISSIONS.MODULE_WORK_QUEUE_ACCESS,
    description: 'Open the workflow work-queue module.',
  },
  {
    code: PERMISSIONS.MODULE_WORKFLOW_DESIGN_ACCESS,
    description: 'Open workflow template design screens.',
  },
  {
    code: PERMISSIONS.MODULE_RECORDS_ACCESS,
    description: 'Open lifetime medical-record screens.',
  },
  {
    code: PERMISSIONS.MODULE_PROGRESS_ACCESS,
    description: 'Open treatment-progress tracking screens.',
  },
  {
    code: PERMISSIONS.MODULE_CARE_ACCESS,
    description: 'Open post-visit care and CRM screens.',
  },
  {
    code: PERMISSIONS.MODULE_PRESCRIPTIONS_ACCESS,
    description: 'Open prescription screens.',
  },
  {
    code: PERMISSIONS.MODULE_REPORTS_ACCESS,
    description: 'Open patient and operational report screens.',
  },
  {
    code: PERMISSIONS.MODULE_CHECKIN_ACCESS,
    description: 'Open reception QR check-in screens.',
  },
  {
    code: PERMISSIONS.MODULE_RECEPTION_ACCESS,
    description: 'Open the reception operations center.',
  },
  {
    code: PERMISSIONS.MODULE_QUEUE_ACCESS,
    description: 'Open queue control and station screens.',
  },
  {
    code: PERMISSIONS.MODULE_AUDIT_ACCESS,
    description: 'Open audit-log screens.',
  },
  {
    code: PERMISSIONS.MODULE_INTEGRATIONS_ACCESS,
    description: 'Open integration health/status screens.',
  },
  {
    code: PERMISSIONS.MODULE_STAFF_ACCESS,
    description: 'Open staff-management screens.',
  },
  {
    code: PERMISSIONS.MODULE_PRACTITIONER_SCHEDULE_ACCESS,
    description: 'Open practitioner schedule screens.',
  },
  {
    code: PERMISSIONS.MODULE_OWNER_ACCESS,
    description: 'Open Owner Control Center.',
  },
  {
    code: PERMISSIONS.MODULE_SETTINGS_ACCESS,
    description: 'Open personal and platform settings.',
  },
  {
    code: PERMISSIONS.MODULE_SUPPORT_ACCESS,
    description: 'Open support and help screens.',
  },
  {
    code: PERMISSIONS.PATIENT_READ_ASSIGNED,
    description: 'Read patients on the caller’s own care team.',
  },
  {
    code: PERMISSIONS.PATIENT_READ_ORG,
    description: 'Read any patient within the caller’s organization.',
  },
  {
    code: PERMISSIONS.PATIENT_WRITE_CONTACT,
    description: 'Edit a patient’s contact fields (phone/email/address).',
  },
  {
    code: PERMISSIONS.PATIENT_WRITE_CLINICAL,
    description:
      'Reassign clinical/administrative patient fields (primary doctor, blood type, etc.).',
  },
  { code: PERMISSIONS.CONSENT_MANAGE_SELF, description: 'Grant/withdraw one’s own consent.' },
  {
    code: PERMISSIONS.APPOINTMENT_BOOK,
    description: 'Book an appointment for self or on behalf of a patient.',
  },
  {
    code: PERMISSIONS.APPOINTMENT_MANAGE,
    description: 'Cancel/reschedule/mark-missed appointments.',
  },
  {
    code: PERMISSIONS.CHECKIN_QR_REDEEM,
    description: 'Redeem a QR check-in token at a kiosk device.',
  },
  { code: PERMISSIONS.QUEUE_VIEW, description: 'View the clinic work queue.' },
  { code: PERMISSIONS.QUEUE_CALL, description: 'Call-next / advance a queue ticket.' },
  { code: PERMISSIONS.ENCOUNTER_CREATE, description: 'Create a walk-in/follow-up encounter.' },
  {
    code: PERMISSIONS.ENCOUNTER_TRANSITION,
    description: 'Drive an encounter through its state machine.',
  },
  { code: PERMISSIONS.ENCOUNTER_CLOSE, description: 'Close an encounter.' },
  { code: PERMISSIONS.DIAGNOSIS_CREATE, description: 'Record or revise a doctor diagnosis.' },
  { code: PERMISSIONS.CLINICAL_ORDER_CREATE, description: 'Order a lab/imaging/consultation.' },
  { code: PERMISSIONS.CLINICAL_ORDER_RESULT, description: 'Record a clinical order result.' },
  { code: PERMISSIONS.CLINICAL_PLAN_APPROVE, description: 'Approve a clinical plan.' },
  { code: PERMISSIONS.RECORD_SIGN, description: 'Sign/reopen a medical record.' },
  { code: PERMISSIONS.WORKFLOW_TASK_EXECUTE, description: 'Claim/complete a workflow task.' },
  { code: PERMISSIONS.WORKFLOW_TEMPLATE_AUTHOR, description: 'Author a workflow template draft.' },
  {
    code: PERMISSIONS.WORKFLOW_TEMPLATE_PUBLISH,
    description: 'Publish/archive a workflow template.',
  },
  {
    code: PERMISSIONS.USER_INVITE,
    description: 'Invite a new staff account (email + role + clinic + department).',
  },
  { code: PERMISSIONS.USER_LOCK, description: 'Suspend/reactivate a user account.' },
  { code: PERMISSIONS.USER_ROLE_ASSIGN, description: 'Grant or revoke a role membership.' },
  { code: PERMISSIONS.CLINIC_MANAGE, description: 'Manage organizations/clinics/departments.' },
  {
    code: PERMISSIONS.FEATURE_FLAG_TOGGLE,
    description: 'Toggle a feature flag globally or per organization.',
  },
  { code: PERMISSIONS.AUDIT_VIEW, description: 'View the audit event log.' },
  {
    code: PERMISSIONS.BREAK_GLASS_REQUEST,
    description: 'Request emergency read access to a patient record.',
  },
  {
    code: PERMISSIONS.DANGEROUS_ACTION_PROPOSE,
    description: 'Propose a dangerous action for Owner quorum.',
  },
  {
    code: PERMISSIONS.DANGEROUS_ACTION_APPROVE,
    description: 'Approve/reject a pending dangerous action.',
  },
  { code: PERMISSIONS.OWNER_ADD, description: 'Add a new platform Owner.', dangerous: true },
  {
    code: PERMISSIONS.SECURITY_REVOKE_ALL_SESSIONS,
    description: 'Revoke every active session platform-wide.',
    dangerous: true,
  },
  {
    code: PERMISSIONS.DIRECTORY_EXPORT_BULK,
    description: 'Export an organization’s full user/membership directory.',
    dangerous: true,
  },
  {
    code: PERMISSIONS.MEMBERSHIP_REVOKE_BULK,
    description: 'Revoke every active non-Owner membership in an organization.',
    dangerous: true,
  },
  {
    code: PERMISSIONS.AUDIT_DISABLE,
    description:
      'Time-boxed suppression of non-critical audit noise (never security/break-glass/governance events — see AuditService).',
    dangerous: true,
  },
];

const {
  MODULE_DASHBOARD_VIEW,
  MODULE_APPOINTMENTS_ACCESS,
  MODULE_PROFILE_ACCESS,
  MODULE_AI_ANALYSIS_ACCESS,
  MODULE_JOURNEY_ACCESS,
  MODULE_DOCTOR_REVIEW_ACCESS,
  MODULE_WORK_QUEUE_ACCESS,
  MODULE_WORKFLOW_DESIGN_ACCESS,
  MODULE_RECORDS_ACCESS,
  MODULE_PROGRESS_ACCESS,
  MODULE_CARE_ACCESS,
  MODULE_PRESCRIPTIONS_ACCESS,
  MODULE_REPORTS_ACCESS,
  MODULE_CHECKIN_ACCESS,
  MODULE_RECEPTION_ACCESS,
  MODULE_QUEUE_ACCESS,
  MODULE_AUDIT_ACCESS,
  MODULE_INTEGRATIONS_ACCESS,
  MODULE_STAFF_ACCESS,
  MODULE_PRACTITIONER_SCHEDULE_ACCESS,
  MODULE_OWNER_ACCESS,
  MODULE_SETTINGS_ACCESS,
  MODULE_SUPPORT_ACCESS,
  PATIENT_READ_ASSIGNED,
  PATIENT_READ_ORG,
  PATIENT_WRITE_CONTACT,
  PATIENT_WRITE_CLINICAL,
  CONSENT_MANAGE_SELF,
  APPOINTMENT_BOOK,
  APPOINTMENT_MANAGE,
  CHECKIN_QR_REDEEM,
  QUEUE_VIEW,
  QUEUE_CALL,
  ENCOUNTER_CREATE,
  ENCOUNTER_TRANSITION,
  ENCOUNTER_CLOSE,
  DIAGNOSIS_CREATE,
  CLINICAL_ORDER_CREATE,
  CLINICAL_ORDER_RESULT,
  CLINICAL_PLAN_APPROVE,
  RECORD_SIGN,
  WORKFLOW_TASK_EXECUTE,
  WORKFLOW_TEMPLATE_AUTHOR,
  WORKFLOW_TEMPLATE_PUBLISH,
  USER_INVITE,
  USER_LOCK,
  USER_ROLE_ASSIGN,
  CLINIC_MANAGE,
  FEATURE_FLAG_TOGGLE,
  AUDIT_VIEW,
  BREAK_GLASS_REQUEST,
  DANGEROUS_ACTION_PROPOSE,
  DANGEROUS_ACTION_APPROVE,
} = PERMISSIONS;

/**
 * Default role → permission grants. `super_administrator` (Platform Owner)
 * deliberately holds none of the clinical-authorship permissions
 * (diagnosis/order/record/clinical_plan.approve/encounter-transition) — that
 * gap is intentional, not an oversight: Owners reach clinical data only
 * through a BreakGlassGrant, never through a standing permission. See
 * RolesGuard / PolicyEngine doc comments.
 *
 * Nor does it hold the 5 `dangerous: true` permissions (owner.add,
 * security.revoke_all_sessions, directory.export_bulk,
 * membership.revoke_bulk, audit.disable) — those are only ever exercised
 * through DangerousActionsService's 2-of-4 Owner quorum, never a standing
 * role grant (RolePermissionsService.grant() rejects them outright).
 *
 * Everything else — every non-clinical-authorship, non-dangerous permission
 * in the catalog — is granted here so an Owner can operate/administer every
 * department (patients, scheduling, queue, workflow authoring, identity,
 * platform config) without needing a per-feature runtime toggle.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_administrator: [
    MODULE_DASHBOARD_VIEW,
    MODULE_APPOINTMENTS_ACCESS,
    MODULE_PROFILE_ACCESS,
    MODULE_AI_ANALYSIS_ACCESS,
    MODULE_JOURNEY_ACCESS,
    MODULE_DOCTOR_REVIEW_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_WORKFLOW_DESIGN_ACCESS,
    MODULE_RECORDS_ACCESS,
    MODULE_PROGRESS_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_PRESCRIPTIONS_ACCESS,
    MODULE_REPORTS_ACCESS,
    MODULE_CHECKIN_ACCESS,
    MODULE_RECEPTION_ACCESS,
    MODULE_QUEUE_ACCESS,
    MODULE_AUDIT_ACCESS,
    MODULE_INTEGRATIONS_ACCESS,
    MODULE_STAFF_ACCESS,
    MODULE_PRACTITIONER_SCHEDULE_ACCESS,
    MODULE_OWNER_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ASSIGNED,
    PATIENT_READ_ORG,
    PATIENT_WRITE_CONTACT,
    PATIENT_WRITE_CLINICAL,
    CONSENT_MANAGE_SELF,
    APPOINTMENT_BOOK,
    APPOINTMENT_MANAGE,
    CHECKIN_QR_REDEEM,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_CREATE,
    ENCOUNTER_CLOSE,
    WORKFLOW_TASK_EXECUTE,
    WORKFLOW_TEMPLATE_AUTHOR,
    WORKFLOW_TEMPLATE_PUBLISH,
    USER_INVITE,
    USER_LOCK,
    USER_ROLE_ASSIGN,
    CLINIC_MANAGE,
    FEATURE_FLAG_TOGGLE,
    AUDIT_VIEW,
    BREAK_GLASS_REQUEST,
    DANGEROUS_ACTION_PROPOSE,
    DANGEROUS_ACTION_APPROVE,
  ],
  patient: [
    MODULE_DASHBOARD_VIEW,
    MODULE_APPOINTMENTS_ACCESS,
    MODULE_PROFILE_ACCESS,
    MODULE_AI_ANALYSIS_ACCESS,
    MODULE_JOURNEY_ACCESS,
    MODULE_RECORDS_ACCESS,
    MODULE_PROGRESS_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_PRESCRIPTIONS_ACCESS,
    MODULE_REPORTS_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    APPOINTMENT_BOOK,
    CHECKIN_QR_REDEEM,
    CONSENT_MANAGE_SELF,
  ],
  doctor: [
    MODULE_DASHBOARD_VIEW,
    MODULE_APPOINTMENTS_ACCESS,
    MODULE_JOURNEY_ACCESS,
    MODULE_DOCTOR_REVIEW_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_RECORDS_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_PRESCRIPTIONS_ACCESS,
    MODULE_PRACTITIONER_SCHEDULE_ACCESS,
    MODULE_AUDIT_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ASSIGNED,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_TRANSITION,
    ENCOUNTER_CLOSE,
    DIAGNOSIS_CREATE,
    CLINICAL_ORDER_CREATE,
    CLINICAL_PLAN_APPROVE,
    RECORD_SIGN,
    WORKFLOW_TASK_EXECUTE,
    WORKFLOW_TEMPLATE_AUTHOR,
  ],
  nurse: [
    MODULE_DASHBOARD_VIEW,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_RECORDS_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ASSIGNED,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_TRANSITION,
    WORKFLOW_TASK_EXECUTE,
  ],
  receptionist: [
    MODULE_DASHBOARD_VIEW,
    MODULE_APPOINTMENTS_ACCESS,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_CHECKIN_ACCESS,
    MODULE_RECEPTION_ACCESS,
    MODULE_QUEUE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ORG,
    PATIENT_WRITE_CONTACT,
    APPOINTMENT_BOOK,
    APPOINTMENT_MANAGE,
    CHECKIN_QR_REDEEM,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_CREATE,
  ],
  lab_technician: [
    MODULE_DASHBOARD_VIEW,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    QUEUE_VIEW,
    CLINICAL_ORDER_RESULT,
    WORKFLOW_TASK_EXECUTE,
  ],
  imaging_technician: [
    MODULE_DASHBOARD_VIEW,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    QUEUE_VIEW,
    CLINICAL_ORDER_RESULT,
    WORKFLOW_TASK_EXECUTE,
  ],
  pharmacist: [
    MODULE_DASHBOARD_VIEW,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_PRESCRIPTIONS_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    QUEUE_VIEW,
    WORKFLOW_TASK_EXECUTE,
  ],
  care_coordinator: [
    MODULE_DASHBOARD_VIEW,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ASSIGNED,
    QUEUE_VIEW,
    WORKFLOW_TASK_EXECUTE,
  ],
  customer_care_employee: [
    MODULE_DASHBOARD_VIEW,
    MODULE_CARE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ORG,
  ],
  medical_administrator: [
    MODULE_DASHBOARD_VIEW,
    MODULE_APPOINTMENTS_ACCESS,
    MODULE_JOURNEY_ACCESS,
    MODULE_WORK_QUEUE_ACCESS,
    MODULE_WORKFLOW_DESIGN_ACCESS,
    MODULE_RECORDS_ACCESS,
    MODULE_CARE_ACCESS,
    MODULE_REPORTS_ACCESS,
    MODULE_CHECKIN_ACCESS,
    MODULE_RECEPTION_ACCESS,
    MODULE_QUEUE_ACCESS,
    MODULE_AUDIT_ACCESS,
    MODULE_INTEGRATIONS_ACCESS,
    MODULE_STAFF_ACCESS,
    MODULE_PRACTITIONER_SCHEDULE_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    PATIENT_READ_ORG,
    PATIENT_WRITE_CONTACT,
    PATIENT_WRITE_CLINICAL,
    APPOINTMENT_MANAGE,
    QUEUE_VIEW,
    ENCOUNTER_CREATE,
    ENCOUNTER_CLOSE,
    WORKFLOW_TEMPLATE_AUTHOR,
    WORKFLOW_TEMPLATE_PUBLISH,
    USER_LOCK,
    AUDIT_VIEW,
  ],
  system_administrator: [
    MODULE_DASHBOARD_VIEW,
    MODULE_REPORTS_ACCESS,
    MODULE_INTEGRATIONS_ACCESS,
    MODULE_AUDIT_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    CLINIC_MANAGE,
    FEATURE_FLAG_TOGGLE,
    AUDIT_VIEW,
  ],
  clinical_process_designer: [
    MODULE_DASHBOARD_VIEW,
    MODULE_WORKFLOW_DESIGN_ACCESS,
    MODULE_SETTINGS_ACCESS,
    MODULE_SUPPORT_ACCESS,
    WORKFLOW_TEMPLATE_AUTHOR,
  ],
};
