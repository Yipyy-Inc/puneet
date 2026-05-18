/**
 * Prerequisite enforcement helpers for training programs.
 *
 * Used at enrollment time:
 * - The online booking flow blocks the purchase outright when a dog hasn't
 *   completed the required programs.
 * - The staff-side "Add Student" / "New Enrollment" flow surfaces a warning
 *   so a manager can override with intent.
 *
 * Today these are pure functions over the in-memory mock data; once the
 * backend is wired up the call sites stay the same and the data sources
 * become real API queries.
 */
import type { TrainingPackage } from "@/types/training";
import { trainingPackages } from "@/data/training";
import { seriesEnrollments } from "@/data/training-series";

/** What enrollment looks like for a single prerequisite check. */
export interface PrereqResult {
  programId: string;
  programName: string;
  satisfied: boolean;
}

/** Programs a pet has finished — completion is currently inferred from
 *  series enrollments with status === "completed" whose underlying course
 *  type maps onto a package by name. */
function getCompletedProgramIdsForPet(petId: number): Set<string> {
  const completedNames = new Set<string>();
  for (const e of seriesEnrollments) {
    if (e.petId !== petId) continue;
    if (e.status !== "completed") continue;
    // Course type names and program names overlap heavily in practice — match
    // loosely so a completed "Basic Obedience" series satisfies a program
    // named "Basic Obedience Package".
    completedNames.add(normalize(e.courseTypeName));
    completedNames.add(normalize(e.seriesName));
  }
  const completed = new Set<string>();
  for (const pkg of trainingPackages) {
    if (completedNames.has(normalize(pkg.name))) completed.add(pkg.id);
  }
  return completed;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Resolve a list of prerequisite program ids back to their package records. */
export function lookupPrerequisitePrograms(
  ids: string[] | undefined,
): TrainingPackage[] {
  if (!ids || ids.length === 0) return [];
  const byId = new Map(trainingPackages.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is TrainingPackage => !!p);
}

/** Check a single pet against the prerequisites for a target program. */
export function checkPrerequisitesForPet(
  petId: number,
  program: TrainingPackage,
): PrereqResult[] {
  const required = lookupPrerequisitePrograms(program.prerequisitePackageIds);
  if (required.length === 0) return [];
  const completed = getCompletedProgramIdsForPet(petId);
  return required.map((req) => ({
    programId: req.id,
    programName: req.name,
    satisfied: completed.has(req.id),
  }));
}

/** True when the pet has completed every prerequisite for the program. */
export function hasCompletedPrerequisites(
  petId: number,
  program: TrainingPackage,
): boolean {
  const results = checkPrerequisitesForPet(petId, program);
  return results.every((r) => r.satisfied);
}

/** Detect circular dependency before saving a program — returns the chain of
 *  ids that would form the cycle, or null when the prereq graph is acyclic. */
export function detectCircularPrerequisite(
  programId: string,
  candidatePrereqIds: string[],
  allPrograms: TrainingPackage[] = trainingPackages,
): string[] | null {
  const byId = new Map(allPrograms.map((p) => [p.id, p]));
  function dfs(currentId: string, path: string[]): string[] | null {
    if (currentId === programId) return [...path, currentId];
    const current = byId.get(currentId);
    if (!current?.prerequisitePackageIds) return null;
    for (const next of current.prerequisitePackageIds) {
      if (path.includes(next)) continue; // already explored on this branch
      const hit = dfs(next, [...path, currentId]);
      if (hit) return hit;
    }
    return null;
  }
  for (const id of candidatePrereqIds) {
    const cycle = dfs(id, []);
    if (cycle) return cycle;
  }
  return null;
}
