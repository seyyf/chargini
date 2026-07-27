"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getNotificationsForUser,
  getUnreadCount,
  type NotificationItem,
} from "@/lib/notifications/queries";

export interface NotificationsData {
  count: number;
  items: NotificationItem[];
}

/** Current user's unread count + recent notifications (empty when logged out). */
export async function fetchNotifications(): Promise<NotificationsData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, items: [] };

  const [items, count] = await Promise.all([
    getNotificationsForUser(supabase, user.id),
    getUnreadCount(supabase, user.id),
  ]);
  return { count, items };
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}
