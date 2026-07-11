import { clients } from "@/data/clients";
import { getEstimateSettings } from "@/data/estimate-settings";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type { Estimate } from "@/types/booking";

const DEFAULT_FACILITY = "Example Pet Care Facility";

export interface ProvisionOutcome {
  /** True only when a brand-new pending-activation account was created. */
  accountCreated: boolean;
  clientId: number | null;
  estimateToken: string | null;
}

// Deterministic token — FNV-1a over the seed (no Math.random, which would break
// SSR/replay). Good enough for a mock magic link.
function tokenFor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `est_${(h >>> 0).toString(36)}${seed.length.toString(36)}`;
}

function nextClientId(): number {
  return clients.reduce((max, c) => Math.max(max, c.id), 0) + 1;
}

function nextPetId(): number {
  let max = 0;
  for (const c of clients) {
    for (const p of c.pets) max = Math.max(max, p.id);
  }
  return max + 1;
}

function makePet(
  id: number,
  info: { name: string; breed?: string; weight?: number; type?: string },
): Pet {
  return {
    id,
    name: info.name,
    type: info.type ?? "Dog",
    breed: info.breed ?? "",
    age: 0,
    weight: info.weight ?? 0,
    color: "",
    microchip: "",
    allergies: "",
    specialNeeds: "",
    petStatus: "active",
  };
}

/**
 * Auto-provision a pending-activation account when a **sent** estimate goes to
 * an email that isn't already in this facility's CRM (src/data/clients.ts).
 *
 * Mutates the estimate with the account link + magic-link fields
 * (`accountCreated`, `estimateToken`, `magicLinkExpiresAt`, `clientId`,
 * `petIds`) and returns whether a new account was created — for the send
 * success notice. Call ONLY on send; never on save-as-draft. No-op (returns
 * `accountCreated: false`) when the email already matches an account.
 */
export function provisionAccountForEstimate(
  estimate: Estimate,
  opts?: { facilityName?: string; now?: Date },
): ProvisionOutcome {
  const facilityName = opts?.facilityName ?? DEFAULT_FACILITY;
  const email = (estimate.guestEmail || estimate.clientEmail || "").trim();
  if (!email) {
    return {
      accountCreated: false,
      clientId: estimate.clientId ?? null,
      estimateToken: estimate.estimateToken ?? null,
    };
  }

  // Already in the CRM for this facility → link, but do NOT create.
  const existing = clients.find(
    (c) =>
      c.facility === facilityName &&
      c.email.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    estimate.clientId = existing.id;
    return {
      accountCreated: false,
      clientId: existing.id,
      estimateToken: estimate.estimateToken ?? null,
    };
  }

  const now = opts?.now ?? new Date();
  const settings = getEstimateSettings();

  // Pet records from the estimate's pets (guestPetInfo enriches the first).
  const petSource =
    estimate.petNames.length > 0
      ? estimate.petNames.map((name, i) => ({
          name,
          breed: i === 0 ? estimate.guestPetInfo?.breed : undefined,
          weight:
            i === 0 && estimate.guestPetInfo?.weight
              ? Number(estimate.guestPetInfo.weight) || undefined
              : undefined,
        }))
      : estimate.guestPetInfo
        ? [
            {
              name: estimate.guestPetInfo.name,
              breed: estimate.guestPetInfo.breed,
              weight: estimate.guestPetInfo.weight
                ? Number(estimate.guestPetInfo.weight) || undefined
                : undefined,
            },
          ]
        : [];

  let petId = nextPetId();
  const pets: Pet[] = petSource
    .filter((p) => p.name.trim())
    .map((p) => makePet(petId++, p));

  const clientId = nextClientId();
  const newClient: Client = {
    id: clientId,
    name: estimate.guestName || estimate.clientName || email,
    email,
    phone: estimate.guestPhone || estimate.clientPhone,
    status: "pending-activation",
    facility: facilityName,
    pets,
    additionalContacts: [],
  };
  clients.push(newClient);

  const token = tokenFor(`${estimate.estimateId}:${email}`);
  const expires = new Date(
    now.getTime() + settings.magicLinkExpiryHours * 3_600_000,
  );

  // Link the estimate to the new account + magic-link.
  estimate.accountCreated = true;
  estimate.isGuestEstimate = true;
  estimate.clientId = clientId;
  estimate.estimateToken = token;
  estimate.magicLinkExpiresAt = expires.toISOString();
  estimate.petIds = pets.map((p) => p.id);

  return { accountCreated: true, clientId, estimateToken: token };
}

/**
 * Activate the account behind an estimate (magic-link "Set your password" flow).
 * Mock: stamps `accountActivatedAt`.
 */
export function activateEstimateAccount(
  estimate: Estimate,
  now: Date = new Date(),
): void {
  estimate.accountActivatedAt = now.toISOString();
}

/**
 * Issue a fresh magic link when the previous one expired. Rotates
 * `estimateToken` and pushes `magicLinkExpiresAt` out by
 * `settings.magicLinkExpiryHours`. Does NOT touch the estimate's own expiry —
 * an expired link never expires the estimate. Returns the new token.
 */
export function refreshEstimateMagicLink(
  estimate: Estimate,
  now: Date = new Date(),
): string {
  const email = (estimate.guestEmail || estimate.clientEmail || "").trim();
  const token = tokenFor(`${estimate.estimateId}:${email}:${now.getTime()}`);
  estimate.estimateToken = token;
  estimate.magicLinkExpiresAt = new Date(
    now.getTime() + getEstimateSettings().magicLinkExpiryHours * 3_600_000,
  ).toISOString();
  return token;
}
