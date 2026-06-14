# Supabase Migration Workflow

This repo uses Supabase CLI timestamped migration filenames as the source of
truth:

```text
YYYYMMDDHHMMSS_snake_case_name.sql
```

Examples:

```text
20260610161128_0020_opportunity_read_access.sql
20260614131631_import_status_service_role_read_access.sql
```

## Rules

- Create migrations with `supabase migration new <snake_case_name>`.
- Do not hand-write migration filenames.
- Do not use legacy numeric-only prefixes such as `0021_feature.sql`.
- Do not rename applied migrations unless explicitly repairing local/remote drift.
- Keep migrations append-only and transactional with `begin;` and `commit;`.
- Confirm the target project before any remote operation:
  - Dev project: `strideo-dev`
  - Dev ref: `ntxtakbggtljjbalgris`
- Never apply migrations to production without explicit production authorization.

## Standard Flow

1. Create the migration:

   ```bash
   supabase migration new <snake_case_name>
   ```

2. Edit the generated SQL file.

3. Run local migration hygiene checks:

   ```bash
   npm run db:migrations:check
   ```

4. Inspect the SQL before execution.

5. Confirm linked Dev drift status:

   ```bash
   npm run db:migrations:dry-run
   ```

6. Apply only after explicit approval:

   ```bash
   supabase db push --linked
   ```

7. Verify after apply:

   ```bash
   npm run db:migrations:dry-run
   npm run verify
   ```

The dry run must report:

```text
Remote database is up to date.
```

## Connector Fallback

Prefer `supabase db push --linked` for prepared local migration files because it
preserves the local timestamp version in Supabase migration history.

If the Supabase connector is used to apply SQL directly:

1. Apply only the intended single migration.
2. Read remote migration history immediately.
3. Rename the local migration file to the exact remote version assigned by
   Supabase.
4. Run:

   ```bash
   npm run db:migrations:check
   npm run db:migrations:dry-run
   ```

Do not continue database work until local and remote migration versions match.

## Verification Scripts

```bash
npm run db:migrations:check
npm run db:migrations:dry-run
npm run verify
```

`npm run db:migrations:check` validates local migration filenames and basic SQL
wrapping. It does not connect to Supabase.

`npm run db:migrations:list` is available for detailed linked migration history
inspection. Linked Supabase database scripts load local, gitignored env files
such as `.env.local`; set `SUPABASE_DB_PASSWORD` locally before running
`npm run db:migrations:dry-run`, `npm run db:migrations:list`, or
`npm run db:lint`. Use `npm run db:migrations:dry-run` as the required drift
gate.
