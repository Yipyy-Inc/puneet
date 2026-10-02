import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// The client's booking-flow mock (docs/Facility_01_-_Find_client.html) renders
// any of its screens from one constant inside its bundled template:
//
//   const PRESET={\"portal\":\"facility\",\"svc\":\"boarding\",\"screen\":\"search\"};
//
// (quotes escaped, because the template is a JSON string). Rewriting that token
// and saving the page under a new name gives a file that opens straight on the
// screen asked for — no clicking through a mock to photograph it.
//
// `screen` is one of: search, client, service, confirm, done, or a Details
// sub-step's name ("Schedule", "Room type", "Add-ons", "Feeding",
// "Medication", "Package", "Groomer & time", "Program", "Trainer & time",
// "Goals"). `group: true` picks the group-class branch of training.
// ============================================================================

export type MockPortal = "facility" | "customer";
export type MockService = "boarding" | "daycare" | "grooming" | "training";

export interface MockPreset {
  portal: MockPortal;
  svc: MockService;
  screen: string;
  group?: boolean;
}

/** The three device widths the mock itself offers (and its heights). */
export const MOCK_DEVICES = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
] as const;

const SUB_STEPS: Record<MockService, string[]> = {
  boarding: ["Schedule", "Room type", "Add-ons", "Feeding", "Medication"],
  daycare: ["Schedule", "Add-ons", "Feeding", "Medication"],
  grooming: ["Package", "Add-ons", "Groomer & time"],
  training: ["Program", "Trainer & time", "Goals"],
};

/** Every screen worth comparing, for one portal. */
function screensFor(portal: MockPortal): MockPreset[] {
  const out: MockPreset[] = [
    { portal, svc: "boarding", screen: "search" },
    { portal, svc: "boarding", screen: "client" },
    { portal, svc: "boarding", screen: "service" },
  ];
  for (const svc of Object.keys(SUB_STEPS) as MockService[]) {
    for (const screen of SUB_STEPS[svc]) out.push({ portal, svc, screen });
    out.push({ portal, svc, screen: "confirm" });
  }
  out.push(
    { portal, svc: "training", screen: "Program", group: true },
    { portal, svc: "training", screen: "Trainer & time", group: true },
    { portal, svc: "training", screen: "confirm", group: true },
    { portal, svc: "boarding", screen: "done" },
    { portal, svc: "daycare", screen: "done" },
  );
  return out;
}

export const MOCK_SCREENS: MockPreset[] = [
  ...screensFor("facility"),
  ...screensFor("customer"),
];

/** A file-safe name: facility-boarding-room-type, customer-training-group-program… */
export function presetName(preset: MockPreset): string {
  const screen = preset.screen.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return [preset.portal, preset.svc, preset.group ? "group" : null, screen]
    .filter(Boolean)
    .join("-")
    .replace(/-+$/, "");
}

const MOCK_FILE = "docs/Facility_01_-_Find_client.html";
const PRESET_TOKEN =
  /const PRESET=\{\\"portal\\":\\"[a-z]+\\",\\"svc\\":\\"[a-z]+\\",\\"screen\\":\\"[a-z]+\\"\};/;

/**
 * Writes the mock with `preset` baked in and returns its path. The variants
 * live outside the repository: they are 418 KB each and only ever looked at.
 */
export function writeMockVariant(preset: MockPreset, dir: string): string {
  const source = readFileSync(MOCK_FILE, "utf8");
  if (!PRESET_TOKEN.test(source)) {
    throw new Error(`The PRESET token is no longer in ${MOCK_FILE}.`);
  }
  const literal = JSON.stringify(preset).replace(/"/g, '\\"');
  const html = source.replace(PRESET_TOKEN, `const PRESET=${literal};`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${presetName(preset)}.html`);
  writeFileSync(path, html);
  return path;
}
