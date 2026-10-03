"use client";

import { Chip } from "@/components/ui/chip";
import { PetAvatar } from "@/components/ui/pet-avatar";
import {
  joinNames,
  type PreviewStatus,
} from "@/lib/bookings/wizard/confirm-view";
import { useShellText } from "@/lib/shell/use-shell-text";
import { cn } from "@/lib/utils";
import type { Pet } from "@/types/pet";

// ============================================================================
// The top of Confirm (the client's mock, 2026-10-01): who is coming, what
// for, the status the booking will be created in, and when — in one card.
// ============================================================================

export function ConfirmHero({
  pets,
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
  return (
    <div className="border-line bg-card flex flex-wrap items-center gap-4 rounded-[22px] border px-[22px] py-5">
      <div className="flex shrink-0">
        {pets.map((pet) => (
          // The mock's hero circles: 56px, a 2px accent ring, white between.
          <span
            key={pet.id}
            className="border-primary -mr-2.5 rounded-full border-2 shadow-[0_0_0_3px_var(--card)]"
          >
            <PetAvatar
              name={pet.name}
              src={pet.imageUrl}
              size="mk-52"
              surface="accent"
            />
          </span>
        ))}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-[5px] pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-heading text-[24px] font-bold tracking-[-0.02em] max-sm:text-[20px]">
            {joinNames(pets.map((pet) => pet.name))}
          </span>
          <Chip tone="violet" size="md" className="py-[3px]">
            {kindLabel}
          </Chip>
          <StatusChip status={status} />
        </div>
        {line ? (
          <p className="text-ink-secondary text-[14px] tabular-nums">{line}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The status the booking will be created in, as the done screen repeats it. */
export function StatusChip({
  status,
  className,
}: {
  status: PreviewStatus;
  className?: string;
}) {
  const t = useShellText("booking");
  const tone =
    status === "pending_agreements"
      ? "warning"
      : status === "request" || status === "deposit_due"
        ? "info"
        : "success";
  return (
    <Chip tone={tone} size="md" className={cn("py-[3px]", className)}>
      {status === "pending_agreements"
        ? t("wizStatusPendingAgreements")
        : status === "request"
          ? t("wizStatusRequest")
          : status === "deposit_due"
            ? t("wizStatusDepositDue")
            : t("wizStatusConfirmed")}
    </Chip>
  );
}
