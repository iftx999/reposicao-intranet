# BAR Intranet Admin

Standalone Next.js App Router + TypeScript + Tailwind CSS admin panel for BAR replenishment data.

## Local setup

```bash
cd intranet
npm install
cp .env.local.example .env.local
npm run dev
```

Set these values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Open `http://localhost:3000` and sign in with a Supabase Auth email/password user.

## Database

Apply the SQL migration in `supabase/migrations/20260804140000_initial_bar_schema.sql` to the Supabase project. It creates:

- `products`
- `replenishment_requests`
- `replenishment_request_items`
- `request_status_events`

The tables use UUID primary keys, timestamps where expected by the Android Room model, and basic RLS policies that allow authenticated users to read and write.

Apply `supabase/migrations/20260804153000_create_profiles.sql` after the initial schema to create `profiles`, RLS policies for admin-only writes, and the optional trigger that creates a default profile when a Supabase Auth user is created.

## Users

The `/usuarios` screen lists profiles, filters by role/status, searches by name or email, and lets admins create, edit, or deactivate users. Creating a user calls the Next.js API route `POST /api/usuarios`; that route runs server-side with `SUPABASE_SERVICE_ROLE_KEY`, creates the Supabase Auth user with `supabase.auth.admin.createUser`, then upserts the matching row in `profiles`. Keep `SUPABASE_SERVICE_ROLE_KEY` only in `.env.local` or server environment variables.

## Sharing Supabase with Android

The intranet and Android app should eventually use the same Supabase project. Put the same project URL and anon key into this intranet's `.env.local` and into the Android app's build configuration values for `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The Android app already posts to `replenishment_requests`, `replenishment_request_items`, and `request_status_events`; this intranet adds product management and status administration against that shared schema.

## Build

```bash
npm run build
```
