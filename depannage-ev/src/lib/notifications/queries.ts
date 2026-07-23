import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/types/database";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  bookingId: string | null;
  isRead: boolean;
  createdAt: string;
  chargerTitle: string | null;
}

/** Shape of a notification row with its booking → charger title embedded. */
type NotificationRow = {
  id: string;
  type: NotificationType;
  booking_id: string | null;
  is_read: boolean;
  created_at: string;
  bookings: { chargers: { title: string } | null } | null;
};

/** Most recent notifications for a user, newest first. */
export async function getNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, booking_id, is_read, created_at, bookings(chargers(title))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as NotificationRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    bookingId: n.booking_id,
    isRead: n.is_read,
    createdAt: n.created_at,
    chargerTitle: n.bookings?.chargers?.title ?? null,
  }));
}

/** Count of unread notifications for a user. */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return count ?? 0;
}
