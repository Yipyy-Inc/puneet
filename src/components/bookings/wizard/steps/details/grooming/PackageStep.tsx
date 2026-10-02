"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { Switch } from "@/components/ui/switch";
import { isPackageEligibleForPet } from "@/lib/api/grooming";
import {
  useGroomingMenu,
  useGroomingSizeTiers,
} from "@/lib/api/grooming-catalogue";
import {
  groomPrice,
  mattingFor,
  tierPrices,
} from "@/lib/bookings/wizard/groom-pricing";
import { groomingSizeFor } from "@/lib/grooming/size-tier";
import {
  formatDuration,
  formatMoney,
  formatWeightFromLb,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { CoatType } from "@/types/grooming";
import type { Pet } from "@/types/pet";

// ============================================================================
// Grooming's "Package" screen (the client's mock, 2026-10-01): "Choose the
// groom" — the facility's packages as cards, priced and timed for the pet in
// front of you, a pet at a time:
//
//   [Bubu · Full Groom] [Mango · Not chosen]
//   Bubu · Small · 4.5 kg (10 lb) · Curly coat · Bichon Frise
//   Full Groom                                       ◷ 1h 30m
//   $85   Small base $75 · +$10 curly coat
//   S $75 · M $90 · L $110 · XL $135
//
// The size is the facility's own bands, the price and minutes `groomPrice` —
// the function the estimate adds up. Staff mark matting here (its surcharge
// and minutes); a customer is told the groomer confirms the price at check-in.
// ============================================================================

const NO_PACKAGES: never[] = [];

export function PackageStep({
  isCustomer,
  onlyApplicable = false,
  pets,
  value,
  onChange,
  matted,
  onMattedChange,
}: {
  isCustomer: boolean;
  /**
   * The facility shows only the services that apply to the pet (Booking
   * flow settings): a groom the pet in front of you cannot have is left off,
   * as the old package screen did, rather than shown with its reason.
   */
  onlyApplicable?: boolean;
  pets: readonly Pet[];
  /** Each pet's package, by pet id. */
  value: Record<number, string>;
  onChange: (next: Record<number, string>) => void;
  /** Pets staff marked matted. */
  matted: Record<number, boolean>;
  onMattedChange: (next: Record<number, boolean>) => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  // The same call as the modal's quote, so a card and the estimate are
  // the one price.
  const { data: menu = NO_PACKAGES, isPending } = useGroomingMenu({
    asCustomer: isCustomer,
  });
  const { data: tiers = NO_PACKAGES } = useGroomingSizeTiers({
    asCustomer: isCustomer,
  });
  const packages = menu.filter((p) => p.isActive !== false);

  const [activeId, setActiveId] = useState<number | null>(null);
  const active =
    pets.find((p) => p.id === activeId) ??
    pets.find((p) => !value[p.id]) ??
    pets[0] ??
    null;
  const multiPet = pets.length > 1;

  const sizeOf = (pet: Pet) => groomingSizeFor(pet.weight, tiers);
  const SIZE_WORDS: Record<string, string> = {
    small: t("wizSize_small"),
    medium: t("wizSize_medium"),
    large: t("wizSize_large"),
    giant: t("wizSize_giant"),
  };
  const SIZE_SHORT: Record<string, string> = {
    small: t("wizSizeShort_small"),
    medium: t("wizSizeShort_medium"),
    large: t("wizSizeShort_large"),
    giant: t("wizSizeShort_giant"),
  };
  const COAT_WORDS: Record<string, string> = {
    short: t("wizCoat_short"),
    medium: t("wizCoat_medium"),
    long: t("wizCoat_long"),
    wire: t("wizCoat_wire"),
    curly: t("wizCoat_curly"),
    double: t("wizCoat_double"),
    hairless: t("wizCoat_hairless"),
    matted: t("wizCoat_matted"),
  };
  // The facility's own band name where it gave one (their words).
  const sizeWord = (size: string) =>
    tiers.find((tier) => tier.id === size)?.label || SIZE_WORDS[size] || size;
  const coatWord = (coat: string) => COAT_WORDS[coat] ?? coat;
  const money = (amount: number) =>
    formatMoney(amount, locale, { whole: Number.isInteger(amount) });
  const delta = (amount: number) =>
    `${amount > 0 ? "+" : "-"}${money(Math.abs(amount))}`;
  const capitalise = (text: string) =>
    text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

  const pick = (packageId: string) => {
    if (!active) return;
    const next = { ...value, [active.id]: packageId };
    onChange(next);
    const waiting = pets.find((p) => !next[p.id]);
    setActiveId(waiting?.id ?? active.id);
  };

  const activeSize = active ? sizeOf(active) : null;
  const facts = active
    ? [
        active.name,
        activeSize
          ? `${sizeWord(activeSize)}${active.weight ? ` · ${formatWeightFromLb(active.weight, locale)}` : ""}`
          : t("wizNoSizeOnFile"),
        active.coatType
          ? capitalise(
              fill(t("wizCoatFact"), {
                coat: coatWord(active.coatType).toLocaleLowerCase(locale),
              }),
            )
          : null,
        active.breed || null,
      ].filter((fact): fact is string => !!fact)
    : [];

  const activePackage = active
    ? packages.find((p) => p.id === value[active.id])
    : undefined;
  const eligibleFor = (pkg: (typeof packages)[number], pet: Pet) =>
    isPackageEligibleForPet(pkg, {
      petSize: sizeOf(pet) ?? undefined,
      coatType: pet.coatType as CoatType | undefined,
      breed: pet.breed,
    });
  // A groom already chosen stays on screen, so the choice can be seen.
  const cards =
    onlyApplicable && active
      ? packages.filter(
          (pkg) => pkg.id === value[active.id] || eligibleFor(pkg, active),
        )
      : packages;
  const activeMatting = activePackage ? mattingFor(activePackage) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-section text-body-ink">{t("wizChooseGroom")}</h3>
        <p className="text-meta text-ink-tertiary">
          {multiPet
            ? t("wizChooseGroomEach")
            : fill(t("wizChooseGroomOne"), { pet: active?.name ?? "" })}
        </p>
      </div>

      {multiPet ? (
        <div
          role="radiogroup"
          aria-label={t("wizPetsLabel")}
          className="flex flex-wrap gap-2"
        >
          {pets.map((pet) => {
            const chosen = packages.find((p) => p.id === value[pet.id]);
            return (
              <ChoicePill
                key={pet.id}
                type="radio"
                name="wizard-groom-pet"
                value={String(pet.id)}
                checked={active?.id === pet.id}
                onChange={() => setActiveId(pet.id)}
                className="pl-1.5"
              >
                <PetAvatar name={pet.name} src={pet.imageUrl} size="sm" />
                <span>{pet.name}</span>
                <span className="text-meta text-ink-tertiary font-normal">
                  · {chosen ? chosen.name : t("wizGroomNotChosen")}
                </span>
              </ChoicePill>
            );
          })}
        </div>
      ) : null}

      {active ? (
        <div className="bg-surface-inset flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl px-[18px] py-3.5">
          <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
            {facts.map((fact) => (
              <li
                key={fact}
                className="bg-card text-meta text-body-ink rounded-full px-[11px] py-[5px] font-semibold"
              >
                {fact}
              </li>
            ))}
          </ul>
          <span className="text-meta text-ink-secondary font-medium">
            {t("wizTierFromProfile")}
          </span>
        </div>
      ) : null}

      {packages.length === 0 && isPending ? (
        <div
          aria-hidden
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3.5"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel flex h-[180px] flex-col gap-3 rounded-2xl border px-5 py-[18px]"
            >
              <span className="bg-surface-inset h-4 w-2/5 rounded-full" />
              <span className="bg-surface-inset h-3 w-3/5 rounded-full" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="border-line-strong text-meta text-ink-secondary rounded-2xl border border-dashed px-6 py-8 text-center">
          {packages.length > 0 && active
            ? fill(t("wizNoGroomFor"), { pet: active.name })
            : t("wizNoGrooms")}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3.5">
          {cards.map((pkg) => {
            const on = active ? value[active.id] === pkg.id : false;
            const eligible = active ? eligibleFor(pkg, active) : true;
            const groom = active
              ? groomPrice({
                  pet: active,
                  pkg,
                  tiers,
                  matted: matted[active.id] === true,
                })
              : null;
            const parts: string[] = [];
            if (groom?.coat?.delta && active?.coatType) {
              parts.push(
                fill(t("wizCoatNote"), {
                  delta: delta(groom.coat.delta),
                  coat: coatWord(active.coatType).toLocaleLowerCase(locale),
                }),
              );
            }
            if (groom?.matting?.amount) {
              parts.push(
                fill(t("wizMattingNote"), {
                  delta: delta(groom.matting.amount),
                }),
              );
            }
            const sizeName = groom?.size
              ? sizeWord(groom.size).toLocaleLowerCase(locale)
              : null;
            const note =
              groom && groom.source === "service-default" && sizeName
                ? parts.length > 0
                  ? capitalise(
                      [
                        fill(t("wizSizeBase"), {
                          size: sizeName,
                          price: money(groom.sizePrice),
                        }),
                        ...parts,
                      ].join(" · "),
                    )
                  : capitalise(fill(t("wizSizeBasePrice"), { size: sizeName }))
                : parts.join(" · ") || null;
            return (
              <button
                key={pkg.id}
                type="button"
                aria-pressed={on}
                aria-disabled={!eligible || undefined}
                data-on={on}
                data-disabled={!eligible || undefined}
                onClick={() => eligible && pick(pkg.id)}
                className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary data-[disabled=true]:bg-surface-inset data-[disabled=true]:hover:border-line-strong relative flex min-w-0 flex-col gap-3 rounded-2xl border px-5 py-[18px] text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[disabled=true]:cursor-not-allowed data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
              >
                <span className="flex min-w-0 flex-col gap-[3px] pr-8">
                  <span className="text-section text-body-ink">{pkg.name}</span>
                  {pkg.description ? (
                    <span className="text-meta text-ink-tertiary line-clamp-2 text-pretty">
                      {pkg.description}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-heading text-[24px]/[1.15] font-bold tracking-[-0.02em] tabular-nums">
                      {groom ? money(groom.price) : money(pkg.basePrice)}
                    </span>
                    {note ? (
                      <span className="text-meta text-ink-tertiary">
                        {note}
                      </span>
                    ) : null}
                  </span>
                  {groom ? (
                    <span className="border-line text-meta text-body-ink inline-flex shrink-0 items-center gap-1.5 rounded-full border px-[11px] py-[5px] font-semibold tabular-nums">
                      <Clock aria-hidden className="size-4" />
                      {formatDuration(groom.minutes, locale)}
                    </span>
                  ) : null}
                </span>
                {!eligible && active ? (
                  <span className="text-meta text-warning font-semibold">
                    {fill(t("wizRoomNotFor"), { pet: active.name })}
                  </span>
                ) : null}
                {tierPrices(pkg).length > 0 ? (
                  <span className="border-line flex gap-1 border-t pt-2.5">
                    {tierPrices(pkg).map(({ size, price }) => (
                      <span
                        key={size}
                        data-here={size === activeSize || undefined}
                        className="text-meta text-ink-tertiary data-[here=true]:bg-surface-inset data-[here=true]:text-body-ink flex-1 rounded-lg py-[5px] text-center font-medium tabular-nums data-[here=true]:font-bold"
                      >
                        {SIZE_SHORT[size] ?? size} {money(price)}
                      </span>
                    ))}
                  </span>
                ) : null}
                {on ? (
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground absolute top-4 right-4 flex size-6 items-center justify-center rounded-full"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {!isCustomer && active && activePackage ? (
        <label className="border-line bg-card flex max-w-[560px] cursor-pointer items-center gap-3.5 rounded-xl border px-[18px] py-3.5">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-strong text-body-ink">
              {fill(t("wizHasMatting"), { pet: active.name })}
            </span>
            <span className="text-meta text-ink-tertiary">
              {activeMatting && activeMatting.amount > 0
                ? activeMatting.minutes > 0
                  ? fill(t("wizMattingHint"), {
                      price: money(activeMatting.amount),
                      minutes: formatDuration(activeMatting.minutes, locale),
                    })
                  : fill(t("wizMattingHintPrice"), {
                      price: money(activeMatting.amount),
                    })
                : activeMatting && activeMatting.minutes > 0
                  ? fill(t("wizMattingHintMinutes"), {
                      minutes: formatDuration(activeMatting.minutes, locale),
                    })
                  : t("wizMattingHintNone")}
            </span>
          </span>
          <Switch
            checked={matted[active.id] === true}
            onCheckedChange={(on) =>
              onMattedChange({ ...matted, [active.id]: on })
            }
          />
        </label>
      ) : null}

      {isCustomer ? (
        <p className="text-meta text-ink-tertiary">
          {t("wizGroomEstimateNote")}
        </p>
      ) : null}
    </div>
  );
}
