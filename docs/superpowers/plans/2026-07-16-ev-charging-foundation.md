# EV Charging Marketplace — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable Next.js + Supabase skeleton with French i18n, the full database schema (tables + enums + RLS), a seed script, working email/Google auth, and an app shell — so later feature phases have a solid base.

**Architecture:** Next.js App Router (TypeScript strict) with Tailwind for styling and `next-intl` for internationalization (French only in v1, structured for Arabic later). Supabase provides Postgres, Auth, and Storage, accessed through typed server/browser client helpers. The database schema and Row-Level Security are defined as SQL migrations; a Node seed script fills demo data.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, `next-intl`, `@supabase/supabase-js`, `@supabase/ssr`, Vitest + React Testing Library, `tsx` (for running the seed script).

> **Reference spec:** `docs/superpowers/specs/2026-07-16-ev-charging-marketplace-design.md`

---

## File Structure (what this phase creates)

```
depannage-ev/                     # Next.js app root (created by scaffold)
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx            # locale-aware root layout + <NextIntlClientProvider>
│  │  │  ├─ page.tsx              # temporary home page (proves i18n works)
│  │  │  └─ auth/page.tsx         # login / signup screen
│  │  └─ auth/callback/route.ts   # Supabase OAuth code-exchange handler
│  ├─ components/
│  │  ├─ AppHeader.tsx            # nav bar + language switcher + auth state
│  │  └─ LanguageSwitcher.tsx     # FR (+ future AR) locale switcher
│  ├─ i18n/
│  │  ├─ routing.ts               # next-intl locales + routing config
│  │  ├─ request.ts               # next-intl per-request config (loads messages)
│  │  └─ navigation.ts            # locale-aware Link/redirect helpers
│  ├─ lib/
│  │  ├─ supabase/server.ts       # server-side Supabase client (cookies)
│  │  ├─ supabase/client.ts       # browser Supabase client
│  │  └─ pricing.ts               # booking total calculation (pure, tested)
│  └─ types/
│     └─ database.ts              # hand-written DB row types + enums
├─ messages/
│  └─ fr.json                     # French UI strings
├─ supabase/
│  ├─ migrations/0001_init.sql    # tables + enums + indexes
│  ├─ migrations/0002_rls.sql     # row-level security policies
│  └─ seed.ts                     # demo data seeding script
├─ middleware.ts                  # next-intl locale middleware + Supabase session refresh
├─ .env.example                   # documents required env vars
├─ .env.local                     # (gitignored) real Supabase keys
├─ vitest.config.ts
└─ package.json
```

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `depannage-ev/` (entire Next.js scaffold)

- [ ] **Step 1: Create the app**

The repo root is `c:/Users/Seyf.mejri/Desktop/DepannageEV`. Scaffold into a subfolder named `depannage-ev`.

Run:
```bash
npx create-next-app@latest depannage-ev --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --no-turbopack
```
When prompted for anything not covered by flags, accept defaults.
Expected: a `depannage-ev/` folder with `package.json`, `src/app/`, `tailwind.config.*`.

- [ ] **Step 2: Verify it runs**

Run:
```bash
cd depannage-ev && npm run dev
```
Expected: dev server starts on http://localhost:3000 with no errors. Stop it with Ctrl+C.

- [ ] **Step 3: Enable TypeScript strict mode**

Confirm `depannage-ev/tsconfig.json` has `"strict": true` under `compilerOptions` (create-next-app sets this by default). If missing, add it.

- [ ] **Step 4: Commit**

```bash
cd depannage-ev && git add -A && git commit -m "chore: scaffold Next.js app (TS, Tailwind, App Router)"
```
Note: commit from inside `depannage-ev` if it initialized its own git; otherwise commit from repo root. Verify with `git status` first.

---

## Task 2: Install dependencies

**Files:**
- Modify: `depannage-ev/package.json`

- [ ] **Step 1: Install runtime + dev dependencies**

Run (from `depannage-ev/`):
```bash
npm install next-intl @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom tsx
```
Expected: installs succeed, `package.json` lists these under dependencies/devDependencies.

- [ ] **Step 2: Add scripts**

In `depannage-ev/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"seed": "tsx supabase/seed.ts"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json && git commit -m "chore: add next-intl, supabase, vitest, tsx deps"
```

---

## Task 3: Configure Vitest

**Files:**
- Create: `depannage-ev/vitest.config.ts`
- Create: `depannage-ev/vitest.setup.ts`

- [ ] **Step 1: Create the Vitest config**

Create `depannage-ev/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Create the setup file**

Create `depannage-ev/vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add a smoke test**

Create `depannage-ev/src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test to verify the harness works**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 5: Delete the smoke test and commit**

```bash
rm src/lib/smoke.test.ts
git add -A && git commit -m "chore: configure Vitest + RTL test harness"
```

---

## Task 4: Pricing utility (TDD)

The booking total depends on price unit (per kWh vs per hour). Per kWh needs an estimated energy amount; per hour uses booking duration. This is pure logic — build it test-first now so booking (Phase 4) can rely on it.

**Files:**
- Create: `depannage-ev/src/lib/pricing.ts`
- Test: `depannage-ev/src/lib/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `depannage-ev/src/lib/pricing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calculateBookingTotal } from "./pricing";

describe("calculateBookingTotal", () => {
  it("charges per hour by booking duration", () => {
    const total = calculateBookingTotal({
      priceUnit: "hour",
      priceAmount: 5, // 5 TND / hour
      startTime: new Date("2026-07-16T10:00:00Z"),
      endTime: new Date("2026-07-16T12:30:00Z"), // 2.5 hours
    });
    expect(total).toBeCloseTo(12.5, 3);
  });

  it("charges per kWh by estimated energy (power x hours)", () => {
    const total = calculateBookingTotal({
      priceUnit: "kwh",
      priceAmount: 0.4, // 0.4 TND / kWh
      powerKw: 7, // 7 kW charger
      startTime: new Date("2026-07-16T10:00:00Z"),
      endTime: new Date("2026-07-16T12:00:00Z"), // 2 hours -> 14 kWh
    });
    expect(total).toBeCloseTo(5.6, 3);
  });

  it("throws if kwh pricing has no powerKw", () => {
    expect(() =>
      calculateBookingTotal({
        priceUnit: "kwh",
        priceAmount: 0.4,
        startTime: new Date("2026-07-16T10:00:00Z"),
        endTime: new Date("2026-07-16T11:00:00Z"),
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pricing`
Expected: FAIL with "calculateBookingTotal is not a function" / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `depannage-ev/src/lib/pricing.ts`:
```ts
export type PriceUnit = "kwh" | "hour";

export interface BookingTotalInput {
  priceUnit: PriceUnit;
  priceAmount: number;
  startTime: Date;
  endTime: Date;
  powerKw?: number;
}

/** Hours between two dates (fractional). */
function durationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Booking total in TND.
 * - "hour": priceAmount * duration in hours.
 * - "kwh":  priceAmount * estimated energy = powerKw * duration in hours.
 */
export function calculateBookingTotal(input: BookingTotalInput): number {
  const hours = durationHours(input.startTime, input.endTime);
  if (input.priceUnit === "hour") {
    return input.priceAmount * hours;
  }
  if (input.powerKw == null) {
    throw new Error("kwh pricing requires powerKw");
  }
  return input.priceAmount * input.powerKw * hours;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pricing`
Expected: PASS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts src/lib/pricing.test.ts
git commit -m "feat: add booking total calculation (per-kWh and per-hour)"
```

---

## Task 5: Set up French i18n with next-intl

**Files:**
- Create: `depannage-ev/src/i18n/routing.ts`
- Create: `depannage-ev/src/i18n/navigation.ts`
- Create: `depannage-ev/src/i18n/request.ts`
- Create: `depannage-ev/messages/fr.json`
- Create: `depannage-ev/next.config.ts` modification (wrap with next-intl plugin)

- [ ] **Step 1: Define routing (locales)**

Create `depannage-ev/src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Arabic ("ar") will be added in phase 2.
  locales: ["fr"],
  defaultLocale: "fr",
});
```

- [ ] **Step 2: Create locale-aware navigation helpers**

Create `depannage-ev/src/i18n/navigation.ts`:
```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 3: Create the per-request config**

Create `depannage-ev/src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "fr")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Create the French messages catalog**

Create `depannage-ev/messages/fr.json`:
```json
{
  "app": {
    "name": "Chargini",
    "tagline": "Rechargez votre voiture électrique chez l'habitant"
  },
  "nav": {
    "explore": "Explorer",
    "becomeHost": "Devenir hôte",
    "dashboard": "Tableau de bord",
    "login": "Connexion",
    "logout": "Déconnexion"
  },
  "home": {
    "heroTitle": "Trouvez une borne de recharge près de chez vous",
    "heroSubtitle": "Des particuliers partagent leur borne. Réservez un créneau, rechargez, c'est tout.",
    "ctaExplore": "Voir les bornes",
    "ctaHost": "Proposer ma borne"
  },
  "auth": {
    "title": "Connexion / Inscription",
    "email": "Adresse e-mail",
    "password": "Mot de passe",
    "signIn": "Se connecter",
    "signUp": "Créer un compte",
    "withGoogle": "Continuer avec Google",
    "signedInAs": "Connecté en tant que {email}"
  }
}
```

- [ ] **Step 5: Wire the plugin into next.config**

Replace the contents of `depannage-ev/next.config.ts` with:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```
(If the scaffold created `next.config.mjs` instead, delete it and create `next.config.ts` as above.)

- [ ] **Step 6: Commit**

```bash
git add src/i18n messages next.config.ts
git commit -m "feat: configure next-intl with French locale"
```

---

## Task 6: Locale middleware + app shell

**Files:**
- Create: `depannage-ev/middleware.ts`
- Move/Create: `depannage-ev/src/app/[locale]/layout.tsx`
- Create: `depannage-ev/src/app/[locale]/page.tsx`
- Delete: `depannage-ev/src/app/page.tsx` and default `src/app/layout.tsx` body (replace)

- [ ] **Step 1: Create the middleware**

Create `depannage-ev/middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals and static files; run on everything else.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Replace the root layout with a locale layout**

Delete `depannage-ev/src/app/page.tsx`. Keep `src/app/layout.tsx` minimal (it just passes children through). Replace `src/app/layout.tsx` with:
```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

Create `depannage-ev/src/app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AppHeader } from "@/components/AppHeader";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <NextIntlClientProvider>
          <AppHeader />
          <main>{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```
Note: `globals.css` lives at `src/app/globals.css` from the scaffold; the import path `../globals.css` is correct from `src/app/[locale]/layout.tsx`.

- [ ] **Step 3: Create the temporary home page**

Create `depannage-ev/src/app/[locale]/page.tsx`:
```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("home");
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("heroTitle")}</h1>
      <p className="mt-4 text-lg text-slate-600">{t("heroSubtitle")}</p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/explore"
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
        >
          {t("ctaExplore")}
        </Link>
        <Link
          href="/host/new"
          className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50"
        >
          {t("ctaHost")}
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify (after Task 7 provides AppHeader) — placeholder run**

`AppHeader` is created in Task 7. Do not run the dev server until Task 7 is complete. Proceed to Task 7, then return here.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts "src/app/[locale]" src/app/layout.tsx
git rm src/app/page.tsx 2>/dev/null || true
git commit -m "feat: locale middleware + locale-aware layout and home page"
```

---

## Task 7: Language switcher + header component

**Files:**
- Create: `depannage-ev/src/components/LanguageSwitcher.tsx`
- Create: `depannage-ev/src/components/AppHeader.tsx`
- Test: `depannage-ev/src/components/LanguageSwitcher.test.tsx`

- [ ] **Step 1: Write a failing test for the switcher**

Create `depannage-ev/src/components/LanguageSwitcher.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders the current locale label", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={{}}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: /FR/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LanguageSwitcher`
Expected: FAIL — module `./LanguageSwitcher` not found.

- [ ] **Step 3: Implement the switcher**

Create `depannage-ev/src/components/LanguageSwitcher.tsx`:
```tsx
"use client";

import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

// Arabic will appear here automatically once added to routing.locales.
const LABELS: Record<string, string> = { fr: "FR", ar: "ع" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  if (routing.locales.length < 2) {
    // Only one locale in v1: show a static, disabled indicator.
    return (
      <button
        type="button"
        disabled
        className="rounded px-2 py-1 text-sm font-medium text-slate-500"
      >
        {LABELS[locale] ?? locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="flex gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={`rounded px-2 py-1 text-sm font-medium ${
            l === locale ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LanguageSwitcher`
Expected: PASS.

- [ ] **Step 5: Implement the header**

Create `depannage-ev/src/components/AppHeader.tsx`:
```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AppHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-slate-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          {t("app.name")}
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/explore" className="hover:text-emerald-700">
            {t("nav.explore")}
          </Link>
          <Link href="/host/new" className="hover:text-emerald-700">
            {t("nav.becomeHost")}
          </Link>
          <Link href="/auth" className="hover:text-emerald-700">
            {t("nav.login")}
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 6: Run the app and verify i18n end-to-end**

Run: `npm run dev`
Visit http://localhost:3000 → should redirect to http://localhost:3000/fr and show the French hero + header with "Chargini". Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/components && git commit -m "feat: app header + language switcher (FR)"
```

---

## Task 8: Supabase project + environment + client helpers

This task requires creating a Supabase project in the browser (manual, one-time).

**Files:**
- Create: `depannage-ev/.env.example`
- Create: `depannage-ev/.env.local` (gitignored)
- Create: `depannage-ev/src/lib/supabase/server.ts`
- Create: `depannage-ev/src/lib/supabase/client.ts`

- [ ] **Step 1: Create the Supabase project (manual)**

In a browser: go to https://supabase.com → sign in → New project. Name it `depannage-ev`, choose a region close to Tunisia (e.g. `eu-west` / Frankfurt), set a database password (save it). Wait for provisioning.
From Project Settings → API, copy: **Project URL**, **anon public key**, and **service_role key**.

- [ ] **Step 2: Document env vars**

Create `depannage-ev/.env.example`:
```bash
# Supabase — from Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Service role key — server-only, used by the seed script. NEVER expose to the client.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 3: Create the real env file**

Create `depannage-ev/.env.local` with the actual values copied in Step 1 (same keys as `.env.example`). Confirm `.env*` is gitignored (the repo root `.gitignore` already ignores `.env*` with `!.env.example`). Ensure `.env.local` is NOT tracked: `git status` must not list it.

- [ ] **Step 4: Create the browser client**

Create `depannage-ev/src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 5: Create the server client**

Create `depannage-ev/src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add .env.example src/lib/supabase
git commit -m "feat: supabase env config + server/browser client helpers"
```

---

## Task 9: Database schema migration (tables + enums)

**Files:**
- Create: `depannage-ev/supabase/migrations/0001_init.sql`
- Create: `depannage-ev/src/types/database.ts`

- [ ] **Step 1: Write the schema SQL**

Create `depannage-ev/supabase/migrations/0001_init.sql`:
```sql
-- Enums
create type connector_type as enum ('type2', 'type1', 'ccs', 'chademo', 'schuko');
create type price_unit as enum ('kwh', 'hour');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  phone text,
  is_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Chargers (listings)
create table public.chargers (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  address text not null,
  lat double precision not null,
  lng double precision not null,
  city text not null,
  connector_type connector_type not null,
  power_kw numeric(5,1) not null,
  price_amount numeric(8,3) not null,
  price_unit price_unit not null,
  photos text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index chargers_city_idx on public.chargers (city);
create index chargers_active_idx on public.chargers (is_active);

-- Availability rules (weekly)
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.chargers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index availability_charger_idx on public.availability_rules (charger_id);

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  charger_id uuid not null references public.chargers(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  total_price numeric(10,3) not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index bookings_charger_idx on public.bookings (charger_id);
create index bookings_driver_idx on public.bookings (driver_id);

-- Reviews (one per booking per reviewer)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

-- Auto-create a profile row when a new auth user is created
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply the migration (manual, via Supabase SQL editor)**

In the Supabase dashboard → SQL Editor → New query → paste the entire contents of `0001_init.sql` → Run.
Expected: "Success. No rows returned." Verify in Table Editor that `profiles`, `chargers`, `availability_rules`, `bookings`, `reviews` exist.

- [ ] **Step 3: Create hand-written TypeScript row types**

Create `depannage-ev/src/types/database.ts`:
```ts
export type ConnectorType = "type2" | "type1" | "ccs" | "chademo" | "schuko";
export type PriceUnit = "kwh" | "hour";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface Charger {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  connector_type: ConnectorType;
  power_kw: number;
  price_amount: number;
  price_unit: PriceUnit;
  photos: string[];
  is_active: boolean;
  created_at: string;
}

export interface AvailabilityRule {
  id: string;
  charger_id: string;
  day_of_week: number; // 0-6
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface Booking {
  id: string;
  charger_id: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql src/types/database.ts
git commit -m "feat: database schema (tables, enums, profile trigger) + TS row types"
```

---

## Task 10: Row-Level Security policies

**Files:**
- Create: `depannage-ev/supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Write the RLS SQL**

Create `depannage-ev/supabase/migrations/0002_rls.sql`:
```sql
alter table public.profiles enable row level security;
alter table public.chargers enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

-- Profiles: anyone can read; a user can update only their own.
create policy "profiles readable" on public.profiles
  for select using (true);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- Chargers: anyone reads active ones (owner reads their own too); owner writes.
create policy "chargers readable" on public.chargers
  for select using (is_active or auth.uid() = host_id);
create policy "chargers owner insert" on public.chargers
  for insert with check (auth.uid() = host_id);
create policy "chargers owner update" on public.chargers
  for update using (auth.uid() = host_id);
create policy "chargers owner delete" on public.chargers
  for delete using (auth.uid() = host_id);

-- Availability: readable by all; writable by the charger's host.
create policy "availability readable" on public.availability_rules
  for select using (true);
create policy "availability owner write" on public.availability_rules
  for all using (
    exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );

-- Bookings: driver or the charger's host can read; driver inserts; host or driver updates status.
create policy "bookings participant read" on public.bookings
  for select using (
    auth.uid() = driver_id
    or exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );
create policy "bookings driver insert" on public.bookings
  for insert with check (auth.uid() = driver_id);
create policy "bookings participant update" on public.bookings
  for update using (
    auth.uid() = driver_id
    or exists (
      select 1 from public.chargers c
      where c.id = charger_id and c.host_id = auth.uid()
    )
  );

-- Reviews: anyone reads; only a participant of a completed booking writes.
create policy "reviews readable" on public.reviews
  for select using (true);
create policy "reviews participant insert" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'completed'
        and (b.driver_id = auth.uid()
          or exists (
            select 1 from public.chargers c
            where c.id = b.charger_id and c.host_id = auth.uid()
          ))
    )
  );
```

- [ ] **Step 2: Apply the migration (manual)**

Supabase SQL Editor → paste `0002_rls.sql` → Run.
Expected: "Success. No rows returned." In Table Editor, each table now shows "RLS enabled".

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat: row-level security policies for all tables"
```

---

## Task 11: Seed script

The seed script uses the service-role key to bypass RLS and insert demo data. It creates demo auth users (hosts + drivers), their profiles are auto-created by the trigger, then inserts chargers, availability, a couple of completed bookings, and reviews.

**Files:**
- Create: `depannage-ev/supabase/seed.ts`

- [ ] **Step 1: Write the seed script**

Create `depannage-ev/supabase/seed.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local manually (no framework here).
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const CITIES: Array<{ city: string; lat: number; lng: number }> = [
  { city: "Tunis", lat: 36.8065, lng: 10.1815 },
  { city: "Ariana", lat: 36.8625, lng: 10.1956 },
  { city: "Sfax", lat: 34.7406, lng: 10.7603 },
  { city: "Sousse", lat: 35.8256, lng: 10.6369 },
  { city: "Nabeul", lat: 36.4513, lng: 10.7357 },
  { city: "Bizerte", lat: 37.2744, lng: 9.8739 },
];

const CONNECTORS = ["type2", "ccs", "schuko", "chademo", "type1"] as const;

async function ensureUser(email: string, fullName: string): Promise<string> {
  // Create the auth user (email confirmed) — trigger makes the profile.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error && !error.message.includes("already been registered")) throw error;
  if (data?.user) return data.user.id;
  // Already exists: look it up.
  const { data: list } = await supabase.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === email);
  if (!found) throw new Error(`Could not resolve user ${email}`);
  return found.id;
}

async function main() {
  console.log("Seeding...");

  const hostIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    hostIds.push(await ensureUser(`host${i}@example.com`, `Hôte ${i + 1}`));
  }
  const driverId = await ensureUser("driver@example.com", "Conducteur Démo");

  // Mark hosts verified.
  await supabase
    .from("profiles")
    .update({ is_verified: true })
    .in("id", hostIds);

  // Wipe existing demo chargers to keep re-runs idempotent.
  await supabase.from("chargers").delete().in("host_id", hostIds);

  const chargerIds: string[] = [];
  for (let i = 0; i < 18; i++) {
    const loc = CITIES[i % CITIES.length];
    const jitter = () => (i % 7) * 0.004 - 0.014;
    const priceUnit = i % 2 === 0 ? "kwh" : "hour";
    const { data, error } = await supabase
      .from("chargers")
      .insert({
        host_id: hostIds[i % hostIds.length],
        title: `Borne ${CONNECTORS[i % CONNECTORS.length]} à ${loc.city}`,
        description:
          "Borne privée disponible pour la recharge. Accès facile, stationnement gratuit.",
        address: `${10 + i} Rue de l'Énergie, ${loc.city}`,
        lat: loc.lat + jitter(),
        lng: loc.lng + jitter(),
        city: loc.city,
        connector_type: CONNECTORS[i % CONNECTORS.length],
        power_kw: [3.7, 7, 11, 22, 50][i % 5],
        price_amount: priceUnit === "kwh" ? 0.35 + (i % 3) * 0.1 : 4 + (i % 4),
        price_unit: priceUnit,
        photos: [],
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    chargerIds.push(data.id);

    // Availability: weekdays 08:00-20:00.
    const rules = [1, 2, 3, 4, 5].map((d) => ({
      charger_id: data.id,
      day_of_week: d,
      start_time: "08:00:00",
      end_time: "20:00:00",
    }));
    await supabase.from("availability_rules").insert(rules);
  }

  // A couple of completed bookings + reviews for the demo driver.
  for (let i = 0; i < 2; i++) {
    const chargerId = chargerIds[i];
    const { data: charger } = await supabase
      .from("chargers")
      .select("host_id")
      .eq("id", chargerId)
      .single();
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        charger_id: chargerId,
        driver_id: driverId,
        start_time: "2026-07-01T09:00:00Z",
        end_time: "2026-07-01T11:00:00Z",
        status: "completed",
        total_price: 12.5,
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    await supabase.from("reviews").insert({
      booking_id: booking.id,
      reviewer_id: driverId,
      reviewee_id: charger!.host_id,
      rating: 5,
      comment: "Excellent hôte, recharge sans problème !",
    });
  }

  console.log(`Done: ${hostIds.length} hosts, ${chargerIds.length} chargers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed**

Run (from `depannage-ev/`): `npm run seed`
Expected: prints "Seeding..." then "Done: 6 hosts, 18 chargers." Verify in Supabase Table Editor that `chargers` has 18 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.ts && git commit -m "feat: seed script for demo hosts, chargers, bookings, reviews"
```

---

## Task 12: Authentication (email + Google) and auth screen

**Files:**
- Create: `depannage-ev/src/app/[locale]/auth/page.tsx`
- Create: `depannage-ev/src/app/auth/callback/route.ts`
- Modify: `depannage-ev/middleware.ts` (add Supabase session refresh)
- Modify: `depannage-ev/src/components/AppHeader.tsx` (show auth state)

- [ ] **Step 1: Add Supabase session refresh to middleware**

Replace `depannage-ev/middleware.ts` with:
```ts
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Run intl middleware first (handles locale prefixing/redirects).
  const response = intlMiddleware(request);

  // Refresh the Supabase session and sync cookies onto the response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Create the OAuth callback route**

Create `depannage-ev/src/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/fr/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 3: Create the auth screen**

Create `depannage-ev/src/app/[locale]/auth/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

export default function AuthPage() {
  const t = useTranslations("auth");
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    router.push("/dashboard");
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);
    router.push("/dashboard");
  }

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 space-y-3">
        <input
          type="email"
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <button
          onClick={signIn}
          className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700"
        >
          {t("signIn")}
        </button>
        <button
          onClick={signUp}
          className="w-full rounded border border-slate-300 py-2 font-medium hover:bg-slate-50"
        >
          {t("signUp")}
        </button>
        <button
          onClick={google}
          className="w-full rounded border border-slate-300 py-2 font-medium hover:bg-slate-50"
        >
          {t("withGoogle")}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Show auth state in the header**

Because `AppHeader` currently is a server component using `useTranslations`, convert only the auth-dependent part into a server read. Replace `depannage-ev/src/components/AppHeader.tsx` with:
```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const t = await getTranslations();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          {t("app.name")}
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/explore" className="hover:text-emerald-700">
            {t("nav.explore")}
          </Link>
          <Link href="/host/new" className="hover:text-emerald-700">
            {t("nav.becomeHost")}
          </Link>
          {user ? (
            <Link href="/dashboard" className="hover:text-emerald-700">
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link href="/auth" className="hover:text-emerald-700">
              {t("nav.login")}
            </Link>
          )}
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
```
Note: `AppHeader` is now `async`; it is rendered inside an async Server Component layout, which supports awaiting.

- [ ] **Step 5: Enable Google OAuth (manual)**

In Supabase dashboard → Authentication → Providers → Google → enable and paste a Google OAuth client ID/secret (from Google Cloud Console → Credentials → OAuth client, Web type). Add authorized redirect URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. If you don't have Google credentials yet, skip enabling Google — email/password still works; the Google button will error until configured.

- [ ] **Step 6: Verify email auth end-to-end**

Run `npm run dev`. Go to http://localhost:3000/fr/auth. Sign up with a new email + password → should redirect to `/fr/dashboard` (404 page is fine for now — the dashboard route arrives in Phase 4). In Supabase → Authentication → Users, confirm the user exists, and in `profiles` table the row was auto-created. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/auth" src/app/auth/callback src/components/AppHeader.tsx middleware.ts
git commit -m "feat: email + Google auth, session refresh, auth-aware header"
```

---

## Task 13: Phase verification + README

**Files:**
- Create: `depannage-ev/README.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (pricing + LanguageSwitcher).

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Write the README**

Create `depannage-ev/README.md`:
```markdown
# Chargini — P2P EV Charging Marketplace (Tunisia)

Peer-to-peer EV home-charging marketplace. Next.js + Supabase. French (Arabic/RTL planned).

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill Supabase keys.
3. Apply `supabase/migrations/0001_init.sql` then `0002_rls.sql` in the Supabase SQL Editor.
4. `npm run seed` to load demo data.
5. `npm run dev` → http://localhost:3000

## Scripts
- `npm run dev` — dev server
- `npm test` — unit/component tests
- `npm run build` — production build
- `npm run seed` — seed demo data

## Status
Phase 1 (Foundation) complete: i18n, schema+RLS, auth, app shell.
See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the roadmap.
```

- [ ] **Step 4: Commit**

```bash
git add README.md && git commit -m "docs: add project README; Phase 1 foundation complete"
```

---

## Done criteria for Phase 1

- `npm run dev` serves a French home page at `/fr` with a working header + language indicator.
- `npm test` and `npm run build` both pass.
- Supabase has all 5 tables with RLS enabled and demo data seeded.
- A user can sign up / sign in with email (and Google if configured); a profile row is auto-created.
- Env secrets are gitignored; `.env.example` documents required vars.

**Next plan:** Plan 2 — Discovery (`/explore` map + list + filters, `/chargers/[id]` detail).
