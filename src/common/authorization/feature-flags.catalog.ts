export interface FeatureFlagDefinition {
  key: string;
  description: string;
  enabledDefault: boolean;
}

/**
 * Static catalog of platform feature flags — the "Feature Flag" box of the
 * Role + Permission + Resource Scope + Feature Flag decision. Seeded once;
 * an Owner changes behavior at runtime via `FeatureFlagOverride`
 * (per-organization), never by editing this file per clinic.
 */
export const FEATURE_FLAGS = {
  AI_PRELIMINARY_ASSESSMENT: 'ai_preliminary_assessment',
  TELEMEDICINE_VISITS: 'telemedicine_visits',
  WORKFLOW_BPM: 'workflow_bpm',
  BREAK_GLASS_ACCESS: 'break_glass_access',
  KIOSK_SELF_CHECKIN: 'kiosk_self_checkin',
} as const;

export const FEATURE_FLAG_CATALOG: FeatureFlagDefinition[] = [
  {
    key: FEATURE_FLAGS.AI_PRELIMINARY_ASSESSMENT,
    description: 'AI preliminary assessment during symptom intake.',
    enabledDefault: true,
  },
  {
    key: FEATURE_FLAGS.TELEMEDICINE_VISITS,
    description: 'Video-mode appointments.',
    enabledDefault: true,
  },
  {
    key: FEATURE_FLAGS.WORKFLOW_BPM,
    description: 'Workflow/BPM template activation on encounters.',
    enabledDefault: true,
  },
  {
    key: FEATURE_FLAGS.BREAK_GLASS_ACCESS,
    description:
      'Whether an Owner may request emergency break-glass read access to clinical records in this organization at all.',
    enabledDefault: true,
  },
  {
    key: FEATURE_FLAGS.KIOSK_SELF_CHECKIN,
    description: 'QR self check-in via reception kiosk devices.',
    enabledDefault: true,
  },
];
