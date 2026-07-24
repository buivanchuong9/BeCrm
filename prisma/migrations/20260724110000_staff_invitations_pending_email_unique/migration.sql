-- StaffInvitationsService#invite does a read-then-write check ("is there
-- already a pending invitation for this email?") followed by a separate
-- INSERT. Two concurrent invites for the same email (double-click, two
-- admins, a retried request) can both pass the read before either write
-- commits, producing two pending invitations for one email. The existing
-- @@index([email, status]) on staff_invitations speeds up that read but does
-- not prevent the race — only a database constraint can, since it is
-- enforced atomically by Postgres regardless of application-layer timing.
--
-- Not modeled in schema.prisma: Prisma's schema DSL has no syntax for a
-- partial index (WHERE clause), so this constraint only exists via this
-- migration. Do not let a future `prisma migrate dev` "fix" the drift by
-- dropping it — see the comment on StaffInvitation in schema.prisma.
CREATE UNIQUE INDEX "staff_invitations_pending_email_key"
  ON "staff_invitations" ("email")
  WHERE "status" = 'pending';
