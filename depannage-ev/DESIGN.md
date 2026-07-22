# Chargini — design language (redesign)

Brand tokens live in `src/app/globals.css` (`@theme`). Use these Tailwind tokens.

## Palette
- **brand** (electric teal): `brand-50..950` — primary brand colour (`brand-600` = #0891b2).
- **charge** (accent green): `charge-400/500/600` — success, "go", positive.
- **ink**: deep teal-navy text. `text-ink` (headings/strong), `text-ink-soft` (body),
  `text-ink-faint` (muted). `bg-ink` = near-black primary button.
- **surface**: page background (`bg-surface`).
- Semantic: keep **red** for errors/destructive, **amber/gold** for star ratings.

## Fonts
- `font-display` (Space Grotesk) on all page/section headings (h1/h2/h3 titles).
- Body inherits Inter automatically.

## Component recipes (replace the OLD emerald/slate patterns with these)

| Element | OLD (remove) | NEW (use) |
|---|---|---|
| Primary button | `bg-emerald-600 text-white hover:bg-emerald-700` | `bg-ink text-white hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25` + `rounded-xl cursor-pointer transition-all` |
| Secondary/outline button | `border-slate-300 hover:bg-slate-50` | `border border-brand-200 text-ink hover:bg-brand-50 rounded-xl cursor-pointer transition-colors` |
| Link / accent text | `text-emerald-600` / `-700` | `text-brand-700 hover:text-brand-800` |
| Success badge (Active, Confirmée, Vérifié) | `bg-emerald-100 text-emerald-700` | `bg-charge-500/10 text-charge-600` |
| Card container | `border-slate-200 rounded-xl` | `border border-brand-100 rounded-2xl` (shadow-sm ok) |
| Input | `border-slate-300 focus:border-emerald-600` | `border-brand-100 bg-surface/60 focus:border-brand-400 focus:bg-white rounded-xl` |
| Icon accent | `text-emerald-*` | `text-brand-600` (or `text-charge-500` for positive) |
| Body text | `text-slate-500/600` | `text-ink-soft` |
| Strong text | `text-slate-900` | `text-ink` |
| Muted text | `text-slate-400` | `text-ink-faint` |
| Hairlines/dividers | `bg-slate-200 border-slate-200` | `bg-brand-100 border-brand-100` |

## Icons
Prefer `lucide-react` SVG icons over hand-rolled inline `<svg>` where trivially
swappable (e.g. Zap, MapPin, Star, Plug, Gauge, Calendar, ShieldCheck, Check, X,
Pencil, Eye, Trash2, Loader2). Keep sizing `h-4 w-4` / `h-5 w-5`. Never emojis.

## Rules
- Do NOT change component logic, props, exported names, data flow, or tests.
- Keep all `aria-*`, `alt`, labels, and accessibility intact.
- Keep destructive actions red; keep star ratings amber.
- Add `cursor-pointer` to clickable elements; transitions 150–300ms.
- Loading buttons: keep `disabled` + show `<Loader2 className="h-4 w-4 animate-spin" />`.
