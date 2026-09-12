# StockFlow Design System

Generated with the UI/UX Pro Max skill (`--design-system` for product direction, plus targeted
`--domain color/chart/ux/product` queries), then adapted to this codebase's existing shadcn/Radix +
Tailwind CSS-variable architecture so the change is additive, not a rewrite.

Product category: **Enterprise Inventory / Warehouse / Retail Management SaaS**.
Positioning: trust, precision, efficiency, stability — not a generic "AI dashboard."

## Style

**Flat / functional enterprise SaaS.** No gradients, no glassmorphism, no decorative shadows.
Dark sidebar for wayfinding contrast against a light, dense content area. Borders and 1-level
elevation (not heavy drop shadows) separate surfaces.

## Color

Slate (structure/trust) + emerald (the "stock" accent — inventory, growth, positive movement).
Deliberately not blue/indigo-on-white (generic SaaS) or purple/pink (generic "AI dashboard").
All semantic colors are chosen to pass 4.5:1 text contrast on white *as the token itself*, so
existing `bg-success/10 text-success` style badges stay accessible without a separate "-text" token.

| Token | Hex | Role |
|---|---|---|
| `--background` | `#F8FAFC` | App canvas |
| `--foreground` | `#0F172A` | Primary text |
| `--card` | `#FFFFFF` | Surface |
| `--muted` | `#F1F5F9` | Secondary surface / subtle fill |
| `--muted-foreground` | `#475569` | Secondary text |
| `--border` | `#E2E8F0` | Default border |
| `--primary` | `#1E293B` | Primary actions, active nav, links |
| `--accent` | `#047857` | Brand accent (emerald-700) — sparing use: highlights, key CTA |
| `--success` | `#047857` | Positive status, in-stock, revenue |
| `--warning` | `#B45309` | Low stock, pending, caution (amber-700) |
| `--destructive` | `#DC2626` | Errors, destructive actions, out-of-stock |
| `--info` | `#1D4ED8` | Neutral informational status (blue-700) |
| `--sidebar` | `#0F172A` | Sidebar surface |
| `--sidebar-foreground` | `#B6C2D1` | Sidebar text |

Status is never color-only: every status badge/indicator pairs color with an icon and/or label text.

## Typography

Single family: **Plus Jakarta Sans** (per UI/UX Pro Max's B2B/enterprise SaaS pairing — geometric,
legible at small sizes, distinct from the generic Inter default). Loaded via Google Fonts in
`index.html` (preconnect + stylesheet), with a system-font fallback stack.

| Role | Size | Weight |
|---|---|---|
| H1 (page title) | 24px / 1.5rem | 700 |
| H2 (section) | 18px / 1.125rem | 600 |
| H3 (card title) | 15px / 0.9375rem | 600 |
| Body | 14px / 0.875rem | 400 |
| Small | 13px / 0.8125rem | 400 |
| Caption / table header | 12px / 0.75rem | 600, uppercase, tracked |

Numeric table/KPI values use `tabular-nums` so columns of numbers align — no second (mono) typeface
introduced.

## Spacing & Density

Density dial: **dense/dashboard** (per the skill's tuning). Tailwind's default 4px scale is kept
(changing it would touch every file); density is expressed through consistent component padding
(table rows, form fields, cards) and page rhythm (`gap-6` between sections, `gap-4` in card grids),
not a new scale.

## Radius

Coherent 3-step scale (unchanged from the existing tokens — already correct): `sm` 4px, `md` 6px,
`lg` 8px (`--radius: 0.5rem`). Nothing in the app should exceed 8px radius except the login card.

## Elevation

Two steps only: a hairline `border` for resting surfaces (cards, table rows), and a single soft
`shadow-sm`/`shadow-md` reserved for anything that floats above content (dropdowns, dialogs,
popovers). No colored or multi-layer shadows.

## Motion

Restrained, state-communicating only (skill's "Subtle" motion tier): 150ms color/background
transitions on hover, 150ms fade/slide-in on dialogs and dropdowns (already present in
`tailwind.config.js`). No scroll-triggered or decorative animation — this is a logged-in operational
tool, not a marketing page.

## Charts (Recharts)

Categorical palette, no purple: `emerald-600 #059669`, `blue-600 #2563EB`, `amber-600 #D97706`,
`slate-400 #94A3B8`, `cyan-700 #0E7490`, `rose-600 #E11D48` (reserved for alerts only). Revenue vs.
Expenses always maps revenue → emerald, expenses → slate (expenses aren't inherently "bad," so they
don't get a warning color). Every chart has visible axis labels, a legend when >1 series, and a
tooltip; nothing relies on hover alone to convey the value.

## Anti-patterns avoided

No gradients, no glassmorphism, no purple/pink "AI" palette, no oversized radius, no heavy shadows,
no emoji-as-icons (Lucide throughout), no color-only status.
