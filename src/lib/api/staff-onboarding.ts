"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_STAFF_HR_CONFIG,
  type OffboardingTemplate,
  type OnboardingTemplate,
  type StaffHrConfig,
} from "@/data/staff-onboarding";

// ============================================================================
// Onboarding/offboarding TEMPLATES and the facility HR config, from Postgres.
//
// These are facility configuration — the checklists a business designs once.
// They lived in localStorage, which meant a facility's onboarding design
// existed in exactly one browser: a manager who built a Groomer template on
// their laptop had configured Chrome, not the facility.
//
// NO MOCK FALLBACK HERE, deliberately, and unlike src/lib/api/live-fetch.ts.
// That helper falls back to fixtures on a 401 because most of the app was
// still browsed signed-out mid-cutover. Every portal requires a session now,
// and these screens sit behind the facility gate — so a 401 is not a state to
// paper over, it is a bug worth seeing. An empty template list is also
// meaningful on its own ("this facility has not built one yet") and a fixture
// would hide exactly that.
//
// The settings components still read the mock store. This layer is the seam
// they move onto; wiring them is the next task, not this one.
// ============================================================================

const BASE = "/api/staff-onboarding";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

async function writeJson<T>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  payload?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (response.status === 204) return undefined as T;

  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    // The uniqueness trigger writes for a person — "Another active template
    // already covers: groomer" — and the route passes it through. Surfacing
    // that beats a generic failure the manager cannot act on.
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const staffOnboardingKeys = {
  all: ["staff-onboarding"] as const,
  templates: () => [...staffOnboardingKeys.all, "templates"] as const,
  offboardingTemplates: () =>
    [...staffOnboardingKeys.all, "offboarding-templates"] as const,
  hrConfig: () => [...staffOnboardingKeys.all, "hr-config"] as const,
};

export const staffOnboardingQueries = {
  /** Templates with their manager + employee tasks nested, in `position` order. */
  templates: () => ({
    queryKey: staffOnboardingKeys.templates(),
    queryFn: () => readJson<OnboardingTemplate[]>(`${BASE}/templates`),
  }),
  offboardingTemplates: () => ({
    queryKey: staffOnboardingKeys.offboardingTemplates(),
    queryFn: () =>
      readJson<OffboardingTemplate[]>(`${BASE}/offboarding-templates`),
  }),
  hrConfig: () => ({
    queryKey: staffOnboardingKeys.hrConfig(),
    queryFn: () => readJson<StaffHrConfig>(`${BASE}/hr-config`),
  }),
};

// ── Writes ──────────────────────────────────────────────────────────────────
// Every mutation invalidates the whole `staff-onboarding` key rather than
// surgically patching the cache. Templates carry nested tasks whose positions
// shift when any one of them moves, so a partial update would leave the client
// holding an ordering the server no longer agrees with — and ordering is the
// one thing the migration went out of its way to make explicit.

export function useSaveOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: OnboardingTemplate) =>
      template.id
        ? writeJson<OnboardingTemplate>(
            `${BASE}/templates/${template.id}`,
            "PATCH",
            template,
          )
        : writeJson<OnboardingTemplate>(`${BASE}/templates`, "POST", template),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffOnboardingKeys.all });
    },
  });
}

export function useDeleteOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      writeJson<void>(`${BASE}/templates/${id}`, "DELETE"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffOnboardingKeys.all });
    },
  });
}

export function useSaveOffboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (template: OffboardingTemplate) =>
      template.id
        ? writeJson<OffboardingTemplate>(
            `${BASE}/offboarding-templates/${template.id}`,
            "PATCH",
            template,
          )
        : writeJson<OffboardingTemplate>(
            `${BASE}/offboarding-templates`,
            "POST",
            template,
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffOnboardingKeys.all });
    },
  });
}

export function useDeleteOffboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      writeJson<void>(`${BASE}/offboarding-templates/${id}`, "DELETE"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffOnboardingKeys.all });
    },
  });
}

/**
 * PUT, not PATCH: there is exactly one config row per facility and the settings
 * screen edits it as a whole object. The route upserts, so a facility that has
 * never saved one does not need a separate "create" path — which is the shape
 * of a row whose primary key is the facility itself.
 */
export function useSaveStaffHrConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<StaffHrConfig>) =>
      writeJson<StaffHrConfig>(`${BASE}/hr-config`, "PUT", patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffOnboardingKeys.hrConfig(),
      });
    },
  });
}

export function useOnboardingTemplatesQuery() {
  return useQuery(staffOnboardingQueries.templates());
}
export function useOffboardingTemplatesQuery() {
  return useQuery(staffOnboardingQueries.offboardingTemplates());
}
/**
 * The facility's staff/HR config, with the SAME SIGNATURE the mock store had:
 * always a StaffHrConfig, never undefined.
 *
 * That is not laziness about loading states — it is what makes this swap safe
 * across seventeen call sites, five of them deep in the employee shell
 * (ClockInOut, RegisterOpenGate, RegisterCloseWatcher, EmployeeHeader,
 * TimeClock). Those read booleans like `requireClockInConfirm` and branch on
 * them. Handing them `undefined` for the first few hundred milliseconds would
 * mean a two-step clock confirmation that is briefly one-step, and a register
 * gate that briefly is not there — behaviour changes disguised as loading
 * states, in the exact places where the facility's policy is the point.
 *
 * So the defaults are the fallback, in ONE place, and they are the same
 * defaults the mock seeded. A facility that has never opened the settings
 * screen has no row at all (the API 404s), and defaults are the correct answer
 * for that too — not an error, and not an empty object.
 */
export function useStaffHrConfig(): StaffHrConfig {
  const { data } = useQuery({
    ...staffOnboardingQueries.hrConfig(),
    // A 404 means "this facility has not saved settings", which is a normal
    // state and not worth retrying.
    retry: false,
  });
  return data ?? DEFAULT_STAFF_HR_CONFIG;
}

export function useStaffHrConfigQuery() {
  return useQuery(staffOnboardingQueries.hrConfig());
}

/**
 * The active template for a role, as a PURE function over an already-loaded
 * list.
 *
 * The mock version read the store during render (staff-onboarding.ts:1298),
 * which was fine while the store was synchronous and is not fine now: a hook
 * that resolves a template mid-render either blocks the dialog or flickers
 * through an empty state while the fetch lands.
 *
 * So resolution moves OUT of the dialog. The staff page — already mounted while
 * the manager reads the roster — holds the query, and the dialog receives the
 * resolved list as a prop. By the time anyone clicks "Add staff" the data has
 * been in cache for as long as they have been looking at the page.
 *
 * Same precedence as the original: a role-specific active template, then the
 * universal one (empty appliesToRoles), then whatever is first. The database
 * now guarantees at most one active template per role, so `.find()` is no
 * longer picking by array order — see 20260803140000, Decision 4.
 */
export function resolveTemplateForRole(
  templates: OnboardingTemplate[],
  role: string,
): OnboardingTemplate | undefined {
  const active = templates.filter((t) => t.status === "active");
  return (
    active.find((t) => t.appliesToRoles.includes(role as never)) ??
    active.find((t) => t.appliesToRoles.length === 0) ??
    active[0]
  );
}
