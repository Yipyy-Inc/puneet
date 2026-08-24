import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// next-intl was installed, given a request config, two message catalogues and a
// settings layer -- and never connected, so `src/i18n/request.ts` was dead code
// and `getTranslations()` would have thrown at every call site. There were none.
// This is the wire that was missing; without it the language switcher on the
// auth screens is a control that changes nothing.
//
// Additive on purpose: a page that calls no translation function is unaffected,
// which is what makes it safe to turn on across 266 routes to serve four.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * The hostname of this deployment's Supabase project, for next/image.
 *
 * Read here rather than written literally: it contains the project ref, and a
 * hardcoded one silently breaks every uploaded image on any other environment.
 */
const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // ── THE RECEIPT RENDERER NEEDS ITS FONT IN THE BUNDLE ──────────────────
  //
  // Vercel's serverless runtime ships no system fonts, so librsvg rendered
  // every glyph on the thermal receipt as a missing-glyph box. Next only traces
  // files it can see being imported, and a .ttf read through fontconfig is
  // invisible to that analysis — so it is named here explicitly or it simply
  // is not there at runtime.
  outputFileTracingIncludes: {
    "/api/payments/clover/**": ["./src/lib/clover/fonts/**"],
  },
  reactCompiler: true,

  // ── RETIRED PORTALS ───────────────────────────────────────────────────────
  //
  // The first redirects() block in this project. `/groomer` was a one-page
  // portal reading the src/data/grooming fixture; ADR 0005 retires it in favour
  // of the canonical /employee shell, which is permission-driven and serves
  // every job title rather than one.
  //
  // A config redirect rather than a `redirect()` page, because the bookmark
  // people actually hold is `/groomer/dashboard`, not `/groomer` — a page can
  // only answer for the path it occupies, and deleting the tree would 404 the
  // deeper one. This answers for both, at the edge, with no React render.
  //
  // TEMPORARY (307), not permanent. A 308 is cached by the browser until it is
  // cleared, so if /groomer is ever revived — or this redirect is wrong — the
  // people who hit it first would be the last to find out.
  //
  // The two scheduling screens below were RETIRED rather than converted, on
  // 2026-08-24. Both edited facts that were already real somewhere else, so a
  // facility could change something, be told it saved, and have the system go
  // on using the other value:
  //
  //   company       -> name, contact details, timezone and per-location hours,
  //                    all of which live on `facilities` / `locations` /
  //                    the `business_hours` settings domain. The sharp edge was
  //                    the timezone: `apply_schedule_template` reads
  //                    `locations.timezone` to convert every shift it creates.
  //   notifications -> quiet hours and event triggers duplicated the real
  //                    `notification_toggles` domain, and its "Send a message"
  //                    tab announced "Sent to N recipients" while writing to
  //                    React state and nothing else.
  //
  // A duplicate editor is worse than a screen that does nothing, because it
  // disagrees with one that works.
  async redirects() {
    return [
      {
        source: "/groomer/:path*",
        destination: "/employee/schedule",
        permanent: false,
      },
      {
        source: "/facility/dashboard/services/scheduling/company",
        destination: "/facility/dashboard/settings?section=business",
        permanent: false,
      },
      {
        source: "/facility/dashboard/services/scheduling/notifications",
        destination: "/facility/dashboard/settings?section=notifications",
        permanent: false,
      },
      // Retired 2026-08-24, same reason as the two above. This one held TWO
      // parallel systems: an onboarding tracker duplicating the real one under
      // Staff, and a 1,347-line document-template editor whose five "Template
      // created / updated / deleted" toasts sat on no mutation and no API call
      // at all. The real template editor is in settings; per-hire progress is
      // under Staff, which is where the nav now points.
      {
        source: "/facility/dashboard/services/scheduling/onboarding",
        destination: "/facility/dashboard/staff",
        permanent: false,
      },
    ];
  },
  typescript: {
    // Type checking is NOT skipped — it is moved, not removed. `bun run
    // typecheck` runs in the husky pre-commit and pre-push hooks and, crucially,
    // as its own unbypassable CI job (.github/workflows/ci.yml). Letting
    // `next build` run tsc a fourth time over ~213k lines of TSX pushed the
    // Vercel builder past its 8 GB heap: deployment dpl_7tc137yhs died with
    // SIGKILL 29s into "Running TypeScript" (Vercel flagged it
    // buildMachineUpgradeReason: "out-of-memory"). Do not flip this back
    // without first removing the CI typecheck job — the gate lives there now.
    ignoreBuildErrors: true,
  },
  images: {
    // ── THE FACILITY'S OWN LOGO LIVES IN SUPABASE STORAGE ─────────────────
    //
    // next/image refuses any host not listed here and answers 400, which the
    // browser renders as a broken-image icon. A facility uploaded its logo on
    // 2026-08-19, the row was written correctly, and every screen showing it —
    // the sidebar, the sign-in card, report cards, gift-card emails — drew a
    // broken image instead. The upload was blamed; the upload was fine.
    //
    // Derived from the environment rather than hardcoded: the hostname carries
    // the project ref, so a literal would break on any other deployment.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              // Only the public bucket. A signed or private path has no
              // business being optimised and cached by the image proxy.
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  experimental: {
    // Enables forbidden()/unauthorized() so owner-only pages can return a real
    // 403 (rendered by app/forbidden.tsx) instead of a redirect or 404.
    authInterrupts: true,
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
    turbopackFileSystemCacheForBuild: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default withNextIntl(nextConfig);
