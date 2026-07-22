export interface ListingInput {
  title: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  city: string;
  connectorType: string;
  powerKw: number | null;
  priceAmount: number | null;
  priceUnit: string;
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
}

export type ListingErrors = Partial<Record<keyof ListingInput, string>>;

const VALID_CONNECTOR_TYPES = ["type2", "type1", "ccs", "chademo", "schuko"];
const VALID_PRICE_UNITS = ["kwh", "hour"];

export function validateListing(input: ListingInput): ListingErrors {
  const errors: ListingErrors = {};

  // title: trimmed non-empty and length ≤ 120
  if (!input.title.trim() || input.title.trim().length > 120) {
    errors.title = "host.errors.titleRequired";
  }

  // address: trimmed non-empty
  if (!input.address.trim()) {
    errors.address = "host.errors.addressRequired";
  }

  // location: lat and lng both non-null, lat in [30,38], lng in [7,12]
  if (
    input.lat === null ||
    input.lng === null ||
    input.lat < 30 ||
    input.lat > 38 ||
    input.lng < 7 ||
    input.lng > 12
  ) {
    errors.lat = "host.errors.locationRequired";
  }

  // city: trimmed non-empty
  if (!input.city.trim()) {
    errors.city = "host.errors.cityRequired";
  }

  // connectorType: must be one of the allowed values
  if (!VALID_CONNECTOR_TYPES.includes(input.connectorType)) {
    errors.connectorType = "host.errors.connectorRequired";
  }

  // powerKw: non-null, > 0, ≤ 350
  if (input.powerKw === null || input.powerKw <= 0 || input.powerKw > 350) {
    errors.powerKw = "host.errors.powerInvalid";
  }

  // priceAmount: non-null, > 0
  if (input.priceAmount === null || input.priceAmount <= 0) {
    errors.priceAmount = "host.errors.priceInvalid";
  }

  // priceUnit: must be one of the allowed values
  if (!VALID_PRICE_UNITS.includes(input.priceUnit)) {
    errors.priceUnit = "host.errors.priceUnitRequired";
  }

  // availability: every row must have end_time > start_time (lexicographic)
  // An empty array is valid.
  if (
    input.availability.some((rule) => rule.end_time <= rule.start_time)
  ) {
    errors.availability = "host.errors.availabilityInvalid";
  }

  return errors;
}
