import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent skills (`npx skills add …`). Third-party templates and
    // reference docs, not project source — linting them reports on code we do
    // not own and cannot fix.
    ".agents/**",
    // Git worktrees. A worktree is a COMPLETE SECOND CHECKOUT of this repo,
    // node_modules and all, so ESLint walking it lints the whole project twice
    // and reports every dependency it finds. Measured 2026-08-22: one worktree
    // took `bun run lint` from clean to 83,080 problems across 35,412 files.
    //
    // That is worse than noise. A gate that ALWAYS fails cannot fail
    // meaningfully — the real errors are indistinguishable from the 83,000, so
    // the honest reading of a red lint became "check whether a worktree is
    // open", which is the same as not running it. CI never saw this because no
    // worktree exists there; it only broke the local run, which is the one that
    // is supposed to catch things BEFORE they reach production.
    //
    // Nothing the project owns lives here: `.claude/` holds settings, skills
    // and worktrees, and outside `worktrees/` it contains no lintable file at
    // all. Scoped to `worktrees/` rather than `.claude/**` so that a future
    // `.claude` script would still be linted.
    ".claude/worktrees/**",
    // The design system's live reference page ships its own runtime. It is a
    // browser-only specimen sheet that opens offline from a file:// URL — React
    // 17 UMD off a CDN, an IIFE, no build step — and the whole point of it is
    // that it is NOT this app: the work order says recreate its designs in this
    // repo's environment and never port its markup, its runtime or its inline
    // styles. Linting it reports React 18 and Next rules against code nobody
    // here will ever change, and two of them are errors, so it takes the gate
    // down. Scoped to the one file rather than `docs/**` so a script the project
    // actually owns would still be linted.
    "docs/design-system/support.js",
  ]),
  {
    // SCOPED ON PURPOSE, and it must stay scoped. The `react-hooks` rules below
    // come from eslint-config-next, which registers that plugin only for
    // `**/*.{js,jsx,mjs,ts,tsx,mts,cts}`. Leaving this object unscoped applies
    // the rules to every file — including a `.cjs`, which that pattern does NOT
    // cover — and ESLint then fails to LOAD with "could not find plugin
    // react-hooks". The whole lint step dies; it does not degrade.
    //
    // That is exactly how this broke: a vendored skill shipped one .cjs file and
    // took the entire gate down with it. Match the pattern above when adding any
    // rule from a plugin this object does not itself declare.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { "unused-imports": unusedImports },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    extends: [betterTailwindcss.configs.recommended],
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
    rules: {
      "better-tailwindcss/enforce-consistent-class-order": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off", // conflicts with Prettier
      "better-tailwindcss/no-unnecessary-whitespace": "off", // conflicts with Prettier
      "better-tailwindcss/enforce-canonical-classes": "warn",
      "better-tailwindcss/no-unknown-classes": [
        "warn",
        {
          // Project-specific utilities defined as raw CSS in src/app/globals.css,
          // which the plugin can't infer from the Tailwind theme. Anchored so they
          // match the bare class and any variant prefix (e.g. hover:shadow-elevated)
          // without masking unrelated classes. Genuine unknowns/typos stay flagged.
          ignore: [
            "(?:^|:)price-value$",
            "(?:^|:)bg-gradient-mesh$",
            "(?:^|:)bg-gradient-primary$",
            "(?:^|:)shadow-elevated$",
            "(?:^|:)hover-lift$",
            "(?:^|:)status-online$",
            "(?:^|:)scrollbar-(?:thin|hidden)$",
            "(?:^|:)animate-fade-in$",
            // Tailwind v4 `!important` modifier — the plugin doesn't parse the `!` prefix.
            "^!",
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
