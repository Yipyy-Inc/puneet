// Per-pet grooming preferences (preferred groomer, etc.) — used by the
// booking dialog's Step 2 to suggest the right stylist before staff has
// to think about it. Kept in its own file because the Pet schema lives in
// the global pet types and we don't want grooming-specific fields leaking
// in there.

export type GroomingPetPreference = {
  petId: number;
  /** Stylist id the owner prefers (or the pet handles best with). */
  preferredStylistId?: string;
};

export const groomingPetPreferences: GroomingPetPreference[] = [
  // Buddy (Golden Retriever, large) — bonded with Jessica through multiple
  // grooms; owner specifically requests her.
  { petId: 1, preferredStylistId: "stylist-001" },
  // Daisy (Poodle, medium) — Marcus does the show-style clips she needs.
  { petId: 50, preferredStylistId: "stylist-002" },
];
