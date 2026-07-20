const DEFAULT_NEXT_PATH = "/fr";

/**
 * Validates that a caller-supplied "next" redirect target is a site-relative
 * path, to prevent open-redirect attacks (e.g. `?next=https://evil.com`,
 * `?next=//evil.com`, `?next=@evil.com`, `?next=.evil.com`).
 *
 * Anything that isn't a single leading `/` followed by a non-slash,
 * non-backslash character is rejected in favor of the default path.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT_PATH;
  if (!raw.startsWith("/")) return DEFAULT_NEXT_PATH;
  if (raw.startsWith("//")) return DEFAULT_NEXT_PATH;
  if (raw.startsWith("/\\")) return DEFAULT_NEXT_PATH;
  return raw;
}
