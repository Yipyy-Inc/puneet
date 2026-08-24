/**
 * Look at the app.
 *
 *   bun run shoot owner "/facility/dashboard/settings?section=yipyy-pay"
 *   bun run shoot admin /dashboard/commercial/merchant-applications --dark
 *   bun run shoot owner --api "/api/waivers?all=1"
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * "Verify the touched journey before claiming done" is the rule in AGENTS.md,
 * and for a long time the only way to keep it was a person opening a browser.
 * So it got skipped, and screens shipped that compiled, typechecked, passed
 * their route tests, and had never been looked at by anybody. Playwright was
 * already installed for the e2e suite; this points it at one page and saves a
 * PNG. No new dependency.
 *
 * ── WHY IT SPAWNS THE PLAYWRIGHT CLI RATHER THAN LAUNCHING A BROWSER ──────
 *
 * Because under **bun** it cannot. `chromium.launch()` from a bun process
 * starts the browser and then never completes the handshake, failing at the
 * 180-second launch timeout; the identical call under **node** returns in
 * 337ms. Measured both ways. Playwright talks to the browser over
 * `--remote-debugging-pipe` and bun's pipe handling does not carry it.
 *
 * That is also why `bun run test:e2e` works — it shells out to the Playwright
 * CLI, which spawns node workers. So this does the same: bun parses the
 * arguments, node drives the browser. If you ever find yourself importing
 * `chromium` into a bun script, this paragraph is why it hangs.
 *
 * The work itself is in tests/shots/shoot.spec.ts.
 */
import { spawnSync } from "node:child_process";

const DEFAULT_OUT = "C:/tmp/pwv/shots";

/**
 * Undo Git Bash's path mangling, and tolerate a missing leading slash.
 *
 * MSYS rewrites any argument that looks like a Unix absolute path into a
 * Windows one, so `/dashboard/x` arrives as `C:/Program Files/Git/dashboard/x`
 * and the browser is asked for a page that does not exist. The alternative is
 * remembering `MSYS_NO_PATHCONV=1` every single time, which nobody will.
 */
function normalise(arg: string): string {
  const forward = arg.split("\\").join("/");
  const marker = "/Git/";
  const looksMangled = /^[A-Za-z]:\//.test(forward) && forward.includes(marker);
  const path = looksMangled
    ? `/${forward.slice(forward.indexOf(marker) + marker.length)}`
    : forward;
  return path.startsWith("/") ? path : `/${path}`;
}

const argv = process.argv.slice(2);
const paths: string[] = [];
let account = "";
let out = DEFAULT_OUT;
let dark = false;
let api = false;
let settle = "600";

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]!;
  if (arg === "--dark") dark = true;
  else if (arg === "--api") api = true;
  else if (arg === "--out") out = argv[++i] ?? out;
  else if (arg === "--settle") settle = argv[++i] ?? settle;
  else if (arg.includes("/")) paths.push(normalise(arg));
  else if (!account) account = arg;
  else paths.push(normalise(arg));
}

if (!account || paths.length === 0) {
  console.error(
    [
      "Usage: bun run shoot <account> <path...> [--api] [--dark] [--out DIR]",
      "",
      "  account   an email, or one of: admin owner manager groomer reception",
      "            caretaker accountant customer",
      "  path      any app path, quoted if it has a query string",
      "  --api     print the JSON body instead of taking a picture",
      "  --dark    capture in dark mode",
      `  --out     default ${DEFAULT_OUT}`,
      "",
      "Point it at something already running:",
      "  bun run build && bun run start --port 3100",
      "  E2E_BASE_URL=http://localhost:3000 bun run shoot ...   # or a dev server",
    ].join("\n"),
  );
  process.exit(2);
}

const result = spawnSync(
  "bunx",
  [
    "playwright",
    "test",
    "--config=playwright.shots.config.ts",
    `--project=${dark ? "dark" : "light"}`,
  ],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      SHOOT_ACCOUNT: account,
      // Newline-separated: a path may contain commas in a query string, and a
      // separator that can appear in the value is not a separator.
      SHOOT_PATHS: paths.join("\n"),
      SHOOT_OUT: out,
      SHOOT_API: api ? "1" : "0",
      SHOOT_SETTLE: settle,
    },
  },
);

process.exit(result.status ?? 1);
