import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HeaderNav } from "./HeaderNav";

// Server wrapper: reads the validated session, then hands a plain boolean to the
// animated client nav (which owns interactivity, the mobile menu and motion).
export async function AppHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HeaderNav isAuthed={Boolean(user)} />;
}
