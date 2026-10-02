import type { TrainingPackage } from "@/types/training";

// ============================================================================
// A training program as the booking wizard's "Choose a program" offers it
// (the client's mock, 2026-10-01):
//
//   Private lesson      $95 / session    60 min    Single · 3-pack · 5-pack
//   Group class         $280 / series    6 weeks
//   Behaviour consult   $140             90 min
//
// The facility's own programs (Settings › Training › Rates). A program saved
// before `format` existed books as it always meant: `private` is a lesson,
// `group` a class series.
// ============================================================================

export type ProgramFormat = "group" | "lesson" | "consult";

export function programFormat(program: TrainingPackage): ProgramFormat {
  if (program.format) return program.format;
  return program.classType === "private" ? "lesson" : "group";
}

/** A lesson's or consult's length; a group's sessions are its series'. */
export function programMinutes(program: TrainingPackage): number {
  if (program.sessionMinutes && program.sessionMinutes > 0)
    return program.sessionMinutes;
  return programFormat(program) === "consult" ? 90 : 60;
}

export interface PackOption {
  /** 1 is the single session, at the program's price. */
  sessions: number;
  price: number;
  /** What the pack saves on that many single sessions; 0 for the single. */
  saves: number;
}

/** Single, then the facility's packs by size — lessons only. */
export function packOptions(program: TrainingPackage): PackOption[] {
  if (programFormat(program) !== "lesson") return [];
  const single = Math.max(0, program.price);
  const packs = [...(program.packs ?? [])]
    .filter((p) => p.sessions >= 2 && p.price >= 0)
    .sort((a, b) => a.sessions - b.sessions);
  const seen = new Set<number>([1]);
  return [
    { sessions: 1, price: single, saves: 0 },
    ...packs.flatMap((p) => {
      if (seen.has(p.sessions)) return [];
      seen.add(p.sessions);
      return [
        {
          sessions: p.sessions,
          price: p.price,
          saves: Math.max(
            0,
            Math.round((single * p.sessions - p.price) * 100) / 100,
          ),
        },
      ];
    }),
  ];
}

/** What one pet is charged for the program as chosen: a pack, or one of it. */
export function programPrice(program: TrainingPackage, sessions = 1): number {
  const pack = packOptions(program).find((p) => p.sessions === sessions);
  return pack ? pack.price : Math.max(0, program.price);
}

/** The programs a booking may offer, in the facility's order. */
export function bookablePrograms(
  programs: readonly TrainingPackage[],
): TrainingPackage[] {
  return programs
    .filter((p) => p.isActive !== false)
    .sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
}

/**
 * A lesson's packs as the Rates editor saves them: two sessions or more, a
 * price, one pack per size, smallest first. A half-filled row is dropped.
 */
export function cleanPacks(
  packs: ReadonlyArray<{ sessions: number | ""; price: number | "" }>,
): Array<{ sessions: number; price: number }> {
  const seen = new Set<number>();
  return packs
    .flatMap((pack) =>
      typeof pack.sessions === "number" &&
      Number.isInteger(pack.sessions) &&
      pack.sessions >= 2 &&
      typeof pack.price === "number" &&
      Number.isFinite(pack.price) &&
      pack.price >= 0
        ? [{ sessions: pack.sessions, price: pack.price }]
        : [],
    )
    .filter((pack) => {
      if (seen.has(pack.sessions)) return false;
      seen.add(pack.sessions);
      return true;
    })
    .sort((a, b) => a.sessions - b.sessions);
}
