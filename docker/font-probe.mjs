// ============================================================================
// Does the receipt font actually render inside this image?
//
// Run at image-build time, from the runner's WORKDIR, with the same
// FONTCONFIG_PATH that `src/lib/clover/receipt-image.ts` computes at runtime.
// It reproduces that file's `glyphsRender()` guard so a font problem fails the
// BUILD rather than printing on a customer's Clover Flex.
//
// ── WHY IT COMPARES TWO STRINGS INSTEAD OF LOOKING FOR INK ────────────────
//
// A missing font does NOT render blank. librsvg draws the missing-glyph box,
// and a box is ink — so "did anything render?" passes with flying colours while
// the receipt is a grid of empty rectangles. That happened, on a real Flex, on
// 2026-08-19.
//
// Tofu boxes are IDENTICAL for every character. A real font is not: `iiii` is
// narrow and `WWWW` is wide, so they must produce measurably different amounts
// of ink. Equal ink means every glyph came out as the same box.
//
// ── AND WHY THE IMAGE INSTALLS NO SYSTEM FONTS ────────────────────────────
//
// A `fonts-*` package would defeat this test rather than help it. DejaVu is
// proportional, so `iiii` and `WWWW` differ and the probe PASSES — while the
// receipt prints in a proportional face on a fixed 32-column thermal head, i.e.
// silently misaligned instead of loudly broken.
// ============================================================================

import sharp from "sharp";

const svg = (text) =>
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="64">' +
      '<rect width="100%" height="100%" fill="#ffffff"/>' +
      '<text x="4" y="44" font-family="JetBrains Mono, monospace" ' +
      'font-size="36" font-weight="400" fill="#000000">' +
      text +
      "</text></svg>",
  );

const inkOf = (buf) => buf.reduce((n, v) => n + (v < 128 ? 1 : 0), 0);

const render = (t) =>
  sharp(svg(t)).flatten({ background: "#ffffff" }).greyscale().raw().toBuffer();

const [narrow, wide] = await Promise.all([render("iiii"), render("WWWW")]);
const [a, b] = [inkOf(narrow), inkOf(wide)];

if (a === 0 || b === 0) {
  console.error(`FAIL: nothing rendered (iiii=${a} WWWW=${b}).`);
  console.error("librsvg produced a blank image — fontconfig found no font.");
  process.exit(1);
}

if (a === b) {
  console.error(`FAIL: tofu (iiii=${a} WWWW=${b} — identical).`);
  console.error("Every glyph is the same missing-glyph box. Either");
  console.error("FONTCONFIG_PATH is wrong or JetBrainsMono-400.ttf is not in");
  console.error("the image. A receipt built now would print empty rectangles.");
  process.exit(1);
}

console.log(`receipt font OK — iiii=${a}, WWWW=${b} ink pixels`);
