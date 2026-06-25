# Supabase setup — Stuck Not Broken app

This turns on real accounts and cross-device sync. ~5 minutes. Everything here is
free-tier. You'll end with two values to paste into `app/config.js` and one SQL
snippet run once.

## 1. Create the project
1. Go to supabase.com, sign up / sign in, click **New project**.
2. Name it (e.g. `stuck-not-broken`), set a database password (save it somewhere),
   pick the region closest to you, create.

## 2. Get the two keys
1. In the project, open **Project Settings → API**.
2. Copy **Project URL** (like `https://abcdefgh.supabase.co`).
3. Copy the **anon / public** key (a long string). This one is safe to ship in the
   app — it only works through the row-level security below. Do NOT use the
   `service_role` key in the app.
4. Paste both into `app/config.js`:
   ```js
   window.SNB_CONFIG = {
     SUPABASE_URL:      'https://abcdefgh.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi....the long anon key....',
   };
   ```

## 3. Create the tables + security
1. Open **SQL Editor → New query**, paste this, click **Run**:

```sql
-- check-ins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  t bigint not null,
  v real, sym real, dor real, fr real,
  note text, dom text,
  created_at timestamptz default now()
);

-- guided-practice sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  t bigint not null,
  practice_key text, skill text, sense text, silence int,
  completed boolean, ended_early boolean, minutes int, dom_before text,
  created_at timestamptz default now()
);

-- row-level security: each person can only see and write their own rows
alter table public.checkins enable row level security;
alter table public.sessions enable row level security;

create policy "own checkins" on public.checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## 4. Email confirmation (pick one)
**Authentication → Providers → Email** (and **Authentication → Settings**):
- **Confirmations ON** (default, recommended for real launch): new users get a
  confirmation email and must click the link before signing in. The app handles
  this — it shows a "check your email" screen.
- **Confirmations OFF** (fastest for testing): users are signed in immediately
  after creating an account. Toggle "Confirm email" off while you test, then turn
  it back on for launch.

## 5. Done
Reopen `app/Stuck Not Broken.html`. The sign-in screen now creates real accounts,
and check-ins/sessions sync to your project. Sign in on another device with the
same email/password and your history is there.

### Notes
- Data is per-user and exportable (the app's "export as a file" button, or from
  the Supabase Table Editor).
- This is auth + storage only. Access gating (who's allowed to subscribe) can stay
  on Circle — that's separate from identity here.
- For a real launch you'll also want a short privacy policy, since this stores
  personal reflection data.
