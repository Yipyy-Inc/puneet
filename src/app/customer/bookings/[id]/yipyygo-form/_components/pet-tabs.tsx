"use client";

import { CircleCheck } from "lucide-react";

import type { CustomerYipyyGoPet } from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";

const SENT = new Set(["submitted", "approved", "completed_by_staff"]);

// One tab per pet on the booking, each with its own form — the old page read
// the first pet only, and saved every pet's answers over the same record. A
// tab strip is §6 rule 1's one sanctioned edge line: an open rail, with 2px of
// primary under the current pet's name.
export function PetTabs({
  pets,
  currentRef,
  onSelect,
  disabled = false,
}: {
  pets: CustomerYipyyGoPet[];
  currentRef: number;
  onSelect: (ref: number) => void;
  disabled?: boolean;
}) {
  const { t } = useCustomerText("yipyygo");
  if (pets.length < 2) return null;

  return (
    <nav
      aria-label={t("petTabsLabel")}
      className="border-line overflow-x-auto border-b"
    >
      <ul className="flex min-w-max">
        {pets.map((pet) => {
          const current = pet.ref === currentRef;
          const sent = SENT.has(pet.submission?.status ?? "");
          return (
            <li key={pet.ref}>
              <button
                type="button"
                aria-current={current ? "page" : undefined}
                disabled={disabled}
                onClick={() => {
                  if (!current) onSelect(pet.ref);
                }}
                className="text-ink-secondary hover:text-body-ink aria-[current=page]:border-primary aria-[current=page]:text-primary disabled:text-ink-disabled -mb-px flex min-h-10 items-center gap-2 border-b-2 border-transparent px-4 text-[14.5px] font-semibold disabled:cursor-not-allowed max-lg:min-h-12"
              >
                {pet.name}
                {sent && (
                  <>
                    <CircleCheck aria-hidden className="text-success size-4" />
                    <span className="sr-only">{t("petFormSent")}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
