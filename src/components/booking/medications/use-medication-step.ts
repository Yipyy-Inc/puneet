"use client";

import { useMemo, useState } from "react";

import {
  useCareFees,
  useMedicationInstructions,
} from "@/lib/api/facility-settings";
import { itemsForOtherPets } from "@/lib/bookings/care-pets";
import { providedCharge } from "@/lib/medications/charges";
import {
  blankDraft,
  draftFromItem,
  draftProblem,
  isNamed,
  itemFromDraft,
  itemFromProfile,
  type DraftProblem,
  type MedicationDraft,
} from "@/lib/medications/draft";
import {
  activeDays,
  doseCount,
  stayRows,
  type MedStay,
  type StayDayRow,
} from "@/lib/medications/schedule";
import type { CareFees } from "@/lib/settings/care-fees";
import type { MedicationInstructions } from "@/lib/settings/medication-instructions";

import type { LabelPhotos } from "./use-label-photos";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type {
  MedicationItem,
  SavedMedication,
  VetContact,
} from "@/types/booking";

// ============================================================================
// The Medications step's state, held where the booking form holds everything
// else: called ONCE in BookingModal, so the step in the main column and the
// stay-and-doses panel in the left rail read the same thing.
//
// ── A NAMED, COMPLETE MEDICATION IS BOOKED ────────────────────────────────
//
// The client's design shows a medication being written in the panel as soon
// as it has a name — its doses, its pill pockets. So that is what is booked:
// `effectiveMedications` is every saved medication plus every named, complete
// one still open, and Next waits only while a named one is incomplete. Save
// folds the editor into a card; it is not what makes a medication real.
//
// ── A PET'S SAVED MEDICATIONS, WITHOUT AN EFFECT ──────────────────────────
//
// A pet's profile medications are SHOWN as its cards until anything for that
// pet changes, and only then written into the booking's list. Derived, not
// copied in an effect, so there is no render in which they are missing and no
// effect to run twice.
// ============================================================================

export interface MedicationStepPet {
  id: number;
  name: string;
  /** From the pet's profile (`pets.details.medications`). */
  saved?: SavedMedication[];
  /** The pet's vet, from its profile (`pets.details.vet`). */
  vet?: VetContact | null;
}

interface Editor {
  draft: MedicationDraft;
  /** The saved medication being edited, which × puts back. */
  original?: MedicationItem;
}

export interface MedicationStepInput {
  medications: MedicationItem[];
  setMedications: React.Dispatch<React.SetStateAction<MedicationItem[]>>;
  pets: MedicationStepPet[];
  service: string;
  stay: MedStay;
  /** Start each pet from its profile. Off when editing a booking or resuming a draft. */
  fromProfiles: boolean;
  /** Staff may waive what the facility supplies. */
  staff: boolean;
  /**
   * Keep the medications of pets the form did not load — an edit, which
   * opens a booking with its first pet only (lib/bookings/care-pets.ts).
   */
  keepOtherPets?: boolean;
  /**
   * The facility made the step required for this service: every pet has a
   * medication, or is marked as taking none, before the form goes on. Never
   * for an estimate.
   */
  required: boolean;
  /** The pets answered "takes no medication" — the booking's `noMedication`. */
  noMedication: number[];
  setNoMedication: React.Dispatch<React.SetStateAction<number[]>>;
  /** Each pet's vet as the booking holds it, by pet id. */
  vetContacts: Record<string, VetContact>;
  setVetContacts: React.Dispatch<
    React.SetStateAction<Record<string, VetContact>>
  >;
  /** The label photos of the medications being booked (use-label-photos). */
  labelPhotos?: LabelPhotos;
}

export interface MedicationPanelAddon {
  key: string;
  medication: string;
  /** What is supplied — the vocabulary's, or the facility's own. */
  method: string;
  /** The facility's name for its own; empty for the vocabulary's. */
  label: string;
  quantity: number;
  amount: number;
  waived: boolean;
}

export interface MedicationStepState {
  ready: boolean;
  settings: MedicationInstructions;
  fees: CareFees;
  service: string;
  stay: MedStay;
  staff: boolean;
  pets: {
    id: number;
    name: string;
    saved: MedicationItem[];
    count: number;
    /** Answered "takes no medication", and has none. */
    none: boolean;
    /** The vet's contact as it stands — the booking's, else the profile's. */
    vet: VetContact;
  }[];
  activePetId: number | null;
  editor: Editor | null;
  problem: DraftProblem | null;
  /** Another card cannot open while a named, incomplete one is open. */
  editBlocked: boolean;
  effectiveMedications: MedicationItem[];
  canContinue: boolean;
  required: boolean;
  /** The pets with no medication and no "takes none" answer. */
  unanswered: { id: number; name: string }[];
  /** Nothing more is asked of this step. */
  complete: boolean;
  /** Who answered "takes no medication" and still has none — what is booked. */
  effectiveNoMedication: number[];
  /** The vets of pets that take a medication, where the facility asks. */
  effectiveVetContacts: Record<string, VetContact> | undefined;
  labelPhotos?: LabelPhotos;
  /** Saved medications whose chosen dates are all outside this stay. */
  dateless: Set<string>;
  panel: {
    petName: string;
    rows: StayDayRow[];
    totalDoses: number;
    addons: MedicationPanelAddon[];
    addonTotal: number;
  };
  selectPet: (petId: number) => void;
  /** "{pet} takes no medication", on or off. */
  setNone: (petId: number, none: boolean) => void;
  setVet: (petId: number, patch: Partial<VetContact>) => void;
  add: () => void;
  edit: (id: string) => void;
  remove: (id: string) => void;
  discard: () => void;
  update: (
    patch:
      | Partial<MedicationDraft>
      | ((draft: MedicationDraft) => Partial<MedicationDraft>),
  ) => void;
  save: () => void;
  /** Back to nothing touched, for a form that starts again. */
  reset: () => void;
}

export function useMedicationStep(
  input: MedicationStepInput,
): MedicationStepState {
  const { medications, setMedications, pets, service, stay, staff } = input;
  const { instructions: settings, isPending } = useMedicationInstructions();
  const { fees } = useCareFees();
  const t = useShellText("booking");
  const locale = useShellLocale();

  const [chosenPetId, setChosenPetId] = useState<number | null>(null);
  const [editors, setEditors] = useState<Record<number, Editor | null>>({});
  const [touched, setTouched] = useState<number[]>([]);

  const context = useMemo(() => ({ settings, stay }), [settings, stay]);
  const firstPetId = pets[0]?.id ?? null;
  const activePetId =
    chosenPetId !== null && pets.some((pet) => pet.id === chosenPetId)
      ? chosenPetId
      : firstPetId;

  // ── Each pet's saved medications ─────────────────────────────────────────
  // A medication with no pet belongs to the first, as the old form had it.
  const savedByPet = useMemo(() => {
    const byPet = new Map<number, MedicationItem[]>();
    for (const pet of pets) {
      const own = medications.filter(
        (item) => (item.petId ?? firstPetId) === pet.id,
      );
      const fromProfile =
        input.fromProfiles &&
        own.length === 0 &&
        !touched.includes(pet.id) &&
        (pet.saved?.length ?? 0) > 0;
      byPet.set(
        pet.id,
        fromProfile
          ? pet.saved!.map((saved) => itemFromProfile(saved, pet.id, context))
          : own,
      );
    }
    return byPet;
  }, [pets, medications, input.fromProfiles, touched, firstPetId, context]);

  /** The booked form of an editor's draft, or the original it edits. */
  const draftItem = (editor: Editor): MedicationItem | null => {
    if (!isNamed(editor.draft)) return null;
    if (draftProblem(editor.draft, context) !== null) return null;
    return itemFromDraft(editor.draft, { ...context, t, locale });
  };

  const bookedFor = (petId: number): MedicationItem[] => {
    const saved = savedByPet.get(petId) ?? [];
    const editor = editors[petId];
    if (!editor) return saved;
    const booked = draftItem(editor);
    if (editor.original) {
      return saved.map((item) =>
        item.id === editor.original!.id ? (booked ?? item) : item,
      );
    }
    return booked ? [...saved, booked] : saved;
  };
  // In the stored order, so a booking nobody changed books what it held —
  // and, on an edit, with the medications of the pets it did not load.
  const effectiveMedications: MedicationItem[] = (() => {
    const petIds = pets.map((pet) => pet.id);
    const others = new Set(
      input.keepOtherPets ? itemsForOtherPets(medications, petIds) : [],
    );
    const out: MedicationItem[] = [];
    const placed = new Set<number>();
    for (const item of medications) {
      if (others.has(item)) {
        out.push(item);
        continue;
      }
      const owner = item.petId ?? firstPetId;
      if (owner === null || !petIds.includes(owner) || placed.has(owner)) {
        continue;
      }
      placed.add(owner);
      out.push(...bookedFor(owner));
    }
    for (const pet of pets) {
      if (!placed.has(pet.id)) out.push(...bookedFor(pet.id));
    }
    return out;
  })();

  const blocking = pets.some((pet) => {
    const editor = editors[pet.id];
    return (
      editor &&
      isNamed(editor.draft) &&
      draftProblem(editor.draft, context) !== null
    );
  });
  const dateless = new Set(
    effectiveMedications
      .filter(
        (item) =>
          item.dayRule === "certain_dates" &&
          activeDays(item, stay).length === 0,
      )
      .map((item) => item.id),
  );

  // ── Answered, and the vet ────────────────────────────────────────────────
  // A pet is answered by a medication, or by "takes no medication" — which a
  // medication added since overrides. An edit keeps the answers and vets of
  // the pets it did not load (lib/bookings/care-pets.ts).
  const petIds = pets.map((pet) => pet.id);
  const medicated = (petId: number) => bookedFor(petId).length > 0;
  const unanswered = pets
    .filter((pet) => !medicated(pet.id) && !input.noMedication.includes(pet.id))
    .map((pet) => ({ id: pet.id, name: pet.name }));
  const effectiveNoMedication = input.noMedication.filter((petId) =>
    petIds.includes(petId) ? !medicated(petId) : Boolean(input.keepOtherPets),
  );
  const vetOf = (pet: MedicationStepPet): VetContact =>
    input.vetContacts[String(pet.id)] ?? pet.vet ?? {};
  const effectiveVetContacts = (() => {
    const out: Record<string, VetContact> = {};
    if (input.keepOtherPets) {
      for (const [key, value] of Object.entries(input.vetContacts)) {
        if (!petIds.includes(Number(key))) out[key] = value;
      }
    }
    if (settings.rules.vetContact) {
      for (const pet of pets) {
        if (!medicated(pet.id)) continue;
        const vet = cleanVet(vetOf(pet));
        if (vet) out[String(pet.id)] = vet;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  // ── Writing a pet's list ─────────────────────────────────────────────────
  const commit = (petId: number, next: MedicationItem[]) => {
    setMedications((current) => [
      ...current.filter((item) => (item.petId ?? firstPetId) !== petId),
      ...next.map((item) => ({ ...item, petId })),
    ]);
    setTouched((current) =>
      current.includes(petId) ? current : [...current, petId],
    );
  };

  const setEditor = (petId: number, editor: Editor | null) =>
    setEditors((current) => ({ ...current, [petId]: editor }));

  const active = activePetId;
  const activeEditor = active !== null ? (editors[active] ?? null) : null;
  const activeSaved = active !== null ? (savedByPet.get(active) ?? []) : [];
  const problem = activeEditor
    ? draftProblem(activeEditor.draft, context)
    : null;
  const editBlocked = Boolean(
    activeEditor && isNamed(activeEditor.draft) && problem !== null,
  );

  /** Saves the open editor's named, complete draft into the list. */
  const settle = (petId: number, saved: MedicationItem[]): MedicationItem[] => {
    const editor = editors[petId];
    if (!editor) return saved;
    const booked = draftItem(editor);
    if (!booked) return saved;
    return editor.original
      ? saved.map((item) => (item.id === editor.original!.id ? booked : item))
      : [...saved, booked];
  };

  // ── The panel: the active pet's stay and doses ───────────────────────────
  const panelItems = (() => {
    if (active === null) return [];
    const listed = activeSaved.filter(
      (item) => item.id !== activeEditor?.original?.id,
    );
    if (activeEditor && isNamed(activeEditor.draft)) {
      return [
        ...listed,
        itemFromDraft(activeEditor.draft, { ...context, t, locale }),
      ];
    }
    return listed;
  })();
  const addons = panelItems.flatMap((item) => {
    const charge = providedCharge(item, stay, settings);
    return charge
      ? [
          {
            key: item.id,
            medication: item.name,
            method: charge.method,
            label: charge.label,
            quantity: charge.quantity,
            amount: charge.amount,
            waived: charge.waived,
          },
        ]
      : [];
  });

  return {
    ready: !isPending,
    settings,
    fees,
    service,
    stay,
    staff,
    pets: pets.map((pet) => {
      const saved = savedByPet.get(pet.id) ?? [];
      const editor = editors[pet.id];
      const listed = saved.filter((item) => item.id !== editor?.original?.id);
      const count = listed.length + (editor && isNamed(editor.draft) ? 1 : 0);
      return {
        id: pet.id,
        name: pet.name,
        saved: listed,
        count,
        none: count === 0 && input.noMedication.includes(pet.id),
        vet: vetOf(pet),
      };
    }),
    activePetId: active,
    editor: activeEditor,
    problem,
    editBlocked,
    effectiveMedications,
    canContinue: !blocking && dateless.size === 0,
    required: input.required,
    unanswered,
    complete: !input.required || unanswered.length === 0,
    effectiveNoMedication,
    effectiveVetContacts,
    labelPhotos: input.labelPhotos,
    dateless,
    panel: {
      petName: pets.find((pet) => pet.id === active)?.name ?? "",
      rows: stayRows(panelItems, stay),
      totalDoses: panelItems.reduce(
        (sum, item) => sum + doseCount(item, stay),
        0,
      ),
      addons,
      addonTotal: addons
        .filter((addon) => !addon.waived)
        .reduce((sum, addon) => sum + addon.amount, 0),
    },
    selectPet: (petId) => setChosenPetId(petId),
    setNone: (petId, none) =>
      input.setNoMedication((current) =>
        none
          ? current.includes(petId)
            ? current
            : [...current, petId]
          : current.filter((id) => id !== petId),
      ),
    setVet: (petId, patch) => {
      const profile = pets.find((pet) => pet.id === petId)?.vet ?? {};
      input.setVetContacts((current) => ({
        ...current,
        [String(petId)]: { ...(current[String(petId)] ?? profile), ...patch },
      }));
    },
    add: () => {
      if (active === null) return;
      setEditor(active, { draft: blankDraft(active, context) });
    },
    edit: (id) => {
      if (active === null || editBlocked) return;
      const settled = settle(active, activeSaved);
      const item = settled.find((candidate) => candidate.id === id);
      if (!item) return;
      if (settled !== activeSaved) commit(active, settled);
      setEditor(active, {
        draft: draftFromItem(item, context),
        original: item,
      });
    },
    remove: (id) => {
      if (active === null) return;
      commit(
        active,
        activeSaved.filter((item) => item.id !== id),
      );
    },
    discard: () => {
      if (active === null) return;
      setEditor(active, null);
    },
    // From the editor as it stands, not as this render saw it: three taps on
    // − in one frame are three steps, not one.
    update: (patch) => {
      if (active === null) return;
      setEditors((current) => {
        const editor = current[active];
        if (!editor) return current;
        const change =
          typeof patch === "function" ? patch(editor.draft) : patch;
        return {
          ...current,
          [active]: { ...editor, draft: { ...editor.draft, ...change } },
        };
      });
    },
    save: () => {
      if (active === null || !activeEditor) return;
      if (draftProblem(activeEditor.draft, context) !== null) return;
      commit(active, settle(active, activeSaved));
      setEditor(active, null);
    },
    reset: () => {
      setEditors({});
      setTouched([]);
      setChosenPetId(null);
    },
  };
}

/** A vet's contact as typed, trimmed; nothing when both are blank. */
function cleanVet(vet: VetContact): VetContact | undefined {
  const clinic = vet.clinic?.trim();
  const phone = vet.phone?.trim();
  if (!clinic && !phone) return undefined;
  return {
    ...(clinic ? { clinic } : {}),
    ...(phone ? { phone } : {}),
  };
}
