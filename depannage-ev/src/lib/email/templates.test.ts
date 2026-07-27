import { describe, it, expect } from "vitest";
import { bookingEmail, type BookingEmailKind } from "./templates";

const PARAMS = {
  chargerTitle: "Borne Type 2 à Tunis",
  slotLabel: "lundi 3 août · 10:00 – 12:00",
  url: "https://chargini.netlify.app/bookings/abc",
  counterpartName: "Amine",
};

const KINDS: BookingEmailKind[] = [
  "requested",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
];

describe("bookingEmail", () => {
  it("includes the charger title in every subject", () => {
    for (const kind of KINDS) {
      expect(bookingEmail(kind, PARAMS).subject).toContain(PARAMS.chargerTitle);
    }
  });

  it("includes the slot and the booking link in every body", () => {
    for (const kind of KINDS) {
      const { html, text } = bookingEmail(kind, PARAMS);
      expect(html).toContain(PARAMS.slotLabel);
      expect(html).toContain(PARAMS.url);
      expect(text).toContain(PARAMS.url);
    }
  });

  it("addresses the right event per kind", () => {
    expect(bookingEmail("requested", PARAMS).subject).toContain(
      "Nouvelle demande",
    );
    expect(bookingEmail("confirmed", PARAMS).subject).toContain("acceptée");
    expect(bookingEmail("declined", PARAMS).subject).toContain("refusée");
    expect(bookingEmail("cancelled", PARAMS).subject).toContain("annulée");
    expect(bookingEmail("completed", PARAMS).subject).toContain("terminée");
  });

  it("names the counterpart in the requested email", () => {
    expect(bookingEmail("requested", PARAMS).html).toContain("Amine");
  });

  it("escapes HTML in user-controlled fields (no injection into the email)", () => {
    const { html, text } = bookingEmail("requested", {
      ...PARAMS,
      chargerTitle: `<img src=x onerror=alert(1)> & "borne"`,
      counterpartName: "<b>Evil</b>",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    // Plain-text part stays raw (no HTML context to inject into).
    expect(text).toContain("<img src=x");
  });

  it("falls back gracefully when the counterpart has no name", () => {
    const { html } = bookingEmail("requested", {
      ...PARAMS,
      counterpartName: "",
    });
    expect(html).toContain("Un membre");
  });
});
