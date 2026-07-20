/**
 * Maps a Supabase Auth error to a translation key under the `auth.errors`
 * namespace in messages/fr.json, so the UI never leaks raw English error
 * text. Falls back to `generic` for anything unmapped.
 */
const CODE_TO_KEY: Record<string, string> = {
  invalid_credentials: "invalidCredentials",
  user_already_exists: "userAlreadyExists",
  email_exists: "userAlreadyExists",
  identity_already_exists: "userAlreadyExists",
  email_not_confirmed: "emailNotConfirmed",
  weak_password: "weakPassword",
  email_address_invalid: "emailInvalid",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "rateLimited",
};

export function authErrorKey(
  error: { code?: string | null; message?: string | null } | null | undefined,
): string {
  const code = error?.code;
  if (code && code in CODE_TO_KEY) {
    return CODE_TO_KEY[code];
  }
  return "generic";
}
