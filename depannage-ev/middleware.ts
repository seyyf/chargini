import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  let response = intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Per Supabase's SSR cookie contract, refreshed cookies must be
          // mirrored onto the request (so getAll() and downstream Server
          // Components see the new token on THIS request) and onto the
          // response (so the browser receives it). Mutating request.cookies
          // and only then rebuilding the response ensures the intl
          // middleware's response carries the updated request headers.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = intlMiddleware(request);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|auth/callback|.*\\..*).*)"],
};
