# Supabase Profile Registry Setup

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists public.wallet_profiles (
  wallet_address text primary key,
  role text not null check (role in ('brand', 'influencer')),
  display_name text not null,
  email text not null,
  instagram text not null,
  telegram text not null,
  x_handle text not null,
  avatar_data_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists wallet_profiles_role_idx on public.wallet_profiles (role);

alter table public.wallet_profiles enable row level security;

-- Reads can be public if you want campaign cards to show contact cards without server fallback.
-- The app writes through server-side API routes using service role key.
drop policy if exists "wallet_profiles_select_public" on public.wallet_profiles;
create policy "wallet_profiles_select_public"
on public.wallet_profiles
for select
using (true);
```

Environment variables needed in `frontend/.env.local`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROFILE_TABLE` (default: `wallet_profiles`)
- `PROFILE_AUTH_SECRET` (long random string)

Optional public vars (fallback):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
