"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  NO_LOYALTY_PROGRAM,
  type LoyaltyProgramConfig,
} from "@/lib/settings/loyalty";
import type { FacilityLoyaltyConfig } from "@/types/loyalty";

// ============================================================================
// The facility's loyalty programme.
//
// ── WHERE IT USED TO LIVE ─────────────────────────────────────────────────
//
//     const storageKey = (facilityId: number) => `loyalty-program-${facilityId}`;
//     const [config, setConfig] = useState(() => loadConfig(facilityId));
//     window.localStorage.setItem(storageKey(facilityId), JSON.stringify(next));
//
// Per browser, and under a facility id that was the constant `1` at every call
// site. So an owner configured their tiers, watched them stick, and every other
// member of staff, every other device and every customer went on seeing the
// seed file — while a second facility signing in on the same browser read the
// first one's programme.
//
// The file's own header said the seam was `loadConfig`/`persist`. It was.
// Everything below this line is that swap; the twenty-four consumers of
// `useLoyaltyProgram` are untouched.
//
// ── IT IS A SETTINGS DOMAIN, NOT A NEW TABLE ──────────────────────────────
//
// `facility_settings.loyalty_config`, so no migration: the domain registry
// exists precisely so a facility-owned config can be added without one. See
// lib/settings/loyalty.ts for the schema and for what an absent row means.
//
// ── THE WRITES ARE AWAITABLE NOW, AND THAT IS THE POINT ───────────────────
//
// `updateConfig` and `patchConfig` returned `void` when the destination was
// localStorage, which cannot refuse. Postgres can: RLS requires
// `manage_settings`, and a suspended facility is refused outright. Every one of
// them returns a promise that REJECTS on refusal, because the alternative is
// the shape this repo keeps finding — a screen that says "Badges saved" over a
// write the database declined.
//
// ── AND THE PROGRAMME IS DERIVED, NEVER SEEDED ────────────────────────────
//
// No `useState` holds it. An initialiser runs on the first render, before the
// settings request can have answered, and would latch this provider onto the
// empty fallback for the life of the page — handing every one of those
// consumers "no programme" for a facility that has one. That bug has been
// found three times in a fortnight (employee availability, payroll rules, tax
// settings), and this provider feeds a checkout screen.
//
// `isPending` travels with the value so a screen can wait rather than draw a
// programme nobody has read yet.
// ============================================================================

/**
 * The numeric facility id the LOYALTY FIXTURES are keyed by.
 *
 * Not the facility. The real one is a uuid and the settings row is already
 * scoped to it — this constant exists only because `loyalty-accounts`,
 * `loyalty-redemptions` and `loyalty-transactions` are still hand-authored
 * files keyed by `facilityId: 1`, and the screens that read them need the same
 * number back. It goes when those become tables.
 *
 * It no longer decides where the CONFIG is stored, which is what it used to do.
 */
const DEFAULT_LOYALTY_FACILITY_ID = 1;

interface LoyaltyProgramContextValue {
  /** See {@link DEFAULT_LOYALTY_FACILITY_ID} — a fixture key, not the facility. */
  facilityId: number;
  config: FacilityLoyaltyConfig;
  /** False until the programme has been read. Draw nothing decisive before it. */
  isPending: boolean;
  /**
   * False means NO PROGRAMME HAS BEEN SET UP — which is not the same as one
   * that has been set up and switched off. `config.enabled` answers the second
   * question; this one answers the first.
   */
  configured: boolean;
  /** Persist a full updated config. Rejects if the write is refused. */
  updateConfig: (config: FacilityLoyaltyConfig) => Promise<void>;
  /** Persist a partial patch. Rejects if the write is refused. */
  patchConfig: (patch: Partial<FacilityLoyaltyConfig>) => Promise<void>;
  /** Clear the programme back to none. Rejects if the write is refused. */
  resetConfig: () => Promise<void>;
  /** True while a write is in flight. */
  isSaving: boolean;
}

const LoyaltyProgramContext = createContext<LoyaltyProgramContextValue | null>(
  null,
);

export function LoyaltyProgramProvider({ children }: { children: ReactNode }) {
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();

  const stored = settings.loyalty_config;

  // `facilityId` is put back for the consumers that still read it; it is not
  // part of what is stored. See the constant above.
  const config = useMemo<FacilityLoyaltyConfig>(
    () => ({ ...stored.value, facilityId: DEFAULT_LOYALTY_FACILITY_ID }),
    [stored.value],
  );

  const write = useCallback(
    async (next: LoyaltyProgramConfig) => {
      await saveSetting.mutateAsync({
        domain: "loyalty_config",
        value: { ...next, updatedAt: new Date().toISOString() },
      });
    },
    [saveSetting],
  );

  const updateConfig = useCallback(
    async (next: FacilityLoyaltyConfig) => {
      const { facilityId: _key, ...rest } = next;
      await write(rest);
    },
    [write],
  );

  const patchConfig = useCallback(
    async (patch: Partial<FacilityLoyaltyConfig>) => {
      const { facilityId: _key, ...rest } = { ...config, ...patch };
      await write(rest);
    },
    [config, write],
  );

  // Was "restore this facility's defaults", which meant re-seeding the fixture's
  // four-tier scheme. Clearing is the honest counterpart now: a facility that
  // resets has no programme, rather than one the platform chose for them.
  const resetConfig = useCallback(async () => {
    await write(NO_LOYALTY_PROGRAM);
  }, [write]);

  const value = useMemo<LoyaltyProgramContextValue>(
    () => ({
      facilityId: DEFAULT_LOYALTY_FACILITY_ID,
      config,
      isPending,
      configured: stored.configured,
      updateConfig,
      patchConfig,
      resetConfig,
      isSaving: saveSetting.isPending,
    }),
    [
      config,
      isPending,
      stored.configured,
      updateConfig,
      patchConfig,
      resetConfig,
      saveSetting.isPending,
    ],
  );

  return (
    <LoyaltyProgramContext.Provider value={value}>
      {children}
    </LoyaltyProgramContext.Provider>
  );
}

export function useLoyaltyProgram() {
  const ctx = useContext(LoyaltyProgramContext);
  if (!ctx) {
    throw new Error(
      "useLoyaltyProgram must be used within a LoyaltyProgramProvider",
    );
  }
  return ctx;
}
