"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail, Loader2, ShieldCheck, MapPin, Star, ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { authErrorKey } from "@/lib/authErrors";
import { LogoMark } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";

type AuthMode = "signin" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const reduce = useReducedMotion();
  const { error: callbackError } = use(searchParams);

  const [mode, setMode] = useState<AuthMode>("signin");
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? t("callbackError") : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Switching tabs keeps the typed email/password but clears feedback.
  function switchMode(next: AuthMode) {
    if (next === mode && !forgot) return;
    setMode(next);
    setForgot(false);
    setError(null);
    setMessage(null);
  }

  function openForgot() {
    setForgot(true);
    setError(null);
    setMessage(null);
  }

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

  async function handleForgot() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setLoading(false);
    if (error) {
      setError(t(`errors.${authErrorKey(error)}`));
      return;
    }
    // Anti-enumeration: same message whether or not the account exists.
    setMessage(t("forgot.sent"));
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

  const tabs: Array<{ key: AuthMode; label: string }> = [
    { key: "signin", label: t("tabSignIn") },
    { key: "signup", label: t("tabSignUp") },
  ];

  return (
    <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-stretch gap-8 px-4 py-8 md:grid-cols-2 md:px-6">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden rounded-3xl bg-mesh-dark p-10 md:flex md:flex-col md:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold text-white">
            Charg<span className="text-gradient-bright">ini</span>
          </span>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            {t("brandLine")}
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              { icon: MapPin, label: "Des bornes partout en Tunisie" },
              { icon: ShieldCheck, label: "Hôtes vérifiés et notés" },
              { icon: Star, label: "100% bénévole, sans commission" },
            ].map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-brand-300 ring-1 ring-white/10">
                  <f.icon className="h-5 w-5" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-sm text-white/40">Chargini · Tunisie</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-10">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-xl font-bold text-ink">
              Charg<span className="text-gradient">ini</span>
            </span>
          </div>

          <h1 className="sr-only">{t("title")}</h1>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label={t("title")}
            className="mb-7 grid grid-cols-2 gap-1 rounded-xl border border-brand-100 bg-surface/60 p-1"
          >
            {tabs.map((tab) => {
              const active = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(tab.key)}
                  className={`relative cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active ? "text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {active &&
                    (reduce ? (
                      <span className="absolute inset-0 rounded-lg bg-ink" />
                    ) : (
                      <motion.span
                        layoutId="auth-tab-pill"
                        className="absolute inset-0 rounded-lg bg-ink"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ))}
                  <span className="relative">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {forgot ? (
              <motion.form
                key="forgot"
                initial={reduce ? false : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: 14 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loading) handleForgot();
                }}
              >
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="inline-flex cursor-pointer items-center gap-1.5 self-start text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("forgot.back")}
                </button>

                <div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    {t("forgot.title")}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{t("forgot.intro")}</p>
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
                  {t("email")}
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-brand-100 bg-surface/60 py-2.5 pl-10 pr-3 text-base text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                    />
                  </div>
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="rounded-lg bg-charge-500/10 px-3 py-2 text-sm text-charge-600">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("forgot.submit")}
                </button>
              </motion.form>
            ) : (
            <motion.form
              key={mode}
              initial={reduce ? false : { opacity: 0, x: mode === "signin" ? -14 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: mode === "signin" ? 14 : -14 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (loading) return;
                if (mode === "signin") handleSignIn();
                else handleSignUp();
              }}
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
                {t("email")}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-brand-100 bg-surface/60 py-2.5 pl-10 pr-3 text-base text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
                {t("password")}
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  minLength={mode === "signup" ? 6 : undefined}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                />
                {mode === "signup" && (
                  <span className="text-xs font-normal text-ink-faint">
                    {t("passwordHint")}
                  </span>
                )}
              </label>

              {mode === "signin" && (
                <div className="-mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={openForgot}
                    className="cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    {t("forgot.link")}
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg bg-charge-500/10 px-3 py-2 text-sm text-charge-600">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? t("signIn") : t("signUp")}
              </button>

              <div className="my-1 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-brand-100" />
                {t("or")}
                <span className="h-px flex-1 bg-brand-100" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogle}
                className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-brand-200 bg-white px-5 py-3 font-semibold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {t("withGoogle")}
              </button>

              {/* Cross-tab hint */}
              <p className="mt-1 text-center text-sm text-ink-soft">
                {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
                <button
                  type="button"
                  onClick={() =>
                    switchMode(mode === "signin" ? "signup" : "signin")
                  }
                  className="cursor-pointer font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  {mode === "signin" ? t("tabSignUp") : t("tabSignIn")}
                </button>
              </p>
            </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
