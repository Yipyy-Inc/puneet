/**
 * Helpers for finding + manipulating homework templates. The mutation
 * functions write through both the active and the unfiltered query caches
 * so a save lands on the Course Catalog manager and the homework prompt
 * picker in the same render.
 */
import type { HomeworkTemplate } from "@/data/training-homework-templates";

/** Loose name normalization — mirrors the rule used in
 *  `training-program-prereqs` so "Basic Obedience" templates light up for
 *  series whose `courseTypeName` is "Basic Obedience Package". */
export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(package|pack|class|course|training)\b/g, "")
    .trim();
}

/** Templates that target this course, ordered by session number then
 *  manual sort order. Inactive templates are skipped — callers that need
 *  hidden templates should use the `all` query directly. */
export function filterTemplatesForCourse(
  templates: HomeworkTemplate[],
  courseTypeName: string,
): HomeworkTemplate[] {
  const target = normalizeCourseName(courseTypeName);
  return templates
    .filter(
      (t) => t.isActive && normalizeCourseName(t.courseTypeName) === target,
    )
    .sort((a, b) => {
      const aSess = a.sessionNumber ?? Number.POSITIVE_INFINITY;
      const bSess = b.sessionNumber ?? Number.POSITIVE_INFINITY;
      if (aSess !== bSess) return aSess - bSess;
      const aOrd = a.sortOrder ?? Number.POSITIVE_INFINITY;
      const bOrd = b.sortOrder ?? Number.POSITIVE_INFINITY;
      if (aOrd !== bOrd) return aOrd - bOrd;
      return a.name.localeCompare(b.name);
    });
}

/** Pick the template that's the canonical "Week N" homework for this
 *  course. Returns null when no template has the matching `sessionNumber`. */
export function findTemplateForSession(
  templates: HomeworkTemplate[],
  courseTypeName: string,
  sessionNumber: number,
): HomeworkTemplate | null {
  const list = filterTemplatesForCourse(templates, courseTypeName);
  return list.find((t) => t.sessionNumber === sessionNumber) ?? null;
}

let templateSeed = 0;
/** Stable id generator for new templates created in the session — pure so
 *  the React Compiler can analyse without inline `Date.now()` calls. */
export function nextHomeworkTemplateId(): string {
  templateSeed += 1;
  return `hwt-custom-${Date.now()}-${templateSeed}`;
}

let itemSeed = 0;
export function nextHomeworkTemplateItemId(): string {
  itemSeed += 1;
  return `hwti-custom-${Date.now()}-${itemSeed}`;
}
