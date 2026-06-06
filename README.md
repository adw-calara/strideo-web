# Strideo

Next.js App Router app with Supabase Auth, SSR cookie sessions, and protected routes.

## Auth Setup

Create or open the Supabase project that should back Strideo, then copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the Supabase values from the project Connect/API settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
STRIDEO_ALLOWED_EMAILS=adw@calara.ai
```

Supabase currently recommends publishable keys for browser/server SSR clients. Do not put a secret or service-role key in `NEXT_PUBLIC_*` variables.

## Routes

- `/` is public.
- `/auth/login` signs in with Supabase Auth and defaults to `adw@calara.ai`.
- `/auth/sign-up` creates the Supabase Auth user for `adw@calara.ai`.
- `/protected` requires a valid Supabase session and an email in `STRIDEO_ALLOWED_EMAILS`.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Verification

```bash
npm run lint
npm run build
```
