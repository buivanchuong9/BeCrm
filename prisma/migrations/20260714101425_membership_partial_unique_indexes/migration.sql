-- DropIndex
DROP INDEX "user_memberships_user_id_organization_id_clinic_location_id_key";

-- F-004: replace the dropped plain unique index with two partial unique
-- indexes. Postgres treats NULL as distinct per row in a normal unique
-- index/constraint, so a single (user_id, organization_id, clinic_location_id,
-- role) constraint can never dedupe org-wide memberships (clinic_location_id
-- IS NULL) — every org-wide row would silently be allowed to duplicate. Two
-- partial indexes close both cases explicitly:
--   1. clinic-scoped memberships: unique per (user, org, clinic, role)
--   2. org-wide memberships (no clinic): unique per (user, org, role)
-- Both are scoped to active memberships only, so a revoked membership never
-- blocks re-granting the same role later.
CREATE UNIQUE INDEX uniq_membership_clinic_scoped
  ON user_memberships (user_id, organization_id, clinic_location_id, role)
  WHERE status = 'active' AND clinic_location_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_membership_org_wide
  ON user_memberships (user_id, organization_id, role)
  WHERE status = 'active' AND clinic_location_id IS NULL;
