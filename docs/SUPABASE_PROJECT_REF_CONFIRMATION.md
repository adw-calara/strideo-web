# Supabase Project Ref Confirmation

Status: CONFIRMED - DOCUMENTATION ONLY

Date: June 6, 2026

## Correct Project Ref

Correct Supabase Dev project ref: `ntxtakbggtljjbalgris`

Confirmed Supabase Dev URL: `https://ntxtakbggtljjbalgris.supabase.co`

Supabase project name: `strideo-dev`

## Incorrect Project Ref

Incorrect project ref: `ntxxtakbggtljjbalgris`

This value contains an extra `x` after `nt` and does not match the confirmed Supabase project URL or existing repository configuration.

## Evidence Reviewed

The correct ref was determined from:

- User-confirmed Supabase project URL: `https://ntxtakbggtljjbalgris.supabase.co`
- `.env.example`, which references `NEXT_PUBLIC_SUPABASE_URL=https://ntxtakbggtljjbalgris.supabase.co`
- `AGENTS.md`, which identifies `strideo-dev` with ref `ntxtakbggtljjbalgris`
- Existing Phase 1C and Phase 1E migration execution planning docs
- Repo-wide search results for both refs

Connected Supabase project metadata was not available in this Codex session because Supabase MCP tools are still not exposed. No live Supabase queries were run.

## Where The Incorrect Ref Appeared

The incorrect ref appeared only in Phase 1F blocker documentation created after the MCP/CLI execution blocker:

- `docs/PHASE1F_EXECUTION_BLOCKER.md`
- `docs/PHASE1F_DEV_MIGRATION_EXECUTION_REPORT.md`

No migration files, application code, or environment templates used the incorrect ref.

## Files Updated

- `docs/PHASE1F_EXECUTION_BLOCKER.md`
- `docs/PHASE1F_DEV_MIGRATION_EXECUTION_REPORT.md`
- `docs/SUPABASE_PROJECT_REF_CONFIRMATION.md`

## Dev Project Confirmation

The confirmed Supabase Dev project is:

- Project name: `strideo-dev`
- Project ref: `ntxtakbggtljjbalgris`
- Project URL: `https://ntxtakbggtljjbalgris.supabase.co`

Future migration execution must target this Dev project only.

## Production Confirmation

Production is not involved.

This documentation update does not identify, configure, or target any production Supabase project. No migrations were applied, no tables were created, and no live database changes were made.

## Next Step Before Execution

Before Phase 1F execution resumes, the operator must re-confirm the target project in the active execution tool:

- MCP path: list projects and select `strideo-dev` with ref `ntxtakbggtljjbalgris`
- CLI path: verify linked project ref is `ntxtakbggtljjbalgris`
- Direct SQL path: verify hostname/project ref matches `ntxtakbggtljjbalgris`
- SQL Editor path: verify dashboard project name and ref before every migration
