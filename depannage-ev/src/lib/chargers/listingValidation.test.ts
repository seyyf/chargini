import { describe, it, expect } from "vitest";
import { validateListing, ListingInput } from "./listingValidation";

const VALID_INPUT: ListingInput = {
  title: "Home CCS Charger",
  description: "Fast 50kW CCS charger in my garage.",
  address: "12 Rue de Tunis",
  lat: 36.8,
  lng: 10.18,
  city: "Tunis",
  connectorType: "ccs",
  powerKw: 50,
  priceAmount: 0.85,
  priceUnit: "kwh",
  availability: [
    { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
  ],
};

describe("validateListing — fully valid input", () => {
  it("returns an empty object for a completely valid listing", () => {
    expect(validateListing(VALID_INPUT)).toEqual({});
  });

  it("accepts an empty availability array (no schedule = valid)", () => {
    expect(validateListing({ ...VALID_INPUT, availability: [] })).toEqual({});
  });

  it("accepts a valid multi-row availability", () => {
    const input: ListingInput = {
      ...VALID_INPUT,
      availability: [
        { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 2, start_time: "09:00", end_time: "17:00" },
        { day_of_week: 6, start_time: "10:00:00", end_time: "14:00:00" },
      ],
    };
    expect(validateListing(input)).toEqual({});
  });
});

describe("validateListing — title", () => {
  it("errors when title is empty", () => {
    const errors = validateListing({ ...VALID_INPUT, title: "" });
    expect(errors.title).toBe("host.errors.titleRequired");
  });

  it("errors when title is only whitespace", () => {
    const errors = validateListing({ ...VALID_INPUT, title: "   " });
    expect(errors.title).toBe("host.errors.titleRequired");
  });

  it("errors when title exceeds 120 characters", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      title: "A".repeat(121),
    });
    expect(errors.title).toBe("host.errors.titleRequired");
  });

  it("accepts a title of exactly 120 characters", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      title: "A".repeat(120),
    });
    expect(errors.title).toBeUndefined();
  });
});

describe("validateListing — address", () => {
  it("errors when address is empty", () => {
    const errors = validateListing({ ...VALID_INPUT, address: "" });
    expect(errors.address).toBe("host.errors.addressRequired");
  });

  it("errors when address is only whitespace", () => {
    const errors = validateListing({ ...VALID_INPUT, address: "  " });
    expect(errors.address).toBe("host.errors.addressRequired");
  });
});

describe("validateListing — location (lat/lng)", () => {
  it("errors when lat is null", () => {
    const errors = validateListing({ ...VALID_INPUT, lat: null });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("errors when lng is null", () => {
    const errors = validateListing({ ...VALID_INPUT, lng: null });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("errors when lat is outside Tunisia bounds (too far north)", () => {
    const errors = validateListing({ ...VALID_INPUT, lat: 40 });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("errors when lat is outside Tunisia bounds (too far south)", () => {
    const errors = validateListing({ ...VALID_INPUT, lat: 29 });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("errors when lng is outside Tunisia bounds (too far east)", () => {
    const errors = validateListing({ ...VALID_INPUT, lng: 13 });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("errors when lng is outside Tunisia bounds (too far west)", () => {
    const errors = validateListing({ ...VALID_INPUT, lng: 6 });
    expect(errors.lat).toBe("host.errors.locationRequired");
  });

  it("accepts boundary values lat=30 and lng=7", () => {
    const errors = validateListing({ ...VALID_INPUT, lat: 30, lng: 7 });
    expect(errors.lat).toBeUndefined();
  });

  it("accepts boundary values lat=38 and lng=12", () => {
    const errors = validateListing({ ...VALID_INPUT, lat: 38, lng: 12 });
    expect(errors.lat).toBeUndefined();
  });
});

describe("validateListing — city", () => {
  it("errors when city is empty", () => {
    const errors = validateListing({ ...VALID_INPUT, city: "" });
    expect(errors.city).toBe("host.errors.cityRequired");
  });

  it("errors when city is only whitespace", () => {
    const errors = validateListing({ ...VALID_INPUT, city: "   " });
    expect(errors.city).toBe("host.errors.cityRequired");
  });
});

describe("validateListing — connectorType", () => {
  it("errors when connector type is not in the allowed list", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      connectorType: "unknown",
    });
    expect(errors.connectorType).toBe("host.errors.connectorRequired");
  });

  it("accepts all valid connector types", () => {
    for (const ct of ["type2", "type1", "ccs", "chademo", "schuko"]) {
      const errors = validateListing({ ...VALID_INPUT, connectorType: ct });
      expect(errors.connectorType).toBeUndefined();
    }
  });
});

describe("validateListing — powerKw", () => {
  it("errors when powerKw is null", () => {
    const errors = validateListing({ ...VALID_INPUT, powerKw: null });
    expect(errors.powerKw).toBe("host.errors.powerInvalid");
  });

  it("errors when powerKw is 0", () => {
    const errors = validateListing({ ...VALID_INPUT, powerKw: 0 });
    expect(errors.powerKw).toBe("host.errors.powerInvalid");
  });

  it("errors when powerKw is negative", () => {
    const errors = validateListing({ ...VALID_INPUT, powerKw: -1 });
    expect(errors.powerKw).toBe("host.errors.powerInvalid");
  });

  it("errors when powerKw exceeds 350", () => {
    const errors = validateListing({ ...VALID_INPUT, powerKw: 351 });
    expect(errors.powerKw).toBe("host.errors.powerInvalid");
  });

  it("accepts the boundary value of 350", () => {
    const errors = validateListing({ ...VALID_INPUT, powerKw: 350 });
    expect(errors.powerKw).toBeUndefined();
  });
});

describe("validateListing — priceAmount", () => {
  it("errors when priceAmount is null", () => {
    const errors = validateListing({ ...VALID_INPUT, priceAmount: null });
    expect(errors.priceAmount).toBe("host.errors.priceInvalid");
  });

  it("errors when priceAmount is 0", () => {
    const errors = validateListing({ ...VALID_INPUT, priceAmount: 0 });
    expect(errors.priceAmount).toBe("host.errors.priceInvalid");
  });

  it("errors when priceAmount is negative", () => {
    const errors = validateListing({ ...VALID_INPUT, priceAmount: -0.5 });
    expect(errors.priceAmount).toBe("host.errors.priceInvalid");
  });

  it("accepts a small positive priceAmount", () => {
    const errors = validateListing({ ...VALID_INPUT, priceAmount: 0.01 });
    expect(errors.priceAmount).toBeUndefined();
  });
});

describe("validateListing — priceUnit", () => {
  it("errors when priceUnit is not 'kwh' or 'hour'", () => {
    const errors = validateListing({ ...VALID_INPUT, priceUnit: "minute" });
    expect(errors.priceUnit).toBe("host.errors.priceUnitRequired");
  });

  it("accepts 'kwh'", () => {
    const errors = validateListing({ ...VALID_INPUT, priceUnit: "kwh" });
    expect(errors.priceUnit).toBeUndefined();
  });

  it("accepts 'hour'", () => {
    const errors = validateListing({ ...VALID_INPUT, priceUnit: "hour" });
    expect(errors.priceUnit).toBeUndefined();
  });
});

describe("validateListing — availability", () => {
  it("errors when any row has end_time <= start_time (same time)", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      availability: [
        { day_of_week: 1, start_time: "08:00", end_time: "08:00" },
      ],
    });
    expect(errors.availability).toBe("host.errors.availabilityInvalid");
  });

  it("errors when any row has end_time before start_time", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      availability: [
        { day_of_week: 1, start_time: "18:00", end_time: "08:00" },
      ],
    });
    expect(errors.availability).toBe("host.errors.availabilityInvalid");
  });

  it("errors when only one of multiple rows is invalid", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      availability: [
        { day_of_week: 1, start_time: "08:00", end_time: "18:00" }, // valid
        { day_of_week: 2, start_time: "20:00", end_time: "09:00" }, // invalid
      ],
    });
    expect(errors.availability).toBe("host.errors.availabilityInvalid");
  });

  it("does not error when all rows are valid", () => {
    const errors = validateListing({
      ...VALID_INPUT,
      availability: [
        { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 2, start_time: "09:00", end_time: "17:00" },
      ],
    });
    expect(errors.availability).toBeUndefined();
  });
});

describe("validateListing — multiple simultaneous errors", () => {
  it("returns errors for every invalid field at once", () => {
    const errors = validateListing({
      title: "",
      description: "",
      address: "",
      lat: null,
      lng: null,
      city: "",
      connectorType: "bad",
      powerKw: null,
      priceAmount: null,
      priceUnit: "bad",
      availability: [],
    });
    expect(errors.title).toBe("host.errors.titleRequired");
    expect(errors.address).toBe("host.errors.addressRequired");
    expect(errors.lat).toBe("host.errors.locationRequired");
    expect(errors.city).toBe("host.errors.cityRequired");
    expect(errors.connectorType).toBe("host.errors.connectorRequired");
    expect(errors.powerKw).toBe("host.errors.powerInvalid");
    expect(errors.priceAmount).toBe("host.errors.priceInvalid");
    expect(errors.priceUnit).toBe("host.errors.priceUnitRequired");
  });
});
