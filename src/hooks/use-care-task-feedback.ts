"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useFacilitySettings,
  useSaveFacilitySetting,
  type FacilitySettings,
} from "@/lib/api/facility-settings";
import {
  SHIPPED_CARE_TASK_FEEDBACK,
  type CareTaskFeedback,
} from "@/lib/settings/care-task-feedback";

/**
 * The choices staff pick from when they log a meal or a dose
 * (`care_task_feedback`).
 *
 * Read it wherever the choice is OFFERED. `getOutcomeOption` still serves the
 * static table for the eleven places that only look a label up to display a
 * past entry — converting those is its own change, and a facility's edit would
 * not make a past entry's stored value mean something different anyway.
 *
 * `save` resolves `true` once the database has it, so a screen's "Saved" is
 * about the row and not about a keystroke; a refusal puts the previous options
 * back rather than leaving the screen showing an edit nobody kept.
 */
export function useCareTaskFeedback() {
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const queryClient = useQueryClient();

  const feedback = settings.care_task_feedback.value;

  const save = useCallback(
    async (next: CareTaskFeedback): Promise<boolean> => {
      queryClient.setQueryData(
        ["facility", "settings"],
        (current: FacilitySettings | undefined) =>
          current
            ? {
                ...current,
                care_task_feedback: { value: next, configured: true },
              }
            : current,
      );
      try {
        await saveSetting.mutateAsync({
          domain: "care_task_feedback",
          value: next,
        });
        return true;
      } catch {
        void queryClient.invalidateQueries({
          queryKey: ["facility", "settings"],
        });
        return false;
      }
    },
    [queryClient, saveSetting],
  );

  const reset = useCallback(
    () => save(structuredClone(SHIPPED_CARE_TASK_FEEDBACK)),
    [save],
  );

  return { feedback, save, reset, isPending };
}
