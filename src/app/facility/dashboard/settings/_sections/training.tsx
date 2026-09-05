"use client";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";
import { ExerciseLibrarySection } from "@/components/facility/training/exercise-library-section";
import { TrainingModuleSettings } from "@/components/facility/training/training-module-settings";

export function TrainingSection() {
  return (
    <div className="space-y-6">
      {/* In-page jump nav — keeps the foundational Exercise Library
              visible at a glance even when staff are deep into the
              Module Settings form below. */}
      <nav
        aria-label="Training settings sections"
        className="bg-card flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 shadow-sm"
      >
        <span className="text-muted-foreground mr-1 text-[10px] font-bold tracking-wider uppercase">
          Jump to
        </span>
        <a
          href="#exercise-library"
          className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11.5px] font-medium text-indigo-700 hover:bg-indigo-100"
        >
          Exercise Library
        </a>
        <a
          href="#module-settings"
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-slate-100"
        >
          Module Settings
        </a>
        <a
          href="#service-color"
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-slate-100"
        >
          Service Color
        </a>
      </nav>
      <ExerciseLibrarySection />
      <section id="module-settings" className="scroll-mt-24">
        <TrainingModuleSettings />
      </section>
      <section id="service-color" className="scroll-mt-24">
        <ServiceColorCard service="Training" />
      </section>
    </div>
  );
}
