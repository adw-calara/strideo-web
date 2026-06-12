# Auth Shell Reconciliation

Date: 2026-06-07

## Summary

The stale local auth shell was preserved, then compared against the current `origin/main` foundation on a new branch, `codex/reconcile-auth-shell`.

No migration files were modified. No migrations were created. No migrations were applied. Supabase was not touched.

## Preserved Workspace State

The pre-reconciliation untracked/stale workspace was preserved in two ways:

- Filesystem archive: `/Users/andrewwhetsel/Documents/Strideo-reconciliation-archives/20260607-083758/strideo-stale-untracked-workspace.tar.gz`
- Archive manifest: `/Users/andrewwhetsel/Documents/Strideo-reconciliation-archives/20260607-083758/untracked-files.txt`
- Pre-reconciliation status: `/Users/andrewwhetsel/Documents/Strideo-reconciliation-archives/20260607-083758/status-before-reconciliation.txt`
- Pre-reconciliation HEAD: `/Users/andrewwhetsel/Documents/Strideo-reconciliation-archives/20260607-083758/head-before-reconciliation.txt`
- Git stash: `stash@{Sun Jun 7 08:38:09 2026}` with message `preserve stale local auth shell before repo reconciliation`

The archive was extracted for comparison at:

```text
/Users/andrewwhetsel/Documents/Strideo-reconciliation-archives/20260607-083758/extracted
```

## Branch Reconciliation

Actions completed:

- Fetched latest origin refs with `git fetch origin --prune`.
- Created `codex/reconcile-auth-shell` from `origin/main`.
- Compared preserved stale auth shell files against the current main branch.

Current branch:

```text
codex/reconcile-auth-shell
```

Base:

```text
origin/main
```

## Auth Pieces Reviewed

Reviewed stale local files against main:

- `lib/supabase/proxy.ts`
- legacy email allowlist helper
- `app/protected/page.tsx`
- `app/protected/layout.tsx`
- `app/page.tsx`
- `components/login-form.tsx`
- `components/auth-button.tsx`
- `.env.example`
- auth error and login shell files

Reviewed current main files:

- `app/(app)/protected/page.tsx`
- `app/(app)/protected/layout.tsx`
- `app/(auth)/auth/*`
- `app/(public)/page.tsx`
- `components/layout/foundation-shell.tsx`
- `components/navigation/foundation-nav.tsx`
- `lib/supabase/proxy.ts`
- `lib/env/public.ts`
- `lib/env/server.ts`

## Port Decisions

### Supabase SSR Auth Wiring

Status: already present on `origin/main`.

The main branch keeps the SSR cookie-backed Supabase client and session refresh behavior in `lib/supabase/proxy.ts`. It improves on the stale local version by using typed environment helpers from `lib/env/public.ts`.

Decision: no stale code ported.

### Protected Route Shell

Status: already present on `origin/main`.

The main branch uses route groups and the shared `FoundationShell`:

- `app/(app)/protected/layout.tsx`
- `app/(app)/protected/page.tsx`
- `components/layout/foundation-shell.tsx`
- `components/navigation/foundation-nav.tsx`

The stale local version used older paths and duplicated nav/footer layout inline.

Decision: no stale code ported.

### Email Allowlist

Status: removed after initial auth foundation work.

Protected routes now rely on a valid Supabase session rather than a local email allowlist.

Decision: do not reintroduce the stale local allowlist helper.

### Session Proxy

Status: already present on `origin/main`.

The current proxy protects `/protected`, redirects authenticated allowed users away from auth pages, and signs out unauthorized emails before routing to `/auth/error`.

Decision: no stale code ported.

### Login Shell Pieces

Status: already present on `origin/main`.

The stale local login/auth components were functionally equivalent to the current main versions. The main branch already has the matching auth route files under route groups.

Decision: no stale code ported.

## Discarded From Port

The following stale local pieces were intentionally not ported:

- Old route paths under `app/protected/*` and `app/auth/*`, because main uses route groups.
- Inline protected layout shell, because main uses `FoundationShell`.
- Older public page wording that exposed the specific allowlisted email in UI copy.
- Starter/template components not present on main, including deploy/logo/tutorial components.
- Older env handling through `lib/utils.ts`, because main has explicit env helper modules.
- Any stale docs that would overwrite newer architecture, migration, or planning documents from main.

These files were not deleted from the preserved archive or stash.

## Files Changed On Reconciliation Branch

Changed:

```text
docs/AUTH_SHELL_RECONCILIATION.md
```

Application files changed:

```text
none
```

Migration files changed:

```text
none
```

## Risks

- The preserved stale workspace remains recoverable, but it was not fully applied because much of it is older than the merged main foundation.
- The PR intentionally contains documentation only. It validates that no auth shell code needed to be ported after comparison.
- The current main auth shell should still be tested in a browser with real Supabase credentials if future work changes auth behavior.
- The old stash should be kept until this reconciliation PR is merged and accepted.

## Test Results

Passed:

```text
npm run lint
npm run build
```

`npm run lint` completed with no ESLint errors.

`npm run build` completed successfully with Next.js 16.2.7 and generated the expected routes, including `/`, `/auth/*`, `/protected`, and `/api/health`.
