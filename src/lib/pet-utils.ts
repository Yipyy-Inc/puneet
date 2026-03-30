/**
 * Pet age calculation and birthday utilities.
 *
 * Age is always calculated from dateOfBirth — never stored as a raw number.
 * The `age` field on Pet is kept for backward compatibility but dateOfBirth
 * is the source of truth when available.
 */

export interface PetAge {
  years: number;
  months: number;
  weeks: number;
  /** Compact: "3 yrs" or "8 mo" or "6 wks" */
  compact: string;
  /** Full: "3 years, 2 months" or "8 months" or "6 weeks" */
  display: string;
}

/**
 * Calculate pet age from a date of birth string (ISO format).
 * Falls back to the raw `age` number if no DOB is available.
 */
export function calculatePetAge(
  dateOfBirth?: string,
  fallbackAge?: number,
): PetAge {
  if (!dateOfBirth) {
    const y = fallbackAge ?? 0;
    return {
      years: y,
      months: 0,
      weeks: 0,
      compact: `${y} yr${y !== 1 ? "s" : ""}`,
      display: `${y} year${y !== 1 ? "s" : ""}`,
    };
  }

  const dob = new Date(dateOfBirth + "T00:00:00");
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.floor(
    (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeks = Math.floor(totalDays / 7);

  let compact: string;
  let display: string;

  if (years >= 1) {
    compact = `${years} yr${years !== 1 ? "s" : ""}`;
    display =
      months > 0
        ? `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`
        : `${years} year${years !== 1 ? "s" : ""}`;
  } else if (months >= 1) {
    compact = `${months} mo`;
    display = `${months} month${months !== 1 ? "s" : ""}`;
  } else {
    compact = `${Math.max(1, weeks)} wk${weeks !== 1 ? "s" : ""}`;
    display = `${Math.max(1, weeks)} week${weeks !== 1 ? "s" : ""}`;
  }

  return { years, months, weeks, compact, display };
}

/**
 * Get a display-friendly age string from a pet object.
 * Prefers dateOfBirth, falls back to age number.
 */
export function getPetAgeDisplay(
  pet: { dateOfBirth?: string; age: number },
  mode: "compact" | "full" = "compact",
): string {
  const age = calculatePetAge(pet.dateOfBirth, pet.age);
  return mode === "compact" ? age.compact : age.display;
}

/**
 * Check if a pet's birthday falls in the current month.
 */
export function isPetBirthdayThisMonth(dateOfBirth?: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth + "T00:00:00");
  const now = new Date();
  return dob.getMonth() === now.getMonth();
}

/**
 * Check if a pet's birthday falls within the next 7 days.
 */
export function isPetBirthdayThisWeek(dateOfBirth?: string): boolean {
  if (!dateOfBirth) return false;
  const days = daysUntilBirthday(dateOfBirth);
  return days >= 0 && days <= 7;
}

/**
 * Calculate days until a pet's next birthday.
 * Returns 0 if today is the birthday.
 */
export function daysUntilBirthday(dateOfBirth?: string): number {
  if (!dateOfBirth) return 999;
  const dob = new Date(dateOfBirth + "T00:00:00");
  const now = new Date();

  const nextBirthday = new Date(
    now.getFullYear(),
    dob.getMonth(),
    dob.getDate(),
  );
  if (nextBirthday < now) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }

  return Math.ceil(
    (nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Estimate a DOB from a given age in years.
 * Sets the date to Jan 1 of the calculated birth year.
 */
export function estimateDobFromAge(ageYears: number): string {
  const year = new Date().getFullYear() - ageYears;
  return `${year}-01-01`;
}
