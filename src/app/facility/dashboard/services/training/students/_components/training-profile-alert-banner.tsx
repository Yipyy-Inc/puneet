"use client";

/**
 * AlertBanner — full-width red box that sits above the back link, name
 * header, and tab row on the student profile whenever the pet has at least
 * one trainer note flagged "Mark as Active Alert" and not yet deactivated.
 *
 * Designed so a trainer who opens the profile sees the alerts before they
 * scan tabs.
 */
import { AlertOctagon } from "lucide-react";
import type { TrainerNote } from "@/types/training";
import { getActiveAlertsForPet } from "@/lib/training-active-alerts";

interface Props {
  petId: number;
  petName: string;
  notes: TrainerNote[];
}

/** Per-category chip so a trainer can tell a behavioral flag from a care note
 *  at a glance, using the same tone language as the pre-session briefing's
 *  alert kinds (amber = behavior, rose = concern, slate = everything else). */
const CATEGORY_META: Record<TrainerNote["category"], { label: string; cls: string }> = {
  behavior: { label: "Behavior", cls: "border-amber-300 bg-amber-50 text-amber-800" },
  concern: { label: "Concern", cls: "border-rose-300 bg-rose-100 text-rose-900" },
  progress: { label: "Progress", cls: "border-slate-300 bg-slate-50 text-slate-700" },
  achievement: { label: "Achievement", cls: "border-slate-300 bg-slate-50 text-slate-700" },
  general: { label: "Note", cls: "border-slate-300 bg-slate-50 text-slate-700" },
};

export function TrainingProfileAlertBanner({ petId, petName, notes }: Props) {
  const alerts = getActiveAlertsForPet(petId, notes);
  if (alerts.length === 0) return null;

  return (
    <section
      role="alert"
      aria-live="polite"
      className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
          <AlertOctagon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-rose-900 text-[11px] font-bold uppercase tracking-wider">
            Active alerts for {petName}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {alerts.map((alert) => {
              const meta = CATEGORY_META[alert.category] ?? CATEGORY_META.general;
              return (
                <li
                  key={alert.id}
                  className="text-rose-900 flex items-start gap-1.5 text-[13px]/relaxed"
                >
                  <span
                    aria-hidden
                    className="bg-rose-700 mt-1.5 size-1.5 shrink-0 rounded-full"
                  />
                  <span className="min-w-0">
                    <span
                      className={`mr-1.5 inline-flex items-center rounded-sm border px-1.5 align-[1px] text-[9.5px] font-bold uppercase tracking-wide ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                    {alert.note}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-rose-700/80 mt-1.5 text-[10.5px]">
            Alerts stay active until a trainer or manager deactivates them
            from the Notes tab with a reason.
          </p>
        </div>
      </div>
    </section>
  );
}
