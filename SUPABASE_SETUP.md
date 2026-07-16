# Supabase Setup — do these once, then tell Claude "done"

Everything else in Phase 1 is built. These steps need your Supabase account.
When finished, Claude will run the seed script, wire up auth, and verify — all locally.

## 1. Create the project
1. Go to https://supabase.com → sign in (GitHub login is easiest).
2. Click **New project**.
   - Name: `depannage-ev`
   - Database password: choose one and **save it somewhere**.
   - Region: pick the closest — **West EU (Frankfurt)** is good for Tunisia.
3. Wait ~2 minutes for it to provision.

## 2. Copy your API keys
1. In the project, go to **Project Settings** (gear icon) → **API**.
2. Copy these three values:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public** key (a long JWT)
   - **service_role** key (a different long JWT — keep this secret)

## 3. Create `.env.local`
Create a file at `depannage-ev/.env.local` (it is gitignored — never committed) with:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Replace the three values with what you copied. (`depannage-ev/.env.example` shows the same format.)

## 4. Run the two SQL migrations
1. In Supabase, open **SQL Editor** → **New query**.
2. Open `depannage-ev/supabase/migrations/0001_init.sql`, copy ALL of it, paste, click **Run**.
   Expected: "Success. No rows returned."
3. New query again. Open `depannage-ev/supabase/migrations/0002_rls.sql`, copy ALL, paste, **Run**.
   Expected: "Success. No rows returned."
4. Check **Table Editor** — you should see `profiles`, `chargers`, `availability_rules`,
   `bookings`, `reviews`, each marked "RLS enabled".

## 5. (Optional) Google login
Skip this for now if you like — email/password login will work without it, and the
Google button can be wired up later. If you do want it:
- Supabase → **Authentication → Providers → Google** → enable, and paste a Google OAuth
  client ID + secret (from Google Cloud Console → Credentials → OAuth client, "Web").
- Add redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

## Then
Tell Claude **"Supabase is set up"** (or "done"). Claude will:
- run `npm run seed` to load ~18 demo chargers across Tunisian cities,
- finish the auth integration (Task 12),
- run the final verification (Task 13).
