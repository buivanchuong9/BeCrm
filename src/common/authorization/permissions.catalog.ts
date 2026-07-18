import { UserRole } from '@prisma/client';

/**
 * Static permission catalog + default role→permission matrix. This is the
 * "Role + Permission" half of the authorization decision (the other half —
 * Resource Scope and Feature Flag — is evaluated per-request by
 * PolicyEngine, never baked into this table).
 *
 * The matrix is code, not data, on purpose: it is seeded into `RolePermission`
 * (see prisma/seed/permissions.seed.ts) so an Owner can extend/revoke a
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
 * (diagnosis/order/record/encounter-transition) — that gap is intentional,
 * not an oversight: Owners reach clinical data only through a
 * BreakGlassGrant, never through a standing permission. See RolesGuard /
 * PolicyEngine doc comments.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_administrator: [
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
  patient: [APPOINTMENT_BOOK, CHECKIN_QR_REDEEM, CONSENT_MANAGE_SELF],
  doctor: [
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
    PATIENT_READ_ASSIGNED,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_TRANSITION,
    WORKFLOW_TASK_EXECUTE,
  ],
  receptionist: [
    PATIENT_READ_ORG,
    PATIENT_WRITE_CONTACT,
    APPOINTMENT_BOOK,
    APPOINTMENT_MANAGE,
    CHECKIN_QR_REDEEM,
    QUEUE_VIEW,
    QUEUE_CALL,
    ENCOUNTER_CREATE,
  ],
  lab_technician: [QUEUE_VIEW, CLINICAL_ORDER_RESULT, WORKFLOW_TASK_EXECUTE],
  imaging_technician: [QUEUE_VIEW, CLINICAL_ORDER_RESULT, WORKFLOW_TASK_EXECUTE],
  pharmacist: [QUEUE_VIEW, WORKFLOW_TASK_EXECUTE],
  care_coordinator: [PATIENT_READ_ASSIGNED, QUEUE_VIEW, WORKFLOW_TASK_EXECUTE],
  customer_care_employee: [PATIENT_READ_ORG],
  medical_administrator: [
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
  system_administrator: [CLINIC_MANAGE, FEATURE_FLAG_TOGGLE, AUDIT_VIEW],
  clinical_process_designer: [WORKFLOW_TEMPLATE_AUTHOR],
};
