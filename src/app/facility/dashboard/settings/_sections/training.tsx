"use client";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { ExerciseLibrarySection } from "@/components/facility/training/exercise-library-section";
import { TrainingModuleSettings } from "@/components/facility/training/training-module-settings";

export function TrainingSection() {
  const t = useSettingsText().section("training");

  return (
    <div className="space-y-6">
      {/* In-page jump nav — keeps the foundational Exercise Library
              visible at a glance even when staff are deep into the
              Module Settings form below. */}
      <nav
        aria-label={t("jumpNavLabel")}
        className="bg-card flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 shadow-sm"
      >
        <span className="text-muted-foreground mr-1 text-[12px] font-bold tracking-wider uppercase">
          {t("jumpTo")}
        </span>
        {/* Three identical pills, one of which was indigo for no reason a
            reader could act on — they all do the same thing. A jump link is
            not a status, so it gets no colour (§6 rule 2). */}
        {(
          [
            ["#exercise-library", "jumpLibrary"],
            ["#module-settings", "jumpModule"],
            ["#service-color", "jumpColour"],
          ] as const
        ).map(([href, key]) => (
          <a
            key={href}
            href={href}
            className="hover:bg-muted inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13.5px] font-medium max-lg:min-h-12"
          >
            {t(key)}
          </a>
        ))}
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
