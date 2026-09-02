# Yipyy design system — as it exists today

Extracted from the codebase on 2026-08-31 at `556a89fa`. Every value below was read out of
[src/app/globals.css](../src/app/globals.css) (762 lines), [src/app/layout.tsx](../src/app/layout.tsx),
[components.json](../components.json), [src/components/ui/](../src/components/ui/) and
`public/*.svg` — none of it is recalled or inferred.

This is a handoff document for a redesign. It describes what the platform renders **today**,
including the parts that are wrong.

|               |                                           |
| ------------- | ----------------------------------------- |
| Framework     | Tailwind CSS 4, CSS-first (no JS config)  |
| Component kit | shadcn/ui — New York style                |
| Base color    | `neutral` declared; slate in practice     |
| UI components | 54                                        |
| Themes        | Light + `.dark` class (not a media query) |
| Icons         | lucide-react                              |
| Languages     | English + French via next-intl            |

---

## 1. Decide these three before starting

Three conflicts are baked into the current system. A redesign inherits all three silently unless
someone rules on them.

### 1.1 The brand mark is orange. The product is blue.

`public/colored-logo.svg` is built almost entirely from **`#F27E13`**, a saturated orange, with one
pale blue detail (`#CDEAF5`).

But `--primary` is **`#0EA5E9`**, sky blue. It drives every button, link, focus ring, sidebar
highlight and the first chart series. The logo's orange appears **nowhere** in the token set. The
closest token is `--accent` at `#FB923C` — lighter, pinker, and used for highlights rather than
brand identity.

So "maintain our branding colors" has two possible meanings:

- keep the **blue UI** people use every day, or
- make the product actually **look like the logo**.

These are different projects. Pick one deliberately.

### 1.2 White text on light-mode brand colors fails WCAG AA

`--primary-foreground`, `--accent-foreground` and `--success-foreground` are all `#FFFFFF`, and none
of the three reaches 4.5:1 against its own background. A default button is white on `#0EA5E9` —
**2.77:1**.

Dark mode is clean, because it pairs bright hues against dark ink. Full measurements in
[section 3](#3-contrast-audit).

### 1.3 Two fonts are loaded. One is used.

`layout.tsx` loads both Inter and Plus Jakarta Sans, but `--font-sans` maps only to Jakarta. Inter is
referenced in exactly one component (`src/components/messaging/MessageCenter.tsx`). Either adopt it
deliberately as the body face, or drop the request.

---

## 2. Color tokens

Defined as hex on `:root` and `.dark`, then re-exported through `@theme inline` as `--color-*` so
Tailwind generates `bg-primary`, `text-muted-foreground` and so on.

### Surfaces

| Token                  | Light     | Dark      | Role               |
| ---------------------- | --------- | --------- | ------------------ |
| `--background`         | `#f8fafc` | `#0f172a` | App ground         |
| `--foreground`         | `#1e293b` | `#f1f5f9` | Body ink           |
| `--card`               | `#ffffff` | `#1e293b` | Raised panels      |
| `--card-foreground`    | `#1e293b` | `#f1f5f9` | Ink on cards       |
| `--popover`            | `#ffffff` | `#1e293b` | Menus, dropdowns   |
| `--popover-foreground` | `#1e293b` | `#f1f5f9` | Ink in popovers    |
| `--muted`              | `#f1f5f9` | `#334155` | Inset / hover fill |
| `--muted-foreground`   | `#64748b` | `#94a3b8` | Secondary text     |

### Brand and semantic

| Token                    | Light     | Dark      | Role                            |
| ------------------------ | --------- | --------- | ------------------------------- |
| `--primary`              | `#0ea5e9` | `#38bdf8` | Buttons, links, focus           |
| `--primary-foreground`   | `#ffffff` | `#0f172a` | Ink on primary                  |
| `--secondary`            | `#8b5cf6` | `#a78bfa` | Secondary emphasis              |
| `--secondary-foreground` | `#ffffff` | `#0f172a` | Ink on secondary                |
| `--accent`               | `#fb923c` | `#fb923c` | Highlights — identical in both  |
| `--accent-foreground`    | `#ffffff` | `#0f172a` | Ink on accent                   |
| `--destructive`          | `#ef4444` | `#f87171` | Delete, danger                  |
| `--success`              | `#22c55e` | `#4ade80` | Confirmed, paid                 |
| `--warning`              | `#f59e0b` | `#fbbf24` | Needs attention                 |
| `--info`                 | `#0ea5e9` | `#38bdf8` | Neutral notice — equals primary |

Note `--info` is byte-identical to `--primary` in both themes, and `--accent` is the only token that
does not change between themes.

### Lines and focus

| Token      | Light     | Dark      |
| ---------- | --------- | --------- |
| `--border` | `#e2e8f0` | `#334155` |
| `--input`  | `#e2e8f0` | `#334155` |
| `--ring`   | `#0ea5e9` | `#38bdf8` |

### Charts

| Token       | Light     | Dark      |
| ----------- | --------- | --------- |
| `--chart-1` | `#0ea5e9` | `#38bdf8` |
| `--chart-2` | `#22c55e` | `#4ade80` |
| `--chart-3` | `#8b5cf6` | `#a78bfa` |
| `--chart-4` | `#fb923c` | `#fb923c` |
| `--chart-5` | `#ec4899` | `#f472b6` |

### Sidebar

| Token                          | Light     | Dark      |
| ------------------------------ | --------- | --------- |
| `--sidebar`                    | `#ffffff` | `#1e293b` |
| `--sidebar-foreground`         | `#475569` | `#cbd5e1` |
| `--sidebar-primary`            | `#0ea5e9` | `#38bdf8` |
| `--sidebar-primary-foreground` | `#ffffff` | `#0f172a` |
| `--sidebar-accent`             | `#f1f5f9` | `#334155` |
| `--sidebar-accent-foreground`  | `#1e293b` | `#f1f5f9` |
| `--sidebar-border`             | `#f1f5f9` | `#334155` |
| `--sidebar-ring`               | `#0ea5e9` | `#38bdf8` |

---

## 3. Contrast audit

WCAG 2.1 relative luminance, computed over the shipped pairs. AA text needs 4.5:1; 3:1 covers large
text and non-text UI only.

| Pair                 | Foreground | On                    | Ratio   | Verdict         |
| -------------------- | ---------- | --------------------- | ------- | --------------- |
| Default button       | `#FFFFFF`  | `#0EA5E9` primary     | 2.77:1  | **Fails**       |
| Accent surface       | `#FFFFFF`  | `#FB923C` accent      | 2.26:1  | **Fails**       |
| Success surface      | `#FFFFFF`  | `#22C55E` success     | 2.28:1  | **Fails**       |
| Logo orange on white | `#F27E13`  | `#FFFFFF`             | 2.70:1  | **Fails**       |
| Destructive surface  | `#FFFFFF`  | `#EF4444` destructive | 3.76:1  | Large / UI only |
| Secondary surface    | `#FFFFFF`  | `#8B5CF6` secondary   | 4.23:1  | Large / UI only |
| Warning surface      | `#1E293B`  | `#F59E0B` warning     | 6.81:1  | AA text         |
| Body text            | `#1E293B`  | `#F8FAFC` background  | 13.98:1 | AA text         |
| Muted text           | `#64748B`  | `#F8FAFC` background  | 4.55:1  | AA text         |
| Dark · primary       | `#38BDF8`  | `#0F172A` background  | 8.33:1  | AA text         |
| Dark · body text     | `#F1F5F9`  | `#0F172A` background  | 16.30:1 | AA text         |
| Dark · muted text    | `#94A3B8`  | `#0F172A` background  | 6.96:1  | AA text         |

The pattern is consistent: light mode picks hues at roughly 500-weight and puts white on them.
Darkening each light-mode hue by about two steps — or switching those foregrounds to the slate ink
`#1E293B` — resolves every failure without changing a hue.

---

## 4. Typography

One family does effectively all the work. There is no separate display face, no type scale in the
token layer, and no `letter-spacing` or `line-height` tokens — sizing is per-component Tailwind
utilities.

| Token          | Stack                                                                | Loaded as                                      | Used          |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| `--font-sans`  | `var(--font-jakarta), system-ui, -apple-system, sans-serif`          | Plus Jakarta Sans · 400 500 600 700 800 · swap | Everywhere    |
| `--font-mono`  | `ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", monospace` | System stack — no webfont                      | Rare          |
| `--font-inter` | Inter · 400 · swap                                                   | next/font/google                               | One component |

Global body settings:

```css
body {
  @apply bg-background text-foreground antialiased;
  font-feature-settings:
    "rlig" 1,
    "calt" 1;
}
html {
  scroll-behavior: smooth;
}
:focus-visible {
  @apply outline-ring outline-2 outline-offset-2;
}
```

---

## 5. Radius

A single `--radius: 0.875rem` (14px) with four derived steps. Commented in source as "generous for
modern feel" — and it is; 14px is large for a data-dense admin product.

| Step           | Formula                     | Value |
| -------------- | --------------------------- | ----- |
| `--radius-sm`  | `calc(var(--radius) - 4px)` | 10px  |
| `--radius-md`  | `calc(var(--radius) - 2px)` | 12px  |
| `--radius-lg`  | `var(--radius)`             | 14px  |
| `--radius-xl`  | `calc(var(--radius) + 4px)` | 18px  |
| `--radius-2xl` | `calc(var(--radius) + 8px)` | 22px  |

Change the one base value and all five move. This is the single most useful lever in the current
system.

---

## 6. Elevation

Five hand-written shadow classes, **outside** the token layer — they are plain CSS classes, not
Tailwind theme values, so they cannot be composed with variants.

```css
.shadow-soft {
  box-shadow:
    0 2px 8px -2px rgba(0, 0, 0, 0.05),
    0 4px 16px -4px rgba(0, 0, 0, 0.08);
}
.shadow-card {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.06);
}
.shadow-elevated {
  box-shadow:
    0 4px 16px -2px rgba(0, 0, 0, 0.08),
    0 8px 32px -4px rgba(0, 0, 0, 0.12);
}
.shadow-glow-primary {
  box-shadow: 0 0 20px -5px var(--primary);
}
.shadow-glow-success {
  box-shadow: 0 0 20px -5px var(--success);
}
```

All five use pure black at low alpha. Shifting the shadow color toward the slate ink `#1E293B`
rather than `#000` is a cheap and large improvement on a blue-grey ground.

---

## 7. Gradients, glass and effects

Six gradients plus a glass-morphism treatment. **All hardcoded hex** — they do not follow the theme
and render identically in dark mode. That is a bug the rebuild should not carry forward.

```css
.bg-gradient-subtle {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}
.bg-gradient-primary {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
}
.bg-gradient-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}
.bg-gradient-accent {
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
}
.bg-gradient-secondary {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}
.bg-gradient-mesh {
  background:
    radial-gradient(at 40% 20%, rgba(14, 165, 233, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.06) 0px, transparent 50%),
    radial-gradient(at 0% 50%, rgba(34, 197, 94, 0.05) 0px, transparent 50%),
    radial-gradient(at 80% 50%, rgba(251, 146, 60, 0.05) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(14, 165, 233, 0.06) 0px, transparent 50%);
}
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
}
```

Also present: `.text-gradient-primary`, `.text-gradient-warm`, `.hover-lift`, `.hover-scale`,
`.status-dot` with `.status-online` / `.status-busy` / `.status-offline`, and a `.badge` family
using `color-mix(in srgb, var(--primary) 10%, transparent)` for tinted backgrounds.

---

## 8. Motion

Thirteen keyframes ship in `globals.css`, alongside the `tw-animate-css` import. There are **no
duration or easing tokens** — timings are written inline at each call site.

Generic UI motion:
`fade` · `fade-in` · `slide` · `slide-up` · `slide-down` · `scale-in` · `pulse-soft` ·
`collapsible-up` · `collapsible-down`

Product-specific motion — worth keeping as deliberate personality rather than folding into a generic
set:
`confetti-fall` · `float` · `sway` · `tag-pulse`

There is **no `prefers-reduced-motion` block** anywhere in `globals.css`. Add one.

---

## 9. Component inventory

54 files in `src/components/ui/`. Capitalised names are Yipyy's own compositions and are where the
product's real patterns live; lowercase are stock shadcn/ui primitives.

**Yipyy compositions:** `ClickableStatCard` · `DataTable` · `DateCard` · `DynamicIcon` ·
`GenericCalendar` · `StatCard` · `StatusBadge`

**shadcn/ui primitives:** accordion · alert · alert-dialog · avatar · badge · button · calendar ·
card · checkbox · collapsible · command · context-menu · data-table · date-picker ·
date-selection-calendar · delta-badge · dialog · dropdown-menu · form · generic-sidebar · input ·
label · modal · pagination · password-input · popover · progress · radio-group · scroll-area ·
select · separator · settings-block · sheet · sidebar · skeleton · skeletons · stepper · switch ·
table · table-empty-state · tabs · textarea · time-picker · time-picker-lux · time-range-slider ·
toggle · toggle-group · tooltip

### Button API — the shape everything else follows

| Axis      | Values                                                                                      |
| --------- | ------------------------------------------------------------------------------------------- |
| `variant` | default · destructive · outline · secondary · ghost · link                                  |
| `size`    | default (h-9) · sm (h-8) · lg (h-10) · icon (size-9) · icon-sm (size-8) · icon-lg (size-10) |
| radius    | `rounded-lg` on every size — 14px                                                           |
| focus     | `ring-[3px]` at `ring-ring/50` plus `border-ring`                                           |
| invalid   | `aria-invalid` drives destructive border and ring                                           |
| icons     | auto `size-4` for any child `svg` without an explicit size                                  |

Badge carries a **wider semantic set** than Button: `default`, `secondary`, `destructive`,
`outline`, `success`, `warning`, `info`. Worth mirroring onto Button in the rebuild, since status is
this product's dominant idiom.

---

## 10. Constraints the rebuild must respect

Enforced by the codebase and its CI, not preferences. A design that ignores these will not survive
implementation.

- **`DataTable` is shared by roughly 88 screens.** Additions must not break existing callers. Any
  table redesign is a migration, not a restyle.
- **Tailwind 4, CSS-first.** There is no `tailwind.config.js`. New tokens go in `@theme inline` in
  `globals.css`, or they do not exist as utilities.
- **Prefer `data-` attributes over conditional classes** for state styling — a stated house rule,
  and it keeps variants out of the JS bundle.
- **Pages are Server Components by default**, and no component file should exceed ~500 lines.
  Interactive pieces get extracted rather than inlined.
- **Bilingual English and French** via next-intl. French runs 15–25% longer than English — buttons,
  tabs and table headers must survive it without truncation.
- **Three portals share one token set** — customer, facility (plus multi-location HQ), and platform
  admin, along with employee, groomer and staff surfaces. Audiences with very different density
  needs read the same tokens.

---

## 11. The token layer, verbatim

```css
:root {
  --radius: 0.875rem;

  --background: #f8fafc;
  --foreground: #1e293b;
  --card: #ffffff;
  --card-foreground: #1e293b;
  --popover: #ffffff;
  --popover-foreground: #1e293b;
  --primary: #0ea5e9;
  --primary-foreground: #ffffff;
  --secondary: #8b5cf6;
  --secondary-foreground: #ffffff;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #fb923c;
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --success: #22c55e;
  --success-foreground: #ffffff;
  --warning: #f59e0b;
  --warning-foreground: #1e293b;
  --info: #0ea5e9;
  --info-foreground: #ffffff;

  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #0ea5e9;

  --chart-1: #0ea5e9;
  --chart-2: #22c55e;
  --chart-3: #8b5cf6;
  --chart-4: #fb923c;
  --chart-5: #ec4899;

  --sidebar: #ffffff;
  --sidebar-foreground: #475569;
  --sidebar-primary: #0ea5e9;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f1f5f9;
  --sidebar-accent-foreground: #1e293b;
  --sidebar-border: #f1f5f9;
  --sidebar-ring: #0ea5e9;
}

.dark {
  --background: #0f172a;
  --foreground: #f1f5f9;
  --card: #1e293b;
  --card-foreground: #f1f5f9;
  --popover: #1e293b;
  --popover-foreground: #f1f5f9;
  --primary: #38bdf8;
  --primary-foreground: #0f172a;
  --secondary: #a78bfa;
  --secondary-foreground: #0f172a;
  --muted: #334155;
  --muted-foreground: #94a3b8;
  --accent: #fb923c;
  --accent-foreground: #0f172a;
  --destructive: #f87171;
  --destructive-foreground: #0f172a;
  --success: #4ade80;
  --success-foreground: #0f172a;
  --warning: #fbbf24;
  --warning-foreground: #0f172a;
  --info: #38bdf8;
  --info-foreground: #0f172a;

  --border: #334155;
  --input: #334155;
  --ring: #38bdf8;

  --chart-1: #38bdf8;
  --chart-2: #4ade80;
  --chart-3: #a78bfa;
  --chart-4: #fb923c;
  --chart-5: #f472b6;

  --sidebar: #1e293b;
  --sidebar-foreground: #cbd5e1;
  --sidebar-primary: #38bdf8;
  --sidebar-primary-foreground: #0f172a;
  --sidebar-accent: #334155;
  --sidebar-accent-foreground: #f1f5f9;
  --sidebar-border: #334155;
  --sidebar-ring: #38bdf8;
}

/* Radius steps, derived from the single --radius above */
--radius-sm: calc(var(--radius) - 4px); /* 10px */
--radius-md: calc(var(--radius) - 2px); /* 12px */
--radius-lg: var(--radius); /* 14px */
--radius-xl: calc(var(--radius) + 4px); /* 18px */
--radius-2xl: calc(var(--radius) + 8px); /* 22px */

/* Brand mark, from colored-logo.svg — NOT currently in the token set */
--brand-orange: #f27e13;
--brand-pale: #cdeaf5;
```

---

## Brand assets

`public/` holds: `colored-logo.svg` · `colored-logo.png` · `transparent-logo.svg` ·
`transparent-logo.png` · `yipyy-black.png` · `yipyy-white.png` · `yipyy-transparent.png` ·
`yipyy-mascot.png` · `yipyy.jpg`

The favicon is set to `/yipyy-white.png` in `layout.tsx` metadata. Colors present in the logo SVG:
`#F27E13` (dominant), `#CDEAF5`, black.
