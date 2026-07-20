"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorKey } from "@/lib/authErrors";

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { error: callbackError } = use(searchParams);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? t("callbackError") : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(t(`errors.${authErrorKey(error)}`));
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleSignUp() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(t(`errors.${authErrorKey(error)}`));
      return;
    }
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setMessage(t("checkEmail"));
  }

  async function handleGoogle() {
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(t(`errors.${authErrorKey(error)}`));
    }
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          {t("email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          {t("password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none"
            autoComplete="current-password"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleSignIn}
            className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {t("signIn")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSignUp}
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {t("signUp")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogle}
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {t("withGoogle")}
          </button>
        </div>
      </form>
    </section>
  );
}
