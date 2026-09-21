// ============================================================================
// IS THIS PERSON ALREADY A CLIENT HERE, UNDER ANOTHER ADDRESS?
//
// A facility cannot hold two clients with the same email — there is a unique
// index, and `POST /api/clients` already answers "Someone with that email is
// already a client here". So every duplicate that DOES get made has a
// different address on it, which is exactly the case nothing could see.
//
// ── HOW ONE ACTUALLY HAPPENED ─────────────────────────────────────────────
//
// 2026-09-21, doggieville-mtl: refs 855 and 92037410, both "Parminder Singh",
// each with a dog called Bubu. It was made while working around a login
// problem — the customer could not claim their own record, so a second one
// got created under a different address.
//
// **The phones did not match.** 855 carries one; 92037410 is null. So a
// phone-based check would have missed it entirely, and the NAME is the only
// signal there was. That is measured, not assumed, and it is why the name is
// the primary match rather than the fallback.
//
// ── WHAT THIS IS DELIBERATELY NOT ─────────────────────────────────────────
//
// Not a block, and not a merge. Two people really can share a name, so this
// can only ever be a QUESTION for somebody who can see both records and judge.
// The caller confirms and proceeds; nothing is refused twice.
//
// And it is never shown to a CUSTOMER registering themselves: telling a
// stranger "there is already a Parminder Singh here" discloses a facility's
// client list to anyone who can guess a name. Staff already read that list,
// which is why this belongs on the staff path only.
// ============================================================================

/**
 * A name folded for comparison: case, accents and runs of whitespace.
 *
 * Accent-folded because "Geneviève" and "Genevieve" are one person to
 * everybody except a byte comparison, and a facility that types the plain form
 * once has made the duplicate this exists to catch.
 */
export function foldName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A phone reduced to its digits, so "(514) 690-8911" and "5146908911" are the
 * same number. Empty when there are none — an empty string must never match
 * another empty string, and callers check for that.
 */
export function foldPhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

export interface DuplicateCandidate {
  ref: number;
  name: string;
  email: string;
  phone?: string | null;
}

/**
 * Which of `existing` look like the same person as the one being created.
 *
 * Pure, so the rule is testable without a database. An exact email match is
 * NOT a duplicate for this purpose — that is a unique-index refusal with its
 * own clearer message, and reporting it here would give one mistake two
 * different answers.
 */
export function possibleDuplicates<T extends DuplicateCandidate>(
  incoming: { name: string; email: string; phone?: string | null },
  existing: T[],
): T[] {
  const name = foldName(incoming.name);
  const phone = foldPhone(incoming.phone);
  const email = (incoming.email ?? "").trim().toLowerCase();

  return existing.filter((row) => {
    if ((row.email ?? "").trim().toLowerCase() === email) return false;
    if (name !== "" && foldName(row.name) === name) return true;
    return phone !== "" && foldPhone(row.phone) === phone;
  });
}

/** "#855 Parminder Singh" — what staff are asked about, shortest useful form. */
export function describeCandidates(rows: DuplicateCandidate[]): string {
  return rows.map((r) => `#${r.ref} ${r.name}`).join(", ");
}
