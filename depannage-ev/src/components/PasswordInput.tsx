"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * Password field with a lock icon and a show/hide visibility toggle.
 * Controlled: the parent owns the value.
 */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder = "••••••••",
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-brand-100 bg-surface/60 py-2.5 pl-10 pr-11 text-base text-ink transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-brand-50 hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
