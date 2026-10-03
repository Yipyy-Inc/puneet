// ============================================================================
// The booking wizard's accent, as the client's mock draws it (2026-10-02).
//
// The mock gives two palettes, one per portal: the staff side in blue, the
// customer side in yellow with dark text on it. The user decided the customer
// side follows the FACILITY'S brand colour (Branding settings), with the
// mock's yellow when a facility has set none — so any colour has to come out
// as the same six roles the mock uses:
//
//   accent    A   buttons, the current step, selected pills, the tick
//   onAccent  AT  text on the accent — dark ink or white, whichever reads
//   soft      S   the current sub-step's tint, selected-card wash
//   softInk   ST  text on the soft tint
//   deep      D   the accent as an ink on white (numbers, focus ring)
//   glow      G   the CTA's coloured shadow
//
// The two colours the mock names come back EXACTLY as drawn. Any other colour
// is derived in OKLCH, so a tint keeps its hue, and checked against WCAG: text
// on the accent and on the soft tint, and the deep ink on white, all reach
// 4.5:1 or better. Pure, so the arithmetic is unit-tested
// (tests/unit/accent-palette.test.ts).
// ============================================================================

export interface AccentPalette {
  accent: string;
  onAccent: string;
  soft: string;
  softInk: string;
  deep: string;
  glow: string;
}

/** The staff portal, exactly as the mock draws it. */
export const FACILITY_ACCENT: AccentPalette = {
  accent: "#1D6AE5",
  onAccent: "#FFFFFF",
  soft: "#E8F0FD",
  softInk: "#1A4FB5",
  deep: "#1D6AE5",
  glow: "rgba(29,106,229,.45)",
};

/** The customer portal with no brand colour of its own: the mock's yellow. */
export const CUSTOMER_ACCENT: AccentPalette = {
  accent: "#F5B532",
  onAccent: "#1B2333",
  soft: "#FEF3D8",
  softInk: "#7A5200",
  deep: "#A86A00",
  glow: "rgba(245,181,50,.6)",
};

const INK = "#1B2333";
const WHITE = "#FFFFFF";

type Rgb = { r: number; g: number; b: number };

const HEX = /^#?([0-9a-f]{6})$/i;

function parseHex(hex: string): Rgb | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 16);
  return { r: (n >> 16) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const fromLinear = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;

/** WCAG 2 relative luminance. */
function luminance(rgb: Rgb): number {
  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

/** WCAG 2 contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(parseHex(a) ?? { r: 0, g: 0, b: 0 });
  const lb = luminance(parseHex(b) ?? { r: 0, g: 0, b: 0 });
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── OKLCH (Björn Ottosson's OKLab, in polar form) ─────────────────────────

type Lch = { l: number; c: number; h: number };

function toOklch(rgb: Rgb): Lch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function fromOklch({ l: L, c, h }: Lch): { rgb: Rgb; inGamut: boolean } {
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
  const inGamut = [lin.r, lin.g, lin.b].every(
    (v) => v >= -1e-4 && v <= 1 + 1e-4,
  );
  return {
    rgb: {
      r: fromLinear(Math.min(1, Math.max(0, lin.r))),
      g: fromLinear(Math.min(1, Math.max(0, lin.g))),
      b: fromLinear(Math.min(1, Math.max(0, lin.b))),
    },
    inGamut,
  };
}

/** The colour at this lightness, chroma reduced until it is displayable. */
function lchHex(lch: Lch): string {
  let c = lch.c;
  for (let i = 0; i < 60; i++) {
    const { rgb, inGamut } = fromOklch({ ...lch, c });
    if (inGamut || c <= 0) return toHex(rgb);
    c = Math.max(0, c - 0.005);
  }
  return toHex(fromOklch({ ...lch, c: 0 }).rgb);
}

/** Lightness stepped down (or up) until `test` passes. */
function stepLightness(
  lch: Lch,
  direction: -1 | 1,
  test: (hex: string) => boolean,
): string {
  let l = lch.l;
  for (let i = 0; i < 100; i++) {
    const hex = lchHex({ ...lch, l });
    if (test(hex)) return hex;
    l = Math.min(1, Math.max(0, l + direction * 0.01));
  }
  return lchHex({ ...lch, l: direction < 0 ? 0 : 1 });
}

function rgbaOf(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? { r: 0, g: 0, b: 0 };
  const byte = (v: number) => Math.round(v * 255);
  return `rgba(${byte(rgb.r)},${byte(rgb.g)},${byte(rgb.b)},${alpha})`;
}

/**
 * The six accent roles for a brand colour. `null`, an empty or malformed
 * value gives the mock's customer yellow; the two colours the mock names
 * give its own palettes back unchanged.
 */
export function accentPalette(hex: string | null | undefined): AccentPalette {
  const rgb = hex ? parseHex(hex) : null;
  if (!rgb) return CUSTOMER_ACCENT;
  const normal = toHex(rgb);
  if (normal === CUSTOMER_ACCENT.accent) return CUSTOMER_ACCENT;
  if (normal === FACILITY_ACCENT.accent) return FACILITY_ACCENT;

  const lch = toOklch(rgb);

  // Text on the accent: whichever of the mock's two inks reads better. If
  // neither reaches 4.5:1, the accent itself moves away from it.
  const inkFirst = contrast(normal, INK) >= contrast(normal, WHITE);
  const onAccent = inkFirst ? INK : WHITE;
  const accent =
    contrast(normal, onAccent) >= 4.5
      ? normal
      : stepLightness(
          lch,
          inkFirst ? 1 : -1,
          (h) => contrast(h, onAccent) >= 4.5,
        );

  const soft = lchHex({ l: 0.96, c: Math.min(lch.c * 0.25, 0.045), h: lch.h });
  const softInk = stepLightness(
    { l: Math.min(lch.l, 0.455), c: lch.c, h: lch.h },
    -1,
    (h) => contrast(h, soft) >= 6,
  );
  const deep =
    contrast(accent, WHITE) >= 4.5
      ? accent
      : stepLightness(
          toOklch(parseHex(accent)!),
          -1,
          (h) => contrast(h, WHITE) >= 4.5,
        );

  return {
    accent,
    onAccent,
    soft,
    softInk,
    deep,
    glow: rgbaOf(accent, onAccent === WHITE ? 0.45 : 0.6),
  };
}

/** The palette as the CSS variables a `data-look="booking"` root reads. */
export function accentVariables(
  palette: AccentPalette,
): Record<string, string> {
  return {
    "--acc": palette.accent,
    "--acc-text": palette.onAccent,
    "--acc-soft": palette.soft,
    "--acc-soft-text": palette.softInk,
    "--acc-deep": palette.deep,
    "--acc-glow": palette.glow,
  };
}
