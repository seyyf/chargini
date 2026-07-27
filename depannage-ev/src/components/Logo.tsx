import { Link } from "@/i18n/navigation";

/**
 * Chargini brand mark: a location pin (marketplace) with a charging bolt
 * cut through it (energy). Rendered as an inline SVG so it stays crisp and
 * theme-able. `variant` switches the wordmark colour for light vs dark panels.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Chargini"
      fill="none"
    >
      <defs>
        <linearGradient id="chargini-g" x1="4" y1="2" x2="36" y2="38">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* pin */}
      <path
        d="M20 2.5c-8.008 0-14.5 6.34-14.5 14.16 0 5.2 2.94 9.9 6.62 13.62 2.02 2.04 4.28 3.86 6.06 6.34.9 1.25 2.74 1.25 3.64 0 1.78-2.48 4.04-4.3 6.06-6.34 3.68-3.72 6.62-8.42 6.62-13.62C34.5 8.84 28.008 2.5 20 2.5Z"
        fill="url(#chargini-g)"
      />
      {/* bolt */}
      <path
        d="M21.6 9.5 13.5 19.4c-.5.6-.06 1.5.72 1.5h4.05l-1.4 7.2c-.16.83.9 1.33 1.44.68l8.1-9.9c.5-.6.06-1.5-.72-1.5h-4.05l1.4-7.2c.16-.83-.9-1.33-1.44-.68Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function Logo({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Chargini — accueil"
    >
      <span className="relative">
        <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
      </span>
      <span
        className={`font-display text-xl font-bold tracking-tight ${
          variant === "dark" ? "text-white" : "text-ink"
        }`}
      >
        Charg<span className="text-gradient">ini</span>
      </span>
    </Link>
  );
}
