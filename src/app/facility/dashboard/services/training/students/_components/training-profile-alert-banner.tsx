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
          <ul className="mt-1.5 space-y-1">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="text-rose-900 flex items-start gap-1.5 text-[13px]/relaxed"
              >
                <span
                  aria-hidden
                  className="bg-rose-700 mt-1.5 size-1.5 shrink-0 rounded-full"
                />
                <span>{alert.note}</span>
              </li>
            ))}
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
