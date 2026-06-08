-- Wave 3 import status read access.
-- Purpose: allow authenticated protected-app users to read sanitized import
-- batch status summaries while keeping raw source details and writes
-- server-owned.

begin;

grant select on table public.data_ingestion_batches to authenticated;

create policy data_ingestion_batches_select_authenticated
  on public.data_ingestion_batches for select
  to authenticated
  using (true);

commit;
