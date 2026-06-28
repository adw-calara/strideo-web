# AGENTS.md

## Strideo

Strideo is an AI-powered wagering intelligence platform for horseplayers.

Product and status source of truth:

- `PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/CODEX_OPERATING_PROMPT.md`

Living implementation/status references:

- `lib/progress/data-access.ts`
- current migrations
- current tests
- current implementation docs, including
  `docs/DEV_ONLY_FEATURE_SNAPSHOTS_MATERIALIZATION.md`,
  `docs/STRIDEO_ML_DATA_CONTRACT.md`, and
  `docs/OPPORTUNITY_SCORING_CONTRACT.md`

Historical reviews and audits, including `docs/ARCHITECTURE_REVIEW.md`, are
evidence snapshots. Use them for context, but reconcile stale readiness language
against the current roadmap, progress surface, migrations, tests, and
implementation docs.

Core product rule: `Opportunity` is the central object. Recommendations, alerts, wagers, results, explanations, and performance metrics should link back to an Opportunity wherever possible.

Operating rule: classify material work using `docs/CODEX_OPERATING_PROMPT.md`
before implementation. Prefer Layer 1 Opportunity work, use Layer 2 for
maintenance, upgrades, deployment safety, security, and mobile web/PWA
readiness, and defer Layer 3 scale operations unless explicitly requested.

## Repository

- Framework: Next.js App Router
- Runtime/language: TypeScript, React
- Styling: Tailwind CSS and shadcn/ui-style components
- Backend: Supabase PostgreSQL
- Auth: Supabase Auth with SSR cookies
- Dev Supabase project: `strideo-dev`
- Dev Supabase ref: `ntxtakbggtljjbalgris`
- Local app URL: `http://localhost:3000`

## Branching Rules

- Create feature branches from latest `origin/main`.
- Use the `codex/` branch prefix unless the user requests another name.
- Keep changes small and scoped to the requested task.
- Do not mix application, documentation, and database changes unless the task explicitly requires it.
- Open a PR when requested or when a task is complete and ready for review.

## Secret Handling

- Never commit secrets.
- Never commit `.env`, `.env.local`, service-role keys, database passwords, API keys, access tokens, or private credentials.
- Never put Supabase service-role or secret keys in browser code or `NEXT_PUBLIC_*` variables.
- Browser/SSR clients must use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- If credentials are unavailable, prepare files only and state clearly that nothing was applied.

## Supabase Environments

- Use Supabase Dev/Staging for validation when available.
- Never touch production Supabase unless the user explicitly authorizes production work in the current task.
- Always confirm the project name and ref before any Supabase operation.
- For Strideo Dev, confirm `strideo-dev` and `ntxtakbggtljjbalgris`.
- Do not assume a previous session's Supabase connection is still valid.

## Migration Rules

- Do not create, edit, or apply migrations unless explicitly requested.
- Migration files are append-only.
- Do not rewrite migration history.
- Do not rename, reorder, squash, or delete existing migration files.
- New migration files must use Supabase CLI timestamp naming: `YYYYMMDDHHMMSS_snake_case_name.sql`.
- Create new migration files with `supabase migration new <snake_case_name>`; do not hand-write numeric prefixes such as `0021_...`.
- Before applying migrations, run `npm run db:migrations:check` and `npm run db:migrations:dry-run`.
- After applying migrations to Dev, run `npm run db:migrations:dry-run`; it must report that the remote database is up to date.
- Linked Supabase database scripts load local, gitignored env files such as `.env.local`; set `SUPABASE_DB_PASSWORD` locally before running `npm run db:migrations:dry-run`, `npm run db:migrations:list`, or `npm run db:lint`.
- Prefer `supabase db push --linked` for applying prepared local migration files so local and remote migration versions stay aligned. If a connector apply path is used, immediately reconcile the local filename to the remote migration version and re-run the drift checks.
- Before database changes, document intended tables, RLS model, indexes, and migration order.
- Enable RLS on tables exposed through Supabase APIs.
- Inspect SQL before execution.
- Stop on the first migration error and report the blocker.
- If Supabase credentials or execution tools are unavailable, prepare files only and say migrations were not applied.

## Codex May Do

- Read the repo, inspect docs, and summarize current state.
- Edit application, docs, or configuration files within the requested scope.
- Create branches, commits, and PRs when requested.
- Run local verification commands.
- Prepare migration files when explicitly requested, without applying them unless separately authorized.
- Use Supabase MCP, CLI, or direct database tools only when available and authorized for the target environment.

## Codex May Not Do

- Touch production Supabase without explicit authorization.
- Apply migrations without explicit authorization.
- Modify existing migration history.
- Commit secrets or private credentials.
- Use user-editable metadata for authorization decisions.
- Expose service-role keys or secret keys to browser code.
- Make broad rewrites unrelated to the task.

## Verification

Available package scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run verify
npm run db:migrations:check
npm run db:migrations:dry-run
```

Standard verification before handoff when application code changes:

```bash
npm run lint
npm run build
```

For documentation-only changes, run `npm run lint` when safe.

For Supabase/database work, also document:

- target project name and ref
- execution path used
- migrations created or applied
- RLS policies changed
- advisors or verification queries run
- any tables, policies, triggers, functions, indexes, grants, or seed data changed

## Handoff

Summarize:

- what changed
- what was verified
- whether Supabase was touched
- whether migrations were created or applied
- remaining risks or decisions
