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
```

Open `http://localhost:3000` and sign in with a Supabase Auth email/password user.

## Database

Apply the SQL migration in `supabase/migrations/20260804140000_initial_bar_schema.sql` to the Supabase project. It creates:

- `products`
- `replenishment_requests`
- `replenishment_request_items`
- `request_status_events`

The tables use UUID primary keys, timestamps where expected by the Android Room model, and basic RLS policies that allow authenticated users to read and write.

## Sharing Supabase with Android

The intranet and Android app should eventually use the same Supabase project. Put the same project URL and anon key into this intranet's `.env.local` and into the Android app's build configuration values for `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The Android app already posts to `replenishment_requests`, `replenishment_request_items`, and `request_status_events`; this intranet adds product management and status administration against that shared schema.

## Build

```bash
npm run build
```
