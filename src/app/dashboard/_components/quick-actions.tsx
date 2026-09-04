"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Megaphone, PlusCircle, Search, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ToneMark, type MarkTone } from "@/components/ui/tone-mark";
import { cn } from "@/lib/utils";
import { FindFacilityDialog } from "./find-facility-dialog";

// Lazy-loaded — the wizard chunk only loads when "+ Add Facility" is clicked.
const FacilityOnboardingWizard = dynamic(
  () =>
    import("@/components/admin/facility-onboarding-wizard").then(
      (m) => m.FacilityOnboardingWizard,
    ),
  { ssr: false },
);

interface QuickAction {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * Was `gradient`, and every one of them rendered as a flat dark disc —
   * stage 1 remapped the palette steps they were built from onto the status
   * inks, which are text weights. See tone-mark.tsx.
   */
  tone: MarkTone;
  onClick: () => void;
}

export function QuickActions() {
  const router = useRouter();
  const [findOpen, setFindOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      key: "add",
      label: "Add Facility",
      description: "Onboarding wizard",
      icon: PlusCircle,
      tone: "info",
      onClick: () => setWizardOpen(true),
    },
    {
      key: "find",
      label: "Find Facility",
      description: "Global search",
      icon: Search,
      // Finding a facility is not a status, so it takes the neutral mark
      // rather than borrowing a status ink to look decorative.
      tone: "neutral",
      onClick: () => setFindOpen(true),
    },
    {
      key: "announce",
      label: "Create Announcement",
      description: "Broadcast composer",
      icon: Megaphone,
      tone: "violet",
      onClick: () => router.push("/dashboard/communication/announcements"),
    },
    {
      key: "import",
      label: "Run Data Import",
      description: "Import wizard",
      icon: Upload,
      tone: "success",
      onClick: () => router.push("/dashboard/system-admin/data-management"),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => {
          return (
            <Card
              key={a.key}
              role="button"
              tabIndex={0}
              onClick={a.onClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  a.onClick();
                }
              }}
              className={cn(
                "group bg-card flex cursor-pointer items-center gap-3 border p-4 transition-all",
                "hover:-translate-y-0.5 hover:shadow-lg",
              )}
            >
              <ToneMark
                icon={a.icon}
                tone={a.tone}
                className="transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">
                  {a.label}
                </p>
                <p className="text-muted-foreground text-xs">{a.description}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <FindFacilityDialog open={findOpen} onOpenChange={setFindOpen} />
      {wizardOpen && (
        <FacilityOnboardingWizard onClose={() => setWizardOpen(false)} />
      )}
    </>
  );
}
