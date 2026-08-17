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

const nextConfig: NextConfig = {
  reactCompiler: true,
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
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
