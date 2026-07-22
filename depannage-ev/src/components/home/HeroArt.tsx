import { Zap, Star, MapPin } from "lucide-react";

/**
 * Signature hero graphic: a stylised mini-map with pulsing location pins and a
 * floating charger card. Pure CSS animation (float / pulse-ring), so it renders
 * on the server and degrades gracefully under prefers-reduced-motion.
 */
export function HeroArt() {
  const pins = [
    { top: "22%", left: "20%", delay: "0s" },
    { top: "58%", left: "34%", delay: "0.8s" },
    { top: "34%", left: "68%", delay: "1.6s" },
    { top: "70%", left: "76%", delay: "0.4s" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Map card */}
      <div className="glow relative aspect-square overflow-hidden rounded-[2rem] border border-white/60 bg-mesh">
        <div className="absolute inset-0 bg-grid opacity-70" />

        {/* route line */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden
        >
          <path
            d="M20 24 C 40 40, 30 62, 52 62 S 74 40, 76 72"
            stroke="url(#route)"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="route" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* pins */}
        {pins.map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{ top: p.top, left: p.left }}
          >
            <span
              className="absolute -inset-3 rounded-full bg-brand-400/40 pulse-ring"
              style={{ animationDelay: p.delay }}
            />
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-charge-500 shadow-lg shadow-brand-600/40 ring-2 ring-white">
              <MapPin className="h-3.5 w-3.5 text-white" />
            </span>
          </div>
        ))}
      </div>

      {/* Floating charger card */}
      <div className="animate-float absolute -bottom-6 -left-4 w-60 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-brand-900/10 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-charge-500 text-white shadow-md shadow-brand-600/30">
            <Zap className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">
              Borne Type 2 · 22 kW
            </p>
            <p className="text-xs text-ink-soft">Tunis · La Marsa</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            4,9
          </span>
          <span className="font-display text-sm font-bold text-brand-700">
            0,45 TND<span className="text-xs font-normal text-ink-faint">/kWh</span>
          </span>
        </div>
      </div>

      {/* Floating bolt badge */}
      <div className="animate-float-slow absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-brand-300 shadow-xl shadow-ink/30">
        <Zap className="h-8 w-8" />
      </div>
    </div>
  );
}
