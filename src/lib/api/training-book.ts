import type { Trainer, TrainerNote, TrainingPackage } from "@/types/training";
import type { VaccinationRecord } from "@/types/pet";
import type { TrainingBook } from "@/lib/api/mappers/training-book";
import type { TrainingTrainer } from "@/lib/api/training-trainers";

// ============================================================================
// THE BOOK AND THE TEAM ARE THE FACILITY'S
// ============================================================================
//
// trainers, classes, sessions and enrollments were `@/data/training`: four
// invented trainers teaching classes nobody created, so a real facility's
// calendar, session view and students list showed somebody else's school,
// and a series created on the Series tab never reached them. They read the
// facility's `training_series` book (/api/training/book, mapped onto the
// shapes these screens draw) and its trainers (/api/training/trainers).
//
// One request serves all four book queries: they are fetched together, so a
// two-second window shares the in-flight response instead of asking four
// times. The keys are unchanged, so the screens that patch the cache locally
// still find their arrays.

const EMPTY_BOOK: TrainingBook = {
  classes: [],
  sessions: [],
  enrollments: [],
  series: [],
  seriesEnrollments: [],
  extraCourseTypes: [],
};
let bookLoad: { at: number; promise: Promise<TrainingBook> } | null = null;

export function fetchTrainingBook(): Promise<TrainingBook> {
  if (bookLoad && Date.now() - bookLoad.at < 2000) return bookLoad.promise;
  const promise = fetch("/api/training/book").then(async (response) => {
    if (response.status === 401) return EMPTY_BOOK;
    if (!response.ok) {
      throw new Error(`Failed to load the training book (${response.status})`);
    }
    return (await response.json()) as TrainingBook;
  });
  bookLoad = { at: Date.now(), promise };
  promise.catch(() => {
    bookLoad = null;
  });
  return promise;
}

export async function fetchTrainers(): Promise<Trainer[]> {
  const response = await fetch("/api/training/trainers");
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Failed to load trainers (${response.status})`);
  }
  const rows = (await response.json()) as TrainingTrainer[];
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    ...(t.photoUrl ? { photoUrl: t.photoUrl } : {}),
    specializations: t.specializations,
    certifications: t.certifications,
    yearsExperience: t.yearsExperience ?? 0,
    status: t.status === "active" ? "active" : "inactive",
    bio: t.bio,
    rating: 0,
    totalClasses: 0,
    hireDate: "",
    ...(t.calendarColor ? { calendarColor: t.calendarColor } : {}),
  }));
}

// Kept out of training.ts on purpose: that file still serves fixtures for
// notes, homework, report cards and the rest, and `check:success-claims`
// follows one import. A fetch in training.ts would make every screen that
// toasts over a cache-only write look as if it had a writer.

/**
 * The facility's vaccination records, for the training rosters' expiry
 * warnings. These read `@/data/pet-data` — another facility's certificates,
 * matched to real dogs by ref. A record with no expiry never lapses, and a
 * rejected one is not a certificate, so neither is offered to the warnings.
 */
export async function fetchFacilityVaccinations(): Promise<
  VaccinationRecord[]
> {
  const response = await fetch("/api/vaccinations");
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Failed to load vaccinations (${response.status})`);
  }
  const rows = (await response.json()) as VaccinationRecord[];
  return rows.filter((v) => v.expiryDate && v.status !== "rejected");
}

/**
 * The facility's training programs (the `training_programs` settings domain)
 * — the Rates tab's priced offers. These were `trainingPackages` from
 * `@/data/training`; the Rates tab now writes the domain.
 */
export async function fetchTrainingPrograms(): Promise<TrainingPackage[]> {
  const response = await fetch("/api/facility/settings");
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Failed to load training programs (${response.status})`);
  }
  const settings = (await response.json()) as {
    training_programs?: { value?: { programs?: TrainingPackage[] } };
  };
  return settings.training_programs?.value?.programs ?? [];
}

/**
 * The trainers' notes, from `training_notes` — they were the `trainerNotes`
 * fixture, written with setQueryData. Writes: useTrainingNoteMutations.
 */
export async function fetchTrainerNotes(): Promise<TrainerNote[]> {
  const response = await fetch("/api/training/notes");
  // Signed out, or a portal with no staff session, has no trainer notes to
  // read: an empty list, not an error on every training screen.
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Could not load the training notes (${response.status})`);
  }
  return (await response.json()) as TrainerNote[];
}
