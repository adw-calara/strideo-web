-- Phase 2C migration design: server-side profile bootstrap marker.
-- Purpose: preserve append-only migration history while pivoting away from the
-- failed auth.users trigger approach. Profile bootstrap is now performed by a
-- server-only application path using the existing public.profiles and
-- public.profile_roles tables.
-- Dependencies: 0002 extensions/types, 0007 profile tables, 0010/0014 RLS.
-- Execution note: no trigger, function, grant, policy, table, index, or data
-- changes are made in this migration. Browser clients still do not receive
-- profile_roles write access.

begin;

-- Intentionally no-op.
--
-- The original Phase 2C proposal attempted to create an after-insert trigger on
-- auth.users. Dev execution failed before the migration was recorded because
-- the execution role was not the owner of auth.users:
--
--   ERROR: 42501: must be owner of relation users
--
-- Since 0015 was never applied and exists only in this PR, it is replaced with
-- this marker migration. The server-side bootstrap implementation writes only
-- the authenticated current user's public.profiles row and baseline
-- public.profile_roles row with role 'user'. Operator/admin assignment remains
-- a separate server-owned process.

commit;
