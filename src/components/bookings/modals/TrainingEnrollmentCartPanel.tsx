"use client";

import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import {
  formatDateLong,
  formatMoney,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Dog, GraduationCap, PlusCircle, X } from "lucide-react";
import type { TrainingSelection } from "./service-details/TrainingScheduleStep";

/** A single dog → series/course line item in a multi-dog booking. */
export interface TrainingCartItem extends TrainingSelection {
  petId: number;
  petName: string;
}

function EnrollmentRow({
  item,
  badge,
  onRemove,
}: {
  item: TrainingCartItem;
  badge?: "current";
  onRemove?: () => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  return (
    <div className="bg-card flex items-start gap-3 rounded-lg border p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
        <Dog className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="leading-tight font-semibold">{item.petName}</span>
          {badge === "current" && (
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
            >
              {t("current")}
            </Badge>
          )}
          {item.kind === "drop-in" && (
            <Badge variant="outline" className="text-[10px]">
              {t("dropInBadge")}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          <GraduationCap className="size-3 shrink-0" />
          <span className="truncate">
            {item.courseTypeName} · {item.seriesName}
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3 shrink-0" />
          {item.kind === "enroll" ? (
            <span>
              {t("cartSeriesLine")
                .replace(
                  "{day}",
                  formatWeekday(
                    new Date(item.startDate + "T00:00:00").getDay(),
                    locale,
                    "long",
                  ),
                )
                .replace("{time}", formatTimeOfDay(item.startTime, locale))
                .replace("{weeks}", String(item.numberOfWeeks))
                .replace("{date}", formatDateLong(item.startDate, locale))}
            </span>
          ) : (
            <span>
              {formatDateLong(item.startDate, locale)} ·{" "}
              {formatTimeOfDay(item.startTime, locale)}–
              {formatTimeOfDay(item.endTime, locale)}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-bold tabular-nums">
          {formatMoney(item.price, locale)}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label={t("removeFromBooking").replace("{name}", item.petName)}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Multi-dog enrollment cart shown on the training Confirm screen. Lists every
 * dog → course/series in this single transaction, lets staff drop already-added
 * dogs, and surfaces the "Enroll another dog" action that loops back through
 * Steps 1–3 for the next dog while keeping the same client + one payment.
 */
export function TrainingEnrollmentCartPanel({
  cartItems,
  currentItems,
  onRemoveCartItem,
  onEnrollAnotherDog,
  canEnrollAnother,
}: {
  /** Dogs already committed to the booking (earlier passes). */
  cartItems: TrainingCartItem[];
  /** The dog(s) currently being configured (this pass through Steps 1–3). */
  currentItems: TrainingCartItem[];
  onRemoveCartItem: (index: number) => void;
  onEnrollAnotherDog: () => void;
  /** False until the current dog has a series selected. */
  canEnrollAnother: boolean;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const total =
    cartItems.reduce((s, li) => s + li.price, 0) +
    currentItems.reduce((s, li) => s + li.price, 0);
  const count = cartItems.length + currentItems.length;

  return (
    <Card className="mx-1 mb-4 border-indigo-200">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">
              {count > 1 ? `${count} ${t("dogsInBooking")}` : t("thisBooking")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("eachDogEnrolled")}
            </p>
          </div>
          {count > 1 && (
            <span className="text-sm font-bold tabular-nums">
              {formatMoney(total, locale)} {t("combined")}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {cartItems.map((item, index) => (
            <EnrollmentRow
              key={`${item.petId}-${item.seriesId}-${index}`}
              item={item}
              onRemove={() => onRemoveCartItem(index)}
            />
          ))}
          {currentItems.map((item, index) => (
            <EnrollmentRow
              key={`current-${item.petId}-${item.seriesId}-${index}`}
              item={item}
              badge="current"
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-1.5 border-dashed"
          onClick={onEnrollAnotherDog}
          disabled={!canEnrollAnother}
          title={canEnrollAnother ? undefined : t("pickSeriesFirst")}
        >
          <PlusCircle className="size-4" />
          {t("enrollAnotherDog")}
        </Button>
      </CardContent>
    </Card>
  );
}
