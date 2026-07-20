/**
 * RLS / hardening test harness.
 *
 *   npx tsx supabase/rls-test.ts
 *
 * Proves the holes found in the Phase 1 review are closed. Everything an
 * attacker would have runs through the PUBLISHABLE key (anonymous, or signed in
 * as the demo driver); the SECRET key is only used to clean up afterwards.
 *
 * Expect several FAILs until supabase/migrations/0003_rls_hardening.sql has been
 * applied — that is the point: the harness has to be able to detect the holes.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local manually (no framework here).
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const DRIVER_EMAIL = "driver@example.com";
const DRIVER_PASSWORD = "Password123!";

let failures = 0;
let passes = 0;

function pass(name: string, detail: string) {
  passes++;
  console.log(`PASS  ${name}\n        ${detail}`);
}

function fail(name: string, detail: string) {
  failures++;
  console.log(`FAIL  ${name}\n        ${detail}`);
}

function check(name: string, ok: boolean, detail: string) {
  if (ok) pass(name, detail);
  else fail(name, detail);
}

/** Booking total, mirroring src/lib/pricing.ts and the SQL trigger. */
function expectedTotal(
  priceUnit: string,
  priceAmount: number,
  powerKw: number,
  hours: number,
): number {
  const raw =
    priceUnit === "hour" ? priceAmount * hours : priceAmount * powerKw * hours;
  return Math.round((raw + Number.EPSILON) * 1000) / 1000;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const secret = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !publishable || !secret) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const opts = { auth: { autoRefreshToken: false, persistSession: false } };
  const anon: SupabaseClient = createClient(url, publishable, opts);
  const driver: SupabaseClient = createClient(url, publishable, opts);
  const admin: SupabaseClient = createClient(url, secret, opts);

  console.log("RLS hardening checks\n");

  // ---------------------------------------------------------------- 1
  {
    const { data, error } = await anon.from("chargers").select("id");
    if (error) {
      fail("1. anon can read chargers", `unexpected error: ${error.message}`);
    } else {
      check(
        "1. anon can read chargers",
        data.length === 18,
        `expected 18 rows, got ${data.length}`,
      );
    }
  }

  // ---------------------------------------------------------------- 2
  {
    const { data, error } = await anon.from("bookings").select("id");
    if (error) {
      pass("2. anon cannot read bookings", `blocked: ${error.message}`);
    } else {
      check(
        "2. anon cannot read bookings",
        data.length === 0,
        `expected 0 rows, got ${data.length}`,
      );
    }
  }

  // ---------------------------------------------------------------- 3
  {
    const { data: host } = await anon.from("chargers").select("host_id").limit(1).single();
    const { error } = await anon.from("chargers").insert({
      host_id: host?.host_id ?? "00000000-0000-0000-0000-000000000000",
      title: "RLS TEST - should not exist",
      address: "nowhere",
      lat: 36.8,
      lng: 10.18,
      city: "Tunis",
      connector_type: "type2",
      power_kw: 7,
      price_amount: 1,
      price_unit: "hour",
    });
    check(
      "3. anon cannot insert a charger",
      error !== null,
      error ? `blocked: ${error.message}` : "INSERT SUCCEEDED — anon can create listings",
    );
  }

  // ---------------------------------------------------------------- 4
  {
    const { data, error } = await anon.from("profiles").select("id, phone").limit(5);
    if (error) {
      pass("4. anon cannot read profiles.phone", `blocked: ${error.message}`);
    } else {
      const leaked = data.some((r) => "phone" in r);
      check(
        "4. anon cannot read profiles.phone",
        !leaked,
        leaked
          ? `phone column returned for ${data.length} profile row(s)`
          : "no phone field present in the response",
      );
    }
  }

  // ---- sign in as the demo driver -------------------------------------------
  const { data: session, error: signInError } = await driver.auth.signInWithPassword({
    email: DRIVER_EMAIL,
    password: DRIVER_PASSWORD,
  });
  if (signInError || !session.user) {
    fail("sign in as driver", signInError?.message ?? "no user returned");
    console.log("\nCannot continue without a signed-in driver.");
    process.exit(1);
  }
  const driverId = session.user.id;
  console.log(`\n(signed in as ${DRIVER_EMAIL} -> ${driverId})\n`);

  // ---------------------------------------------------------------- 5
  {
    const { error } = await driver
      .from("profiles")
      .update({ is_verified: true, rating_avg: 5.0, rating_count: 412 })
      .eq("id", driverId);

    const { data: after } = await admin
      .from("profiles")
      .select("is_verified, rating_avg, rating_count")
      .eq("id", driverId)
      .single();

    const escalated =
      after?.is_verified === true ||
      Number(after?.rating_avg) === 5 ||
      Number(after?.rating_count) === 412;

    check(
      "5. driver cannot self-verify / self-rate",
      !escalated,
      escalated
        ? `ESCALATED: is_verified=${after?.is_verified} rating_avg=${after?.rating_avg} rating_count=${after?.rating_count}`
        : `blocked (${error ? error.message : "update was a no-op"}); is_verified=${after?.is_verified}`,
    );

    if (escalated) {
      // Undo the damage this harness just did to live data.
      await admin
        .from("profiles")
        .update({ is_verified: false, rating_avg: 0, rating_count: 0 })
        .eq("id", driverId);
      console.log("        (reset the driver profile with the secret key)");
    }
  }

  // ---- pick an active charger and a free time window ------------------------
  const { data: charger, error: chargerError } = await anon
    .from("chargers")
    .select("id, host_id, price_amount, price_unit, power_kw")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (chargerError || !charger) {
    fail("load a charger", chargerError?.message ?? "no active charger found");
    process.exit(1);
  }

  // Far-future, unique per run so the no-overlap constraint never trips.
  const start = new Date(Date.now() + 86_400_000 * 365 + (Date.now() % 1_000_000));
  const end = new Date(start.getTime() + 2.5 * 3600_000); // 2.5 hours
  const hours = 2.5;
  const want = expectedTotal(
    charger.price_unit,
    Number(charger.price_amount),
    Number(charger.power_kw),
    hours,
  );

  // ---------------------------------------------------------------- 6
  {
    const { data, error } = await driver
      .from("bookings")
      .insert({
        charger_id: charger.id,
        driver_id: driverId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "confirmed",
        total_price: 0,
      })
      .select("id")
      .maybeSingle();

    check(
      "6. driver cannot insert a pre-confirmed booking",
      error !== null,
      error
        ? `blocked: ${error.message}`
        : "INSERT SUCCEEDED — driver bypassed the host's accept/decline",
    );
    if (!error && data?.id) await admin.from("bookings").delete().eq("id", data.id);
  }

  // ---------------------------------------------------------------- 7
  let pendingBookingId: string | null = null;
  {
    const { data, error } = await driver
      .from("bookings")
      .insert({
        charger_id: charger.id,
        driver_id: driverId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "pending",
        total_price: 0, // the server must overwrite this
      })
      .select("id, total_price, status")
      .single();

    if (error || !data) {
      fail(
        "7. pending booking is priced server-side",
        `insert failed: ${error?.message ?? "no row returned"}`,
      );
    } else {
      pendingBookingId = data.id;
      const stored = Number(data.total_price);
      check(
        "7. pending booking is priced server-side",
        stored > 0 && Math.abs(stored - want) < 0.001,
        stored > 0
          ? `stored total_price=${stored}, expected ${want} (${charger.price_unit} @ ${charger.price_amount}, ${charger.power_kw}kW, ${hours}h)`
          : `stored total_price=${stored} — the client-sent 0 was trusted`,
      );
    }
  }

  // ---------------------------------------------------------------- 8
  {
    if (!pendingBookingId) {
      fail(
        "8. no review on a non-completed booking",
        "skipped — check 7 did not produce a pending booking to test against",
      );
    } else {
      const { data, error } = await driver
        .from("reviews")
        .insert({
          booking_id: pendingBookingId,
          reviewer_id: driverId,
          reviewee_id: charger.host_id,
          rating: 5,
          comment: "RLS TEST - should not exist",
        })
        .select("id")
        .maybeSingle();

      check(
        "8. no review on a non-completed booking",
        error !== null,
        error
          ? `blocked: ${error.message}`
          : "INSERT SUCCEEDED — a pending booking can be reviewed",
      );
      if (!error && data?.id) await admin.from("reviews").delete().eq("id", data.id);
    }
  }

  // ---------------------------------------------------------------- 9
  // Review bombing: with a legitimate COMPLETED booking, the driver must only be
  // able to review its actual counterparty (the charger's host), never an
  // unrelated third-party profile. Admin sets up a real completed booking so the
  // driver is a genuine participant, isolating the reviewee_id constraint from
  // the "booking must be completed" check exercised by 8.
  {
    // A host that is NOT this charger's host, to serve as the bomb target.
    const { data: others } = await admin
      .from("chargers")
      .select("host_id")
      .neq("host_id", charger.host_id)
      .limit(1);
    const thirdPartyId = others?.[0]?.host_id as string | undefined;

    // Admin-create a completed booking for the driver on this charger. The
    // no-overlap constraint only covers pending/confirmed, so 'completed' is
    // free to sit on the same slot as the check-7 booking.
    const cStart = new Date(start.getTime() + 10 * 3600_000);
    const cEnd = new Date(cStart.getTime() + 3600_000);
    const { data: completed, error: setupErr } = await admin
      .from("bookings")
      .insert({
        charger_id: charger.id,
        driver_id: driverId,
        start_time: cStart.toISOString(),
        end_time: cEnd.toISOString(),
        status: "completed",
        total_price: 1,
      })
      .select("id")
      .single();

    if (setupErr || !completed || !thirdPartyId) {
      fail(
        "9. review bombing is blocked",
        `setup failed: ${setupErr?.message ?? "no completed booking or third-party host found"}`,
      );
    } else {
      // 9a — bomb: review an unrelated third party. Must be blocked.
      const { data: bomb, error: bombErr } = await driver
        .from("reviews")
        .insert({
          booking_id: completed.id,
          reviewer_id: driverId,
          reviewee_id: thirdPartyId,
          rating: 1,
          comment: "RLS TEST - should not exist",
        })
        .select("id")
        .maybeSingle();

      check(
        "9a. driver cannot review an unrelated third party",
        bombErr !== null,
        bombErr
          ? `blocked: ${bombErr.message}`
          : `INSERT SUCCEEDED — driver review-bombed host ${thirdPartyId}`,
      );
      if (!bombErr && bomb?.id) await admin.from("reviews").delete().eq("id", bomb.id);

      // 9b — legitimate: review the actual counterparty. Must succeed.
      const { data: legit, error: legitErr } = await driver
        .from("reviews")
        .insert({
          booking_id: completed.id,
          reviewer_id: driverId,
          reviewee_id: charger.host_id,
          rating: 5,
          comment: "RLS TEST - should not exist",
        })
        .select("id, reviewee_id")
        .maybeSingle();

      check(
        "9b. driver can review the booking's real counterparty",
        legitErr === null && legit?.reviewee_id === charger.host_id,
        legitErr
          ? `unexpectedly blocked: ${legitErr.message}`
          : `inserted review for reviewee_id=${legit?.reviewee_id} (host_id=${charger.host_id})`,
      );
      if (legit?.id) await admin.from("reviews").delete().eq("id", legit.id);
    }

    if (completed?.id) await admin.from("bookings").delete().eq("id", completed.id);
  }

  // ---- cleanup --------------------------------------------------------------
  if (pendingBookingId) {
    await admin.from("bookings").delete().eq("id", pendingBookingId);
  }
  await admin.from("chargers").delete().eq("title", "RLS TEST - should not exist");
  await admin.from("reviews").delete().eq("comment", "RLS TEST - should not exist");
  await driver.auth.signOut();

  const total = passes + failures;
  console.log(
    failures === 0
      ? `\nAll ${total} checks passed.`
      : `\n${failures} of ${total} check(s) FAILED — apply supabase/migrations/0003_rls_hardening.sql.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
