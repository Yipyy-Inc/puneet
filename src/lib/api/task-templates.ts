import { liveWrite } from "@/lib/api/live-fetch";
import { toScreenTemplate } from "@/lib/api/mappers/task-template";
import type {
  NewTaskTemplate,
  PersistedTaskTemplate,
  TaskTemplatePatch,
} from "@/types/task-template";
import type { TaskTemplate } from "@/types/task";

// ============================================================================
// Task templates, from Postgres.
//
// No fixture fallback. The 34 templates that used to be hardcoded are now rows
// — seeded for every facility by 20260822400000 — so falling back to the
// hardcoded list would resurrect exactly the bug the table removes: a default
// that cannot be edited or deleted, sitting beside the row that replaced it.
// ============================================================================

async function fetchTemplates(moduleId?: string): Promise<TaskTemplate[]> {
  const qs = moduleId ? `?module=${encodeURIComponent(moduleId)}` : "";
  const response = await fetch(`/api/task-templates${qs}`);

  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(
      detail ?? `Could not load the task list (${response.status})`,
    );
  }

  const rows = (await response.json()) as PersistedTaskTemplate[];
  return rows.map(toScreenTemplate);
}

export const taskTemplateQueries = {
  /** Every module's templates. */
  all: () => ({
    queryKey: ["task-templates", "all"] as const,
    queryFn: () => fetchTemplates(),
  }),

  /** One service module's — what each `/services/<module>/tasks` screen shows. */
  byModule: (moduleId: string) => ({
    queryKey: ["task-templates", "module", moduleId] as const,
    queryFn: () => fetchTemplates(moduleId),
  }),
};

export async function createTaskTemplate(
  input: NewTaskTemplate,
): Promise<TaskTemplate> {
  const row = await liveWrite<PersistedTaskTemplate>(
    "/api/task-templates",
    "POST",
    input,
  );
  return toScreenTemplate(row);
}

/**
 * Edit one.
 *
 * Throws when the database refuses. The fixture's `updateTemplate` could not
 * change a hardcoded default, so it pushed a duplicate into localStorage and
 * said nothing — this is the call that replaces it, and a refusal here has to
 * reach the screen.
 */
export async function updateTaskTemplate(
  id: string,
  patch: TaskTemplatePatch,
): Promise<TaskTemplate> {
  const row = await liveWrite<PersistedTaskTemplate>(
    `/api/task-templates/${id}`,
    "PATCH",
    patch,
  );
  return toScreenTemplate(row);
}

/**
 * Remove one.
 *
 * The fixture's `removeTemplate` filtered localStorage, so deleting one of the
 * 34 defaults removed nothing and reported success. This one reports what
 * actually happened.
 */
export async function deleteTaskTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/task-templates/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(detail ?? "That task could not be removed.");
  }
}
