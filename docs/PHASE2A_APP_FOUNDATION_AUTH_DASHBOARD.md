# Phase 2A App Foundation Auth Dashboard

## Summary

Phase 2A adds a functional authenticated Strideo app shell on top of the existing Supabase Auth foundation.

The work keeps the product centered on Opportunity-driven workflows while avoiding database, RLS, grant, or migration changes.

## Auth And Environment

- Supabase browser and SSR clients continue to use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.example`.
- No Supabase values are hardcoded.
- Login, signup, password reset, password update, and sign-out flows use the existing Supabase client helpers.
- The protected app layout verifies Supabase Auth claims server-side before rendering `/protected` routes.
- Protected routes rely on a valid Supabase session rather than a local email allowlist.

## Dashboard Shell

The protected shell now includes top-level navigation for:

- Dashboard
- Races
- Predictions
- Strategies
- Data Imports
- Settings

The new route scaffolds are intentionally lightweight. They provide clear authenticated destinations for the next database-backed features without granting browser access to product tables or broadening RLS.

## Role-Aware Structure

Role-aware UI is deferred.

The schema includes `profile_roles`, but Phase 2A does not query product tables or change table grants. This avoids creating accidental access assumptions before role, entitlement, and RLS policy tests are approved.

## Safety

- Supabase touched: no
- Production touched: no
- Migrations created: no
- Migrations applied: no
- Existing migration files modified: no
- RLS access broadened: no

## Verification

Run before handoff:

```bash
npm run lint
npm run build
git diff --check
```
