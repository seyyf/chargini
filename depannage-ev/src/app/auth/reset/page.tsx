"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, KeyRound, CircleCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorKey } from "@/lib/authErrors";
import { LogoMark } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";

type Status = "checking" | "ready" | "invalid" | "done";

/**
 * Password-reset landing page. The emailed recovery link goes through
 * /auth/callback (code → session), then redirects here where the now-signed-in
 * user chooses a new password.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The recovery link must have produced a session; without one the link is
  // invalid or expired.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setStatus(user ? "ready" : "invalid");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(t(`errors.${authErrorKey(error)}`));
      return;
    }
    setStatus("done");
    // Recovery session is a real session — send them home signed in.
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-10">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-xl font-bold text-ink">
            Charg<span className="text-gradient">ini</span>
          </span>
        </div>

        {status === "checking" && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" />…
          </div>
        )}

        {status === "invalid" && (
          <div className="py-4">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {t("reset.invalid")}
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
            >
              {t("reset.backToAuth")}
            </Link>
          </div>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-charge-500/10 text-charge-600">
              <CircleCheck className="h-6 w-6" />
            </span>
            <p className="font-medium text-ink">{t("reset.success")}</p>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h1 className="inline-flex items-center gap-2 font-display text-xl font-bold text-ink">
                <KeyRound className="h-5 w-5 text-brand-600" />
                {t("reset.title")}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">{t("reset.intro")}</p>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              {t("password")}
              <PasswordInput
                value={password}
                onChange={setPassword}
                minLength={6}
                autoComplete="new-password"
              />
              <span className="text-xs font-normal text-ink-faint">
                {t("passwordHint")}
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("reset.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
