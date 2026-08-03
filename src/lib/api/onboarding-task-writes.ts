import "server-only";

import { NextResponse } from "next/server";

import type { createServerClient } from "@/lib/supabase/server";
import {
  employeeTasksToRows,
  managerTasksToRows,
} from "@/lib/api/mappers/staff-onboarding";
import { writeFailure } from "@/lib/api/write-failure";
import type { OnboardingTemplate } from "@/data/staff-onboarding";

// ============================================================================
// Writing a template's task set.
//
// Lives here rather than being exported from the POST route it is shared with:
// a Next.js `route.ts` may only export HTTP method handlers plus a small set of
// config values, and an extra named export fails the route-type check at build
// time. Somewhere in `lib` is where a helper two routes need belongs anyway.
// ============================================================================

export async function insertTemplateTasks(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  context: { templateId: string; facilityId: string },
  input: Partial<OnboardingTemplate>,
): Promise<NextResponse | null> {
  if (input.managerTasks?.length) {
    const { error } = await supabase
      .from("onboarding_manager_tasks")
      .insert(managerTasksToRows(input.managerTasks, context) as never);
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to edit this template's tasks.",
        duplicate: "Two tasks cannot share a position.",
      });
    }
  }
  if (input.employeeTasks?.length) {
    const { error } = await supabase
      .from("onboarding_employee_tasks")
      .insert(employeeTasksToRows(input.employeeTasks, context) as never);
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to edit this template's tasks.",
        duplicate: "Two tasks cannot share a position.",
      });
    }
  }
  return null;
}
