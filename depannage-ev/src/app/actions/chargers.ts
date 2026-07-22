"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  validateListing,
  type ListingInput,
} from "@/lib/chargers/listingValidation";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Strip path separators and shell-unsafe chars from an upload filename. */
function sanitize(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "_");
}

type AvailabilityRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

interface ParsedFormData {
  input: ListingInput;
  photos: File[];
}

function parseListingFormData(formData: FormData): ParsedFormData {
  const str = (key: string) => (formData.get(key) as string | null) ?? "";
  const num = (key: string): number | null => {
    const v = str(key);
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  let availability: AvailabilityRow[] = [];
  const rawAvailability = str("availability");
  if (rawAvailability) {
    try {
      availability = JSON.parse(rawAvailability) as AvailabilityRow[];
    } catch {
      availability = [];
    }
  }

  const photos = (formData.getAll("photos") as File[]).filter(
    (f) => f instanceof File && f.size > 0,
  );

  const input: ListingInput = {
    title: str("title"),
    description: str("description"),
    address: str("address"),
    city: str("city"),
    connectorType: str("connectorType"),
    priceUnit: str("priceUnit"),
    lat: num("lat"),
    lng: num("lng"),
    powerKw: num("powerKw"),
    priceAmount: num("priceAmount"),
    availability,
  };

  return { input, photos };
}

// ── createCharger ─────────────────────────────────────────────────────────────

export async function createCharger(
  formData: FormData,
): Promise<{ error?: string; chargerId?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "host.loginRequired" };

  const { input, photos } = parseListingFormData(formData);
  const errors = validateListing(input);
  if (Object.keys(errors).length > 0) {
    return { error: Object.values(errors)[0] };
  }

  // Insert charger row via USER client (RLS enforces host_id = auth.uid())
  const { data: chargerRow, error: insertError } = await supabase
    .from("chargers")
    .insert({
      host_id: user.id,
      title: input.title,
      description: input.description,
      address: input.address,
      lat: input.lat as number,
      lng: input.lng as number,
      city: input.city,
      connector_type: input.connectorType,
      power_kw: input.powerKw as number,
      price_amount: input.priceAmount as number,
      price_unit: input.priceUnit,
      photos: [] as string[],
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError || !chargerRow) {
    console.error("[createCharger] insert error:", insertError);
    return { error: "host.errors.generic" };
  }

  const chargerId: string = chargerRow.id as string;

  // Upload photos via ADMIN client (bypasses Storage RLS) then update row
  if (photos.length > 0) {
    const admin = createSupabaseAdminClient();
    const urls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = `${user.id}/${chargerId}/${i}-${sanitize(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from("charger-photos")
        .upload(path, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("[createCharger] upload error:", uploadError);
        return { error: "host.errors.uploadFailed" };
      }

      const { data: urlData } = admin.storage
        .from("charger-photos")
        .getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }

    // Update row with photo URLs via USER client
    await supabase.from("chargers").update({ photos: urls }).eq("id", chargerId);
  }

  // Insert availability rules via USER client
  if (input.availability.length > 0) {
    await supabase.from("availability_rules").insert(
      input.availability.map((rule) => ({
        charger_id: chargerId,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
      })),
    );
  }

  return { chargerId };
}

// ── updateCharger ─────────────────────────────────────────────────────────────

export async function updateCharger(
  id: string,
  formData: FormData,
): Promise<{ error?: string; chargerId?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "host.loginRequired" };

  const { input, photos } = parseListingFormData(formData);
  const errors = validateListing(input);
  if (Object.keys(errors).length > 0) {
    return { error: Object.values(errors)[0] };
  }

  // Parse existing photo URLs sent from the client form
  let existingPhotos: string[] = [];
  const rawExisting = (formData.get("existingPhotos") as string | null) ?? "";
  if (rawExisting) {
    try {
      existingPhotos = JSON.parse(rawExisting) as string[];
    } catch {
      existingPhotos = [];
    }
  }

  // Update row via USER client — RLS returns 0 rows if caller is not owner
  const { data: updated } = await supabase
    .from("chargers")
    .update({
      title: input.title,
      description: input.description,
      address: input.address,
      lat: input.lat as number,
      lng: input.lng as number,
      city: input.city,
      connector_type: input.connectorType,
      power_kw: input.powerKw as number,
      price_amount: input.priceAmount as number,
      price_unit: input.priceUnit,
    })
    .eq("id", id)
    .select("id");

  if (!updated || updated.length === 0) {
    return { error: "host.notOwner" };
  }

  // Upload new photos via ADMIN client and append their URLs
  let finalPhotos = existingPhotos;
  if (photos.length > 0) {
    const admin = createSupabaseAdminClient();
    const newUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const path = `${user.id}/${id}/${Date.now()}-${i}-${sanitize(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from("charger-photos")
        .upload(path, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("[updateCharger] upload error:", uploadError);
        return { error: "host.errors.uploadFailed" };
      }

      const { data: urlData } = admin.storage
        .from("charger-photos")
        .getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    finalPhotos = [...existingPhotos, ...newUrls];
  }

  // Update photos via USER client
  await supabase
    .from("chargers")
    .update({ photos: finalPhotos })
    .eq("id", id);

  // Replace availability rules: delete existing then insert new set
  await supabase.from("availability_rules").delete().eq("charger_id", id);

  if (input.availability.length > 0) {
    await supabase.from("availability_rules").insert(
      input.availability.map((rule) => ({
        charger_id: id,
        day_of_week: rule.day_of_week,
        start_time: rule.start_time,
        end_time: rule.end_time,
      })),
    );
  }

  return { chargerId: id };
}
