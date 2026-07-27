/**
 * French transactional-email templates for booking lifecycle events.
 * Pure functions — no I/O — so they can be unit-tested.
 */

export type BookingEmailKind =
  | "requested" // → host: a driver requested a slot
  | "confirmed" // → driver: the host accepted
  | "declined" //  → driver: the host declined
  | "cancelled" // → host: the driver cancelled
  | "completed"; // → driver: charge done, invite to review

export interface BookingEmailParams {
  chargerTitle: string;
  /** e.g. "lundi 3 août · 10:00 – 12:00" */
  slotLabel: string;
  /** Absolute link to the booking page. */
  url: string;
  /** Display name of the other participant (may be empty). */
  counterpartName: string;
}

interface EmailContent {
  subject: string;
  heading: string;
  body: string;
  cta: string;
}

function contentFor(kind: BookingEmailKind, p: BookingEmailParams): EmailContent {
  const who = p.counterpartName || "Un membre";
  switch (kind) {
    case "requested":
      return {
        subject: `Nouvelle demande de réservation — ${p.chargerTitle}`,
        heading: "Nouvelle demande de réservation",
        body: `${who} souhaite recharger sur « ${p.chargerTitle} » le ${p.slotLabel}. Acceptez ou refusez la demande depuis votre tableau de bord.`,
        cta: "Voir la demande",
      };
    case "confirmed":
      return {
        subject: `Réservation acceptée — ${p.chargerTitle}`,
        heading: "Votre réservation est acceptée ✅",
        body: `${who} a accepté votre réservation sur « ${p.chargerTitle} » le ${p.slotLabel}. Le paiement éventuel se règle en main propre, sur place.`,
        cta: "Voir ma réservation",
      };
    case "declined":
      return {
        subject: `Réservation refusée — ${p.chargerTitle}`,
        heading: "Réservation refusée",
        body: `Votre demande pour « ${p.chargerTitle} » le ${p.slotLabel} a été refusée. D'autres bornes sont disponibles sur Chargini.`,
        cta: "Trouver une autre borne",
      };
    case "cancelled":
      return {
        subject: `Réservation annulée — ${p.chargerTitle}`,
        heading: "Réservation annulée",
        body: `${who} a annulé sa réservation sur « ${p.chargerTitle} » le ${p.slotLabel}. Le créneau est de nouveau disponible.`,
        cta: "Voir la réservation",
      };
    case "completed":
      return {
        subject: `Recharge terminée — ${p.chargerTitle}`,
        heading: "Recharge terminée ⚡",
        body: `Votre recharge sur « ${p.chargerTitle} » (${p.slotLabel}) est terminée. Laissez un avis pour aider la communauté !`,
        cta: "Laisser un avis",
      };
  }
}

/** Escapes HTML special characters (charger titles and names are user input). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bookingEmail(
  kind: BookingEmailKind,
  p: BookingEmailParams,
): { subject: string; html: string; text: string } {
  // Subject + plain text use the raw values; the HTML body uses escaped ones.
  const c = contentFor(kind, p);
  const cHtml = contentFor(kind, {
    chargerTitle: esc(p.chargerTitle),
    slotLabel: esc(p.slotLabel),
    url: p.url,
    counterpartName: esc(p.counterpartName),
  });
  const text = `${c.heading}\n\n${c.body}\n\n${c.cta} : ${p.url}\n\n— Chargini · Initiative 100% bénévole`;
  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f2fbfd;font-family:Arial,Helvetica,sans-serif;color:#06202b;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #cffafe;border-radius:16px;overflow:hidden;">
      <div style="background:#06202b;padding:20px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:bold;">Charg<span style="color:#22d3ee;">ini</span></span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#06202b;">${cHtml.heading}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#35525f;">${cHtml.body}</p>
        <a href="${esc(p.url)}" style="display:inline-block;background:#06202b;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:12px;">${cHtml.cta}</a>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #cffafe;">
        <p style="margin:0;font-size:12px;color:#6b8592;">Chargini · La recharge entre particuliers en Tunisie · Initiative 100% bénévole</p>
      </div>
    </div>
  </body>
</html>`;
  return { subject: c.subject, html, text };
}
