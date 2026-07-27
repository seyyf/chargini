import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bookingEmail, type BookingEmailKind } from "./templates";

/**
 * Sends the booking-lifecycle email for `bookingId` to the right participant.
 *
 * Configured entirely by env vars (SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS / EMAIL_FROM / NEXT_PUBLIC_SITE_URL). When SMTP is not
 * configured, this is a logged no-op — email is an enhancement, never a
 * requirement, and a failure must never break the booking flow.
 */
export async function sendBookingEmail(
  bookingId: string,
  kind: BookingEmailKind,
): Promise<void> {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(`[email] SMTP not configured — skipping "${kind}" email`);
      return;
    }

    const admin = createSupabaseAdminClient();

    const { data: bk } = await admin
      .from("bookings")
      .select("charger_id, driver_id, start_time, end_time")
      .eq("id", bookingId)
      .single();
    if (!bk) return;

    const { data: charger } = await admin
      .from("chargers")
      .select("title, host_id")
      .eq("id", bk.charger_id)
      .single();
    if (!charger) return;

    // Host receives request/cancellation; driver receives the rest.
    const toHost = kind === "requested" || kind === "cancelled";
    const recipientId = toHost ? charger.host_id : bk.driver_id;
    const counterpartId = toHost ? bk.driver_id : charger.host_id;

    const { data: userData } = await admin.auth.admin.getUserById(recipientId);
    const to = userData?.user?.email;
    if (!to) return;

    const { data: counterpart } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", counterpartId)
      .single();

    // Booking times shown in Tunisian local time (the server may run in UTC).
    const start = new Date(bk.start_time as string);
    const end = new Date(bk.end_time as string);
    const dayFmt = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Africa/Tunis",
    });
    const timeFmt = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Tunis",
    });
    const slotLabel = `${dayFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;

    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://chargini.netlify.app";
    const mail = bookingEmail(kind, {
      chargerTitle: charger.title as string,
      slotLabel,
      url: `${site}/bookings/${bookingId}`,
      counterpartName: (counterpart?.full_name as string) ?? "",
    });

    const port = Number(SMTP_PORT ?? 587);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? SMTP_USER,
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (e) {
    // Best-effort by design: log and move on.
    console.error(`[email] failed to send "${kind}" email:`, e);
  }
}
