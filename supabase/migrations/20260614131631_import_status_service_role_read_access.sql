-- Wave 3 import status read access hardening.
-- Purpose: remove direct authenticated Data API reads from
-- public.data_ingestion_batches so raw metadata remains server-only, while
-- allowing the Next.js server-only import status reader to fetch and sanitize
-- display fields with the service-role client.
-- Dependencies: 0019_import_status_read_access.sql.
-- Execution note: append-only migration. Do not apply to production without
-- explicit production authorization.

begin;

revoke select on table public.data_ingestion_batches from anon;
revoke select on table public.data_ingestion_batches from authenticated;

drop policy if exists data_ingestion_batches_select_authenticated
  on public.data_ingestion_batches;

grant select on table public.data_ingestion_batches to service_role;

comment on table public.data_ingestion_batches is
  'Server-owned ingestion batch metadata. Protected UI reads must use server-only sanitization; authenticated browser clients must not receive direct table access.';

commit;
