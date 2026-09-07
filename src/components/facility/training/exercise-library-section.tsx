"use client";

import { Library, Sparkles } from "lucide-react";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { TrainingDisciplinesManager } from "./training-disciplines-manager";
import { TrainingExercisesManager } from "./training-exercises-manager";

/** Unified "Exercise Library" section on Settings → Training. Wraps the
 *  discipline + exercise managers so they read as one foundational area —
 *  per the spec, "everything builds on this." The anchor id lets the
 *  in-page jump nav and external deep-links land directly here. */
export function ExerciseLibrarySection() {
  const t = useSettingsText().section("training");

  return (
    <section
      id="exercise-library"
      aria-labelledby="exercise-library-heading"
      className="scroll-mt-24 space-y-3"
    >
      {/* White, and a SOLID disc with a white glyph — §6 rule 2 tints a
          metric tile and a status chip, and a section header is neither;
          light-on-light is also what disappears against a wash. */}
      <header className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-violet text-violet-foreground flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Library className="size-5" />
          </div>
          <div>
            <h3
              id="exercise-library-heading"
              className="text-lg/tight font-bold"
            >
              {t("libraryTitle")}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-[12.5px]/relaxed">
              {t("libraryIntro")}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Sparkles className="text-muted-foreground size-3" />
          {t("libraryAlways")}
        </span>
      </header>

      <div className="space-y-3">
        <TrainingDisciplinesManager />
        <TrainingExercisesManager />
      </div>
    </section>
  );
}
