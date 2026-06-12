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
```

Supabase currently recommends publishable keys for browser/server SSR clients. Do not put a secret or service-role key in `NEXT_PUBLIC_*` variables.

## Routes

- `/` is public.
- `/auth/login` signs in with Supabase Auth.
- `/auth/sign-up` creates a Supabase Auth user.
- `/protected` requires a valid Supabase session.

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
