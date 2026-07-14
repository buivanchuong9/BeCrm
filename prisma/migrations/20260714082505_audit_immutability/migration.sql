-- Append-only enforcement for audit_events (spec section 35: "Application APIs
-- cannot update/delete audit rows"). A trigger is used rather than relying only
-- on application code, so even a bug or a direct psql session under the app
-- role cannot silently mutate history.

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Idempotency records and outbox events are operational (not clinical/audit)
-- state and may legitimately be updated by the application (status transitions,
-- response caching, retry bookkeeping) or pruned by a retention job — no
-- append-only trigger is applied to them.