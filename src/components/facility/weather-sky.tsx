"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// The sky behind the weather panel.
//
// ── WHY THIS IS NOT A TINT ────────────────────────────────────────────────
//
// The panel used to say what the weather was with a flat --wash-* field: warm
// for sun, blue for anything wet, grey for fog, violet for a storm. Four
// colours for fourteen conditions, and three of the four are STATUS washes —
// so a rainy afternoon wore the same field as an info chip and a thunderstorm
// wore the violet that means "permissions" everywhere else in the product.
//
// Weather is the one thing on this screen that is a picture of the outside
// world rather than a state of a record, and it is the one thing every person
// looking at it already knows the real colour of. So it is drawn, not tinted:
// a sky, the sun or the moon in it, cloud with a lit top and a cool underside,
// and whatever is falling. Every value comes from the --weather-* tokens in
// globals.css, which are governed exactly the way §1 governs the logo's own
// colours — real, named, and off-limits to the interface.
//
// ── AND WHY IT IS DRAWN RATHER THAN PHOTOGRAPHED ──────────────────────────
//
// A photograph would be the obvious answer and it is wired for: drop a file at
// public/weather/<slug>.webp, pass `photo`, and it composites over this scene
// as the top layer. Until one exists this draws its own, which is what a phone
// weather app falls back to offline — and it costs no request, survives with
// no network, scales to any width, and carries no licence.
//
// ── MOTION ────────────────────────────────────────────────────────────────
//
// §4 allows one moving thing per view. This is one thing: the weather. The
// cloud deck drifts, and whatever is falling falls — they are not separate
// animations any more than rain is separate from the cloud it comes out of.
// It replaced FIVE simultaneous per-glyph animations (spin, float, pulse,
// sway, bounce, one on every hour of the forecast), so the count went down.
// Everything here stops dead under prefers-reduced-motion.
// ============================================================================

export type SkyKind =
  | "clear"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

/**
 * WMO code → what the sky looks like.
 *
 * The bands MATCH getWeatherName in WeatherWidget code for code. They were
 * allowed to disagree once already — a card that said "Partly Cloudy" over a
 * clear-sky field, because code 1 is named partly cloudy in one place and
 * treated as clear in the other. The word and the picture describe the same
 * sky; they cannot disagree about it.
 */
export function skyKind(code: number): SkyKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  if (code <= 99) return "storm";
  return "overcast";
}

/**
 * The sky itself, top to bottom.
 *
 * Two stops, not one, and the lower stop is always the paler of the pair: the
 * horizon is where the light comes from and a sky that gets DARKER downwards
 * reads as a ceiling. Night keeps the same rule with the colours pulled down.
 */
const SKY: Record<SkyKind, { day: string; night: string }> = {
  clear: {
    day: "linear-gradient(180deg, #2E7BD6 0%, #63A8E8 52%, #A9D3F4 100%)",
    night: "linear-gradient(180deg, #0B1B3A 0%, #16305C 58%, #2B4E82 100%)",
  },
  partly: {
    day: "linear-gradient(180deg, #3D84D2 0%, #79B4E6 55%, #BBDBF3 100%)",
    night: "linear-gradient(180deg, #101F3E 0%, #1B3560 58%, #33547F 100%)",
  },
  overcast: {
    day: "linear-gradient(180deg, #7E8C9C 0%, #9BA9B8 55%, #C4CED8 100%)",
    night: "linear-gradient(180deg, #1B2430 0%, #2B3644 58%, #444F5D 100%)",
  },
  fog: {
    day: "linear-gradient(180deg, #97A2AD 0%, #B3BCC5 50%, #D5DAE0 100%)",
    night: "linear-gradient(180deg, #232A32 0%, #333A43 55%, #4C535B 100%)",
  },
  drizzle: {
    day: "linear-gradient(180deg, #5A7898 0%, #7C97B3 55%, #A9BFD3 100%)",
    night: "linear-gradient(180deg, #131E2C 0%, #22303F 58%, #38485A 100%)",
  },
  rain: {
    day: "linear-gradient(180deg, #46617E 0%, #648098 55%, #93A9BC 100%)",
    night: "linear-gradient(180deg, #0E1722 0%, #1B2735 58%, #2E3D4E 100%)",
  },
  snow: {
    day: "linear-gradient(180deg, #7E93AA 0%, #A3B5C7 55%, #D2DCE6 100%)",
    night: "linear-gradient(180deg, #1A222D 0%, #2A3542 58%, #43505F 100%)",
  },
  storm: {
    day: "linear-gradient(180deg, #2F3A4C 0%, #4A5568 55%, #74808F 100%)",
    night: "linear-gradient(180deg, #090D16 0%, #161C29 58%, #29313F 100%)",
  },
};

/** How much cloud is in the sky, and how dark its underside is. */
/**
 * How much cloud, and how heavy it is.
 *
 * `cut` is the alpha threshold applied to the noise: the noise runs 0–1 with
 * a mean near 0.5, so a HIGH cut leaves only the densest peaks and you get a
 * few fair-weather puffs; a LOW cut passes almost all of it and you get an
 * unbroken deck. It is the one dial that turns the same field from "partly
 * cloudy" into "overcast", which is also what actually happens outside.
 *
 * `shade` is the darker underside layer's opacity, `lift` how bright the lit
 * tops are.
 */
const DECK: Record<
  SkyKind,
  { cut: number; shade: number; lift: number; show: boolean }
> = {
  clear: { cut: 0, shade: 0, lift: 0, show: false },
  partly: { cut: 0.5, shade: 0.16, lift: 0.95, show: true },
  overcast: { cut: 0.16, shade: 0.34, lift: 0.9, show: true },
  // Fog gets NO cloud. It is the one condition where you cannot see the sky
  // at all, so a cloud drawn in it would be a thing you can see through fog —
  // the bands below are the whole picture.
  fog: { cut: 0, shade: 0, lift: 0, show: false },
  drizzle: { cut: 0.24, shade: 0.34, lift: 0.86, show: true },
  rain: { cut: 0.14, shade: 0.46, lift: 0.82, show: true },
  snow: { cut: 0.2, shade: 0.28, lift: 0.94, show: true },
  storm: { cut: 0.1, shade: 0.58, lift: 0.74, show: true },
};

/**
 * The cloud deck, as fractal noise.
 *
 * ── TWO ATTEMPTS AT DRAWING A CLOUD, AND WHY BOTH FAILED ─────────────────
 *
 * First it was radial-gradient puffs plus a linear-gradient base on one
 * element. A linear gradient fills its whole box, so every cloud came out a
 * white rectangle with bumps on top, and six of them merged into a ceiling.
 *
 * Then it was real circles and a pill — correct silhouette, and still plainly
 * a cartoon. Four hard-edged shapes cannot be a cloud, because the thing that
 * makes a cloud look like a cloud is that its EDGE is the same texture as its
 * middle, at every scale you look at it. That is the literal definition of a
 * fractal, and no arrangement of circles has it.
 *
 * ── SO IT IS NOISE, WHICH IS WHAT A CLOUD ACTUALLY IS ────────────────────
 *
 * `feTurbulence type="fractalNoise"` with six octaves is Perlin noise summed
 * over six scales — the same generator that draws clouds in a renderer. Then
 * one feColorMatrix does the whole job in a single pass:
 *
 *   · the R, G and B rows output a CONSTANT (the 5th column), so the cloud is
 *     flat white or flat grey rather than the rainbow static turbulence emits;
 *   · the A row reads the red channel and subtracts `cut`, which thresholds
 *     the noise — everything below the cut clips to transparent, and what is
 *     left has a soft fractal edge because the noise near the threshold is
 *     itself fractal.
 *
 * That is where the realism comes from and it is one filter, no asset, no
 * request, and it re-renders at any width the panel is given.
 *
 * Two layers, because a cloud lit from above is two surfaces: a dark base
 * with a lower threshold (so it is wider than the lit part, the way an
 * underside is) and the lit top over it, nudged up.
 *
 * A vertical mask fades both out at the top and bottom edges, so the deck
 * ends in sky rather than in a straight cut across the panel.
 */
function CloudField({
  cut,
  shade,
  lift,
  night,
  uid,
}: {
  cut: number;
  shade: number;
  lift: number;
  night: boolean;
  uid: string;
}) {
  // The lit top is white by day and a cold moonlit grey by night; the base is
  // always a blue-grey, because cloud shadow is sky light, not black.
  const top = night ? [0.72, 0.76, 0.84] : [1, 1, 1];
  const base = night ? [0.1, 0.13, 0.2] : [0.35, 0.44, 0.56];

  const matrix = (rgb: number[], gain: number, offset: number) =>
    [
      `0 0 0 0 ${rgb[0]}`,
      `0 0 0 0 ${rgb[1]}`,
      `0 0 0 0 ${rgb[2]}`,
      `${gain} 0 0 0 ${-offset}`,
    ].join(" ");

  return (
    <svg
      className="absolute inset-0 size-full"
      preserveAspectRatio="none"
      viewBox="0 0 1200 200"
      aria-hidden
    >
      <defs>
        <filter id={`${uid}-lit`} x="0" y="0" width="100%" height="100%">
          {/* Wider than it is tall, so the noise stretches horizontally the
              way wind actually shapes a deck. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0042 0.011"
            numOctaves={6}
            seed={17}
            stitchTiles="stitch"
          />
          <feColorMatrix type="matrix" values={matrix(top, 1.9, cut + 0.1)} />
        </filter>
        <filter id={`${uid}-base`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0042 0.011"
            numOctaves={6}
            seed={17}
            stitchTiles="stitch"
          />
          <feColorMatrix type="matrix" values={matrix(base, 1.6, cut)} />
        </filter>
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="26%" stopColor="#fff" stopOpacity="1" />
          <stop offset="72%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}-mask`}>
          <rect width="1200" height="200" fill={`url(#${uid}-fade)`} />
        </mask>
      </defs>

      {/* The rect is three viewBox widths and drifts by one of them, so the
          loop never shows an edge. One transform animation, off under
          prefers-reduced-motion like everything else here. */}
      <g mask={`url(#${uid}-mask)`}>
        <g className="yy-weather-deck">
          <rect
            x="-1200"
            y="14"
            width="3600"
            height="200"
            filter={`url(#${uid}-base)`}
            opacity={shade}
          />
          <rect
            x="-1200"
            y="0"
            width="3600"
            height="200"
            filter={`url(#${uid}-lit)`}
            opacity={lift}
          />
        </g>
      </g>
    </svg>
  );
}

/** Stars, fixed. A night sky that twinkles is a screensaver, not a readout. */
const STARS = [
  [7, 22],
  [14, 47],
  [23, 15],
  [31, 58],
  [39, 28],
  [47, 12],
  [55, 44],
  [63, 24],
  [71, 55],
  [79, 18],
  [87, 40],
  [93, 26],
  [19, 70],
  [67, 8],
  [41, 66],
];

export interface WeatherSkyProps {
  kind: SkyKind;
  night?: boolean;
  /**
   * A real photograph for this condition, if one has been added at
   * public/weather/<slug>.webp. It composites over the drawn sky rather than
   * replacing it, so a file that fails to load degrades to the drawing
   * instead of to a blank panel.
   */
  photo?: string;
  className?: string;
}

export function WeatherSky({
  kind,
  night = false,
  photo,
  className,
}: WeatherSkyProps) {
  // SVG filter ids are DOCUMENT-global. Two weather panels on one page (the
  // dashboard and a collapsed one, say) would otherwise both point at the
  // first one's filter and the second would render whatever the first asked
  // for. Colons are legal in useId output and illegal in a url(#…).
  const uid = useId().replace(/:/g, "");
  const deck = DECK[kind];
  const wet = kind === "rain" || kind === "drizzle" || kind === "storm";
  const snowing = kind === "snow";
  const sunUp = !night && (kind === "clear" || kind === "partly");
  const moonUp = night && (kind === "clear" || kind === "partly");

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* 1 — the sky */}
      <div
        className="absolute inset-0"
        style={{ background: night ? SKY[kind].night : SKY[kind].day }}
      />

      {/* 2 — stars, before anything can sit in front of them */}
      {night &&
        (kind === "clear" || kind === "partly") &&
        STARS.map(([x, y]) => (
          <span
            key={`${x}-${y}`}
            className="absolute size-[2px] rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, opacity: 0.75 }}
          />
        ))}

      {/* 3 — the sun, or the moon. Two elements: a soft halo, and the disc
              itself. A sun drawn as one flat circle reads as a sticker; the
              halo is what makes it a light source.

              It sits on the RIGHT because the scrim in layer 8 is heaviest on
              the left, where the temperature and the condition are. At 13%
              the disc was under 0.62 of near-black and came out a muddy tan —
              a sun that is not yellow, which is the whole thing this change
              set out to fix. On the right the scrim is 0.12 and it reads as
              the light source it is, opposite the text rather than behind
              it. */}
      {sunUp && (
        // ── THE HALO IS A CHILD OF THE DISC, NOT ITS NEIGHBOUR ────────────
        //
        // They were two siblings with independently authored `left` values —
        // 47% for the disc and 40% for a halo 220px wide — so the glow's
        // centre landed some 40px to the RIGHT of the thing it was supposed
        // to be coming from. On a 540px card that reads as a pale yellow
        // slab sitting beside the sun with a soft vertical edge, which is
        // what the contact sheet showed, and it gets worse as the panel
        // widens because only one of the two numbers is a percentage.
        //
        // Nesting it fixes the class of bug rather than this instance: the
        // halo is centred on its parent with a translate, so there is no
        // second position to keep in step and no width at which they can
        // drift apart.
        <div
          className="absolute"
          style={{
            // Vertically inside the panel: at -4% the disc met the top edge
            // and rendered as a half-circle with a flat lid, which reads as a
            // clipping fault rather than as a sun low in the sky.
            //
            // And in the MIDDLE horizontally, not on either end. The left is
            // the temperature and the right is the twelve-hour strip; parked
            // at right:9% the disc sat directly behind the 11 p.m. column and
            // its moon. The gap between the two blocks is the one part of
            // this panel with nothing in it — the same void that made the row
            // look padded — so the sun goes there and fills it with the thing
            // the panel is about.
            left: "47%",
            top: "8%",
            width: "58px",
            height: "58px",
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "240px",
              height: "240px",
              background:
                "radial-gradient(circle, rgba(255,244,198,0.70) 0%, rgba(255,203,74,0.34) 34%, rgba(255,194,61,0) 70%)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 34%, #FFFDF2 0%, var(--weather-sun-core) 26%, var(--weather-sun) 68%, #FDB42A 100%)",
              boxShadow: "0 0 40px 12px rgba(255,209,90,0.55)",
            }}
          />
        </div>
      )}
      {moonUp && (
        <div
          className="absolute rounded-full"
          style={{
            left: "48%",
            top: "12%",
            width: "44px",
            height: "44px",
            background:
              "radial-gradient(circle at 36% 32%, #FFFFFF 0%, #E5ECF6 58%, #B9C6D8 100%)",
            // The moon needs no halo element: moonlight is a tenth of this
            // and a 240px glow around it would read as fog, which is a
            // different condition on this very panel.
            boxShadow: "0 0 34px 10px rgba(210,226,247,0.30)",
          }}
        />
      )}

      {/* 4 — what is falling, and it falls BEHIND the deck.

              Two layers at different speeds and angles, which is what gives
              rain depth; one layer reads as wallpaper.

              Drawn before the clouds and not after: streaks crossing over a
              lit white cloud read as scratches on the panel, not as rain. A
              real downpour comes OUT of the cloud, so the deck occludes the
              top of every streak and what you see is rain under the weather
              that is making it — which is also why the deck now sits in the
              upper two thirds and leaves the lower third open. */}
      {wet && (
        <>
          <div
            className="yy-weather-rain absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(104deg, transparent 0 7px, color-mix(in srgb, var(--weather-rain) 62%, transparent) 7px 8px, transparent 8px 15px)",
              opacity: kind === "drizzle" ? 0.4 : 0.62,
              animationDuration: kind === "drizzle" ? "1.1s" : "0.62s",
            }}
          />
          <div
            className="yy-weather-rain absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(99deg, transparent 0 13px, color-mix(in srgb, var(--weather-rain) 40%, transparent) 13px 14px, transparent 14px 27px)",
              opacity: kind === "drizzle" ? 0.28 : 0.46,
              animationDuration: kind === "drizzle" ? "1.5s" : "0.92s",
            }}
          />
        </>
      )}
      {snowing && (
        <>
          <div
            className="yy-weather-snow absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(var(--weather-snow) 1.3px, transparent 1.4px), radial-gradient(var(--weather-snow) 0.9px, transparent 1px)",
              backgroundSize: "34px 41px, 23px 29px",
              backgroundPosition: "0 0, 11px 7px",
              opacity: 0.9,
              animationDuration: "7s",
            }}
          />
          <div
            className="yy-weather-snow absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(var(--weather-snow) 1.9px, transparent 2px)",
              backgroundSize: "61px 67px",
              opacity: 0.68,
              animationDuration: "11s",
            }}
          />
        </>
      )}

      {/* 5 — the cloud deck, on top of the rain it is producing */}
      {deck.show && (
        <CloudField
          cut={deck.cut}
          shade={deck.shade}
          lift={deck.lift}
          night={night}
          uid={uid}
        />
      )}

      {/* 6 — fog, the one condition that is a thing in the air rather than a
              thing falling through it. Three slow bands, and the middle one
              runs the other way so it never reads as a single sliding sheet. */}
      {kind === "fog" && (
        <>
          {[26, 52, 76].map((top, i) => (
            <div
              key={top}
              className={i === 1 ? "yy-weather-fog-alt" : "yy-weather-fog"}
              style={{
                position: "absolute",
                left: "-30%",
                top: `${top}%`,
                width: "160%",
                height: "26%",
                // WHITE, not --weather-fog. The fog token IS the sky on this
                // condition, so a band painted in it is invisible against
                // itself — the third attempt's sheet showed one flat grey
                // rectangle with no bands in it at all. The band has to be
                // the light scattering IN the fog, which is brighter than the
                // fog behind it.
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 26%, rgba(255,255,255,0.85) 74%, transparent)",
                filter: "blur(10px)",
                opacity: 0.5,
                animationDuration: `${34 + i * 11}s`,
              }}
            />
          ))}
        </>
      )}

      {/* 7 — the photograph, when the product has one. Last, so it hides the
              drawing; absent, the drawing is simply what you see. */}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )}

      {/* 8 — the scrim the text stands on. Strongest at the left, where the
              temperature and the condition sit, and gone by the right so the
              sky is still a sky. Without it a white readout over a bright
              horizon is unreadable, which is the failure every weather app
              with a photo background has to solve too. */}
      <div
        className="absolute inset-0"
        style={{
          // It only has to carry the readout, and the readout is in the left
          // third — so it gets out of the way fast. At 0.35 over the middle
          // the sun came out a dull ochre ball: a scrim heavy enough to
          // protect text nobody has put there is just a filter over the
          // picture. The forecast strip on the right carries its own shadow
          // instead (see WeatherWidget), which is one ink that works on any
          // sky rather than a wash that dims every sky.
          background:
            "linear-gradient(90deg, rgba(6,18,38,0.62) 0%, rgba(6,18,38,0.40) 28%, rgba(6,18,38,0.16) 50%, rgba(6,18,38,0.10) 100%)",
        }}
      />
    </div>
  );
}
