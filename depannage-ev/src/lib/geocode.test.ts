import { describe, it, expect } from "vitest";
import { composeStreetAddress, cityOf } from "./geocode";

describe("composeStreetAddress", () => {
  it("joins house number and road", () => {
    expect(
      composeStreetAddress({ house_number: "12", road: "Avenue Habib Bourguiba" }),
    ).toBe("12 Avenue Habib Bourguiba");
  });

  it("returns the road alone when there is no house number", () => {
    expect(composeStreetAddress({ road: "Rue de Marseille" })).toBe(
      "Rue de Marseille",
    );
  });

  it("falls back to pedestrian ways, then suburb, then neighbourhood", () => {
    expect(composeStreetAddress({ pedestrian: "Rue piétonne" })).toBe(
      "Rue piétonne",
    );
    expect(composeStreetAddress({ suburb: "La Marsa Plage" })).toBe(
      "La Marsa Plage",
    );
    expect(composeStreetAddress({ neighbourhood: "Cité Ennasr" })).toBe(
      "Cité Ennasr",
    );
  });

  it("returns an empty string when nothing usable exists", () => {
    expect(composeStreetAddress({})).toBe("");
  });
});

describe("cityOf", () => {
  it("prefers city, then town, then village, then county", () => {
    expect(cityOf({ city: "Tunis", town: "x" })).toBe("Tunis");
    expect(cityOf({ town: "La Marsa" })).toBe("La Marsa");
    expect(cityOf({ village: "Takelsa" })).toBe("Takelsa");
    expect(cityOf({ county: "Nabeul" })).toBe("Nabeul");
    expect(cityOf({})).toBe("");
  });
});
