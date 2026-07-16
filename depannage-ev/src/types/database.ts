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
