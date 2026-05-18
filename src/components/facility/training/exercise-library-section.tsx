"use client";

import { Library, Sparkles } from "lucide-react";
import { TrainingDisciplinesManager } from "./training-disciplines-manager";
import { TrainingExercisesManager } from "./training-exercises-manager";

/** Unified "Exercise Library" section on Settings → Training. Wraps the
 *  discipline + exercise managers so they read as one foundational area —
 *  per the spec, "everything builds on this." The anchor id lets the
 *  in-page jump nav and external deep-links land directly here. */
export function ExerciseLibrarySection() {
  return (
    <section
      id="exercise-library"
      aria-labelledby="exercise-library-heading"
      className="space-y-3 scroll-mt-24"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-linear-to-br from-indigo-50/60 via-white to-white px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 text-indigo-700 flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Library className="size-5" />
          </div>
          <div>
            <h3
              id="exercise-library-heading"
              className="text-lg/tight font-bold text-slate-900"
            >
              Exercise Library
            </h3>
            <p className="text-muted-foreground mt-0.5 text-[12.5px]/relaxed">
              The foundation of all training data. Disciplines define the
              categories; exercises feed the Session Completion picker, the
              report cards, and the progress charts. Add custom items, hide
              predefined ones you don&apos;t use, and drag exercises within
              a tier to set the order trainers see them.
            </p>
          </div>
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Sparkles className="text-indigo-400 size-3" />
          Always findable from Settings → Training
        </span>
      </header>

      <div className="space-y-3">
        <TrainingDisciplinesManager />
        <TrainingExercisesManager />
      </div>
    </section>
  );
}
