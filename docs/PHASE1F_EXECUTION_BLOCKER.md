# Phase 1F Execution Blocker

Status: BLOCKED - NO LIVE DATABASE CHANGES MADE

Date: June 6, 2026

## Current Blocker

Phase 1F Supabase Dev migration execution cannot proceed in the current Codex session because the required live execution path is unavailable:

- Supabase MCP tools are not exposed in this session.
- The local Supabase CLI is not installed on `PATH`.
- No authenticated direct Postgres connection string has been provided.

No migrations were applied. No Supabase Dev tables were created. No live database changes were made.

## Supabase Project

Confirmed Supabase Dev project ref: `ntxtakbggtljjbalgris`

Confirmed Supabase Dev URL: `https://ntxtakbggtljjbalgris.supabase.co`

Pre-execution note: a prior Phase 1F blocker request contained the typo `ntxxtakbggtljjbalgris`. The correct project ref is `ntxtakbggtljjbalgris`, confirmed by the Supabase project URL, `.env.example`, `AGENTS.md`, and existing migration execution planning docs.

## Required Execution Options

### Option A: Reconnect Supabase MCP Tools In Codex

Reconnect the Supabase MCP tools in Codex and execute migrations through MCP against the confirmed Supabase Dev project only.

Risks:

- OAuth/session state may connect to the wrong browser profile or organization.
- MCP tools may not expose project settings needed for every pre-check.
- A project-ref typo could target the wrong project if not verified through project listing before execution.

Exact next steps:

1. Reconnect Supabase MCP in Codex using the account with access to `strideo-dev`.
2. List Supabase projects through MCP.
3. Confirm the project name is `strideo-dev`.
4. Confirm the exact project ref before running any SQL.
5. Confirm automatic table exposure is off.
6. Confirm no application tables currently exist.
7. Apply migrations `0001` through `0012` one at a time.
8. Stop immediately on the first migration error.
9. Run the Phase 1F verification queries and record results.

### Option B: Install Supabase CLI Locally

Install the Supabase CLI locally and authenticate with Supabase, then execute migrations against the confirmed Supabase Dev project.

Risks:

- CLI authentication may use the wrong Supabase account or organization.
- A linked project configuration could accidentally point at a non-dev project.
- Local environment files or access tokens must not be committed.

Exact next steps:

1. Install the Supabase CLI using the official installation path for macOS.
2. Authenticate the CLI with the account that has access to `strideo-dev`.
3. Link the local repo to the confirmed Supabase Dev project ref only.
4. Run `supabase projects list` or equivalent verification before any migration execution.
5. Confirm automatic table exposure is off and no application tables exist.
6. Apply migrations `0001` through `0012` one at a time.
7. Stop immediately on the first migration error.
8. Generate Supabase TypeScript types if CLI support is available.
9. Record all outputs in the Phase 1F execution report.

### Option C: Use Direct Postgres Connection String

Use the direct Postgres connection string from the Supabase Dev project with `psql` or another SQL client.

Risks:

- The connection string contains credentials and must not be committed, pasted into docs, or exposed in shell history.
- Direct SQL execution may not update Supabase migration history unless explicitly handled.
- Connection pooling, role selection, and SSL settings must be correct.
- Manual file-by-file execution has a higher operator-error risk than MCP or CLI execution.

Exact next steps:

1. Retrieve the Postgres connection string from the Supabase Dev dashboard.
2. Store it only in an untracked local environment variable or secure credential manager.
3. Confirm the hostname/project ref matches the confirmed Supabase Dev project.
4. Use `psql` with SSL enabled.
5. Run pre-check queries before any migration execution.
6. Execute migration files `0001` through `0012` one at a time in filename order.
7. Stop immediately on the first migration error.
8. Run final verification queries and save sanitized output only.
9. Do not commit credentials, connection strings, or shell history.

### Option D: Manual SQL Execution Through Supabase SQL Editor

Run each migration manually in the Supabase SQL Editor for the confirmed Supabase Dev project.

Risks:

- Highest risk of copy/paste omissions or accidental partial execution.
- SQL Editor context could be on the wrong project if the dashboard tab is not verified before every migration.
- Output capture is manual and may be incomplete.
- Migration history may not reflect file-by-file execution unless handled separately.

Exact next steps:

1. Open the Supabase dashboard for the confirmed Dev project only.
2. Verify the project name and exact project ref before each migration.
3. Open each migration file locally.
4. Paste and execute one migration at a time in order from `0001` through `0012`.
5. Stop immediately on the first error.
6. Copy sanitized success/error output after each migration.
7. Run final verification queries in SQL Editor.
8. Paste sanitized results into the Phase 1F execution report.

## Recommendation

Recommended options: Option A or Option B.

Option A is preferred when Supabase MCP tools can be reliably reconnected because it keeps execution inside the existing Codex workflow and supports structured verification output.

Option B is preferred if MCP remains unavailable because the Supabase CLI provides a repeatable local operator workflow and can also generate TypeScript types after successful migration execution.

Option C should be used only if MCP and CLI are unavailable and credentials can be handled securely.

Option D should be treated as a last resort because manual SQL execution has the highest operational risk.

## Required Next Decision

Before Phase 1F can resume, choose one execution path and re-confirm the Supabase Dev project ref as `ntxtakbggtljjbalgris` immediately before execution.
