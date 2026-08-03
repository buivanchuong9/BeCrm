/**
 * Single source of truth for the one approved DermaTimeline demo case.
 * Shared by scripts/seed-demo-derma-timeline.ts (creates the patient,
 * lesion, observations and ORIGINAL images) and DemoImageAnalysisAdapter
 * (recognizes this lesion and only this lesion as eligible for simulated
 * image analysis). Keeping this as a constant — rather than a DB flag or
 * naming convention — makes the "approved seeded demo case" condition in
 * the spec explicit and grep-able.
 */
export const DEMO_LESION_ID = 'd0000000-0000-4000-8000-00000000de01';
export const DEMO_PATIENT_CODE = 'BN-DERMA-DEMO';
export const DEMO_LESION_CODE = 'L-DEMO0001';
export const DEMO_BASELINE_OBSERVATION_ID = 'd0000000-0000-4000-8000-00000000de02';
export const DEMO_TARGET_OBSERVATION_ID = 'd0000000-0000-4000-8000-00000000de03';

/** Visual parameters shared by the PNG fixture generator and the demo
 * adapter's deterministic metrics, so the numbers displayed always match
 * what the seeded images actually show. */
export const DEMO_IMAGE_SIZE = 480;
export const DEMO_THUMBNAIL_SIZE = 96;
export const DEMO_BASELINE_LESION_RADIUS = 90;
export const DEMO_TARGET_LESION_RADIUS = 62;

export const DEMO_MODEL_NAME = 'derma-timeline-demo-analysis';
export const DEMO_MODEL_VERSION = '1.0.0-demo';
export const DEMO_ALGORITHM_VERSION = 'seeded-fixture-comparison/1.0.0';

export const DEMO_SIMULATED_DISCLAIMER =
  'Kết quả mô phỏng dùng cho mục đích trình diễn (demo), không phải phân tích AI lâm sàng thật.';
