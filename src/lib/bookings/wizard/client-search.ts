import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

// ============================================================================
// Finding a client in the booking wizard's first step (the client's mock,
// 2026-10-01): one search over the client's name, email and phone digits and
// the names of their pets, and nothing listed until two characters are typed.
//
//   "Mango"     finds Parminder Singh through a pet, and says so ("Pet match")
//   "Tremblay"  finds Amélie Tremblay by name
//   "514 690"   finds whoever's phone holds those digits (three or more)
//
// Accents are folded on both sides, so "amelie" finds "Amélie" — a front desk
// types fast and a French name should not need its accent to be found.
//
// The mock lists every hit in its own order. A real facility has hundreds of
// clients, so hits are ranked (a name that starts with what was typed first,
// then a name that contains it, then a pet, then email or phone) and capped;
// `total` says how many there were, so the screen can say there are more.
// ============================================================================

/** Results are listed from this many characters on. */
export const CLIENT_SEARCH_MIN_CHARS = 2;
/** Phone digits are matched from this many on — "51" would match everyone. */
const CLIENT_SEARCH_MIN_DIGITS = 3;

export interface ClientSearchHit {
  client: Client;
  /** The client's pets whose names hold what was typed. */
  matchedPets: Pet[];
}

/** Lower case, accents removed: "Amélie" → "amelie". */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function searchClients(
  clients: readonly Client[],
  query: string,
  limit = 25,
): { hits: ClientSearchHit[]; total: number } {
  const q = foldText(query.trim());
  if (q.length < CLIENT_SEARCH_MIN_CHARS) return { hits: [], total: 0 };
  const digits = q.replace(/\D/g, "");

  const ranked: Array<ClientSearchHit & { rank: number }> = [];
  for (const client of clients) {
    const name = foldText(client.name);
    const matchedPets = client.pets.filter((pet) =>
      foldText(pet.name).includes(q),
    );
    const byName = name.includes(q);
    const byEmail = foldText(client.email ?? "").includes(q);
    const byPhone =
      digits.length >= CLIENT_SEARCH_MIN_DIGITS &&
      (client.phone ?? "").replace(/\D/g, "").includes(digits);
    if (!byName && !byEmail && !byPhone && matchedPets.length === 0) continue;

    const wordStart = name.split(/[\s-]+/).some((word) => word.startsWith(q));
    const rank = wordStart ? 0 : byName ? 1 : matchedPets.length > 0 ? 2 : 3;
    ranked.push({ client, matchedPets, rank });
  }

  ranked.sort(
    (a, b) => a.rank - b.rank || a.client.name.localeCompare(b.client.name),
  );
  return {
    hits: ranked
      .slice(0, limit)
      .map(({ client, matchedPets }) => ({ client, matchedPets })),
    total: ranked.length,
  };
}

/**
 * The pets a picked result starts with: the ones the search matched, or the
 * client's only pet. Several pets and no match start with none chosen.
 * `selectable` drops a pet the booking cannot take (an evaluation for a pet
 * already evaluated, a program whose prerequisite it has not finished).
 */
export function petsForPick(
  hit: ClientSearchHit,
  selectable: (pet: Pet) => boolean = () => true,
): number[] {
  const matched = hit.matchedPets.filter(selectable);
  if (matched.length > 0) return matched.map((pet) => pet.id);
  const pets = hit.client.pets.filter(selectable);
  return hit.client.pets.length === 1 && pets.length === 1 ? [pets[0]!.id] : [];
}

/**
 * The hint's three examples, from the facility's own clients — the mock's
 * try “Mango”, “Tremblay” or “514 690”, with names this desk knows. Null
 * when the clients cannot supply all three; the hint then says it plainly.
 */
export function searchExamples(
  clients: readonly Client[],
): { pet: string; surname: string; phone: string } | null {
  const withPet = clients.find((c) => c.pets.length > 0);
  const pet = withPet?.pets[0]?.name;
  const other = clients.find(
    (c) => c !== withPet && c.name.trim().split(/\s+/).length > 1,
  );
  const surname = other?.name.trim().split(/\s+/).at(-1);
  const phoned = clients.find(
    (c) => (c.phone ?? "").replace(/\D/g, "").length >= 6,
  );
  const digits = (phoned?.phone ?? "").replace(/\D/g, "");
  // A North American number's area code and exchange, as a desk would type
  // them: "514 690".
  const local =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  const phone =
    local.length >= 6 ? `${local.slice(0, 3)} ${local.slice(3, 6)}` : null;
  if (!pet || !surname || !phone) return null;
  return { pet, surname, phone };
}

/** Two letters for a person's avatar: "Parminder Singh" → "PS". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
