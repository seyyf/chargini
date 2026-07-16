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
  process.env.SUPABASE_SECRET_KEY!,
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
