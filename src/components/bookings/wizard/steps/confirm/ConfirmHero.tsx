"use client";

import {
  Bed,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  PawPrint,
  Scissors,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PetAvatar } from "@/components/ui/pet-avatar";
import {
  joinNames,
  type PreviewStatus,
} from "@/lib/bookings/wizard/confirm-view";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// The top of Confirm (the client's mock, 2026-10-01): who is coming, what
// for, the status the booking will be created in, and when — in one card.
// ============================================================================

const KIND_GLYPH: Record<string, LucideIcon> = {
  boarding: Bed,
  daycare: Sun,
  grooming: Scissors,
  training: GraduationCap,
  evaluation: ClipboardCheck,
};

export function ConfirmHero({
  pets,
  service,
  kindLabel,
  status,
  line,
}: {
  pets: readonly Pet[];
  service: string;
  kindLabel: string;
  status: PreviewStatus;
  line: string;
}) {
  const Glyph = KIND_GLYPH[service] ?? PawPrint;
  return (
    <div className="border-line bg-card flex flex-wrap items-center gap-4 rounded-2xl border px-[22px] py-5">
      <div className="flex shrink-0 pl-1">
        {pets.map((pet, index) => (
          <PetAvatar
            key={pet.id}
            name={pet.name}
            src={pet.imageUrl}
            size="lg"
            className={index > 0 ? "-ml-2.5" : undefined}
          />
        ))}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5 pl-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-heading text-[24px]/[1.2] font-bold tracking-[-0.02em] max-sm:text-[20px]">
            {joinNames(pets.map((pet) => pet.name))}
          </span>
          <Badge variant="inService">
            <Glyph aria-hidden />
            {kindLabel}
          </Badge>
          <StatusChip status={status} />
        </div>
        {line ? (
          <p className="text-body text-ink-secondary tabular-nums">{line}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The status the booking will be created in, as the done screen repeats it. */
export function StatusChip({ status }: { status: PreviewStatus }) {
  const t = useShellText("booking");
  if (status === "pending_agreements") {
    return (
      <Badge variant="pending">
        <Clock3 aria-hidden />
        {t("wizStatusPendingAgreements")}
      </Badge>
    );
  }
  if (status === "request") {
    return (
      <Badge variant="checkedIn">
        <Clock3 aria-hidden />
        {t("wizStatusRequest")}
      </Badge>
    );
  }
  if (status === "deposit_due") {
    return (
      <Badge variant="checkedIn">
        <CircleCheck aria-hidden />
        {t("wizStatusDepositDue")}
      </Badge>
    );
  }
  return (
    <Badge variant="confirmed">
      <CircleCheck aria-hidden />
      {t("wizStatusConfirmed")}
    </Badge>
  );
}
