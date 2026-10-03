"use client";

import { Button } from "@/components/ui/button";
import { mealPrep, mealWhat, planExtras } from "@/lib/feeding/describe";
import { packLabel } from "@/lib/feeding/labels";
import { planFromItem } from "@/lib/feeding/plan";
import { servedMealIds, sortedMeals } from "@/lib/feeding/schedule";
import { formatTimeOfDay } from "@/lib/i18n/format";
import { bookingStay } from "@/lib/medications/schedule";
import { useShellText } from "@/lib/shell/use-shell-text";

import { DetailsCard, DetailsCardHeader } from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// The Feeding plan card, as the mock draws it: each meal's time in the warm
// ink, what is served (in the owner's own words, through the booking form's
// describer — the same sentences the wizard and the care board use), and who
// brings it and how; then what anyone feeding the pet needs to know, in one
// line. Logging the meals is the journal's job, not this card's.
//
// Edit opens the booking's own edit form, where the plan is changed.
// ============================================================================

export function FeedingCard({
  d,
  onEdit,
}: {
  d: BookingDetails;
  onEdit?: () => void;
}) {
  const { t, locale } = d.text;
  const words = useShellText("booking");
  const booking = d.booking;
  if (!booking) return null;
  const items = booking.feedingSchedule ?? [];
  const stay = bookingStay(booking);
  const settings = d.feedingInstructions;
  const nameOf = (petId?: number) =>
    d.pets.find((p) => p.id === petId)?.name ?? null;

  const blocks = items.map((item) => {
    const plan = planFromItem(item, { settings, stay });
    const meals = sortedMeals(plan.meals).map((meal) => {
      const foods = plan.foods.filter((food) =>
        servedMealIds(food, sortedMeals(plan.meals)).includes(meal.id),
      );
      const how = [
        foods.some((f) => f.source === "house")
          ? t("foodFacilityProvides")
          : t("foodParentBrings"),
        ...foods
          .map((f) => (f.pack ? packLabel(words, f.pack) : ""))
          .filter(Boolean),
        ...mealPrep(words, plan, meal.id),
      ];
      return {
        id: meal.id,
        time: formatTimeOfDay(meal.time, locale),
        what: mealWhat(words, plan, meal.id, locale, settings),
        how: [...new Set(how)].join(" · "),
      };
    });
    return {
      id: item.id,
      pet: d.pets.length > 1 ? nameOf(item.petId) : null,
      meals,
      note: planExtras(words, plan, locale).join(" · "),
    };
  });

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardFeedingPlan")} dot="feeding">
        {onEdit ? (
          <Button variant="quiet" size="bd-34" onClick={onEdit}>
            {t("edit")}
          </Button>
        ) : null}
      </DetailsCardHeader>
      <div className="flex flex-col px-5 pt-1.5 pb-3.5">
        {blocks.length === 0 ? (
          <span className="text-ink-disabled py-3 text-[14px]">
            {t("feedingNone")}
          </span>
        ) : (
          blocks.map((block) => (
            <div key={block.id} className="flex flex-col">
              {block.pet ? (
                <span className="text-ink-secondary pt-2.5 text-[13px] font-semibold">
                  {block.pet}
                </span>
              ) : null}
              {block.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="border-line-soft grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b py-2.5"
                >
                  <span className="text-[13px] font-semibold text-(--bd-feed-ink)">
                    {meal.time}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-medium">{meal.what}</span>
                    {meal.how ? (
                      <span className="text-ink-tertiary text-[12px]">
                        {meal.how}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
              {block.note ? (
                <span className="text-ink-secondary pt-2.5 text-[13px]">
                  {block.note}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </DetailsCard>
  );
}
