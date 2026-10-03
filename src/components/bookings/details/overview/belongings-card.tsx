"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookingMutations } from "@/lib/api/booking";
import { formatDateShort, formatTime } from "@/lib/i18n/format";
import type { BelongingEntry } from "@/types/booking";

import {
  DetailsCard,
  DetailsCardHeader,
  DetailsCardNote,
} from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// Belongings, as the mock draws them: what came in, a note under each, "Mark
// returned" turning to a green "Returned ✓" when it goes home, and one line
// to add an item. Saved onto the booking's own list (`belongings`), as the
// booking page always saved it — shown at once and put back if refused.
// ============================================================================

export function BelongingsCard({ d }: { d: BookingDetails }) {
  const { t, fill, locale } = d.text;
  const queryClient = useQueryClient();
  const booking = d.booking;
  const [optimistic, setOptimistic] = useState<BelongingEntry[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  if (!booking) return null;
  const items = optimistic ?? booking.belongings ?? [];
  const returned = items.filter((i) => i.returned).length;
  const closed = booking.status === "cancelled";

  const commit = async (next: BelongingEntry[], done?: string) => {
    setOptimistic(next);
    setSaving(true);
    try {
      await bookingMutations.update(booking.id, { belongings: next });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (done) toast.success(done);
      return true;
    } catch (error) {
      toast.error(t("belongingsNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    } finally {
      setOptimistic(null);
      setSaving(false);
    }
  };

  const toggle = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const back = !item.returned;
    void commit(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              returned: back,
              returnedAt: back ? new Date().toISOString() : undefined,
              returnedBy: undefined,
            }
          : i,
      ),
      back ? t("belongingsReturnedToast") : undefined,
    );
  };

  const add = () => {
    const name = draft.trim();
    if (!name || saving) return;
    void commit(
      [
        ...items,
        {
          id: `bel-${crypto.randomUUID()}`,
          name,
          condition: "Good",
          checkedInAt: new Date().toISOString(),
          returned: false,
        },
      ],
      t("belongingsAddedToast"),
    ).then((saved) => {
      if (saved) setDraft("");
    });
  };

  const note = (item: BelongingEntry) => {
    if (item.returned) return t("returnedToParent");
    if (item.description) return item.description;
    return item.checkedInAt
      ? fill("addedOn", {
          date: formatDateShort(item.checkedInAt, locale),
          time: formatTime(item.checkedInAt, locale),
        })
      : "";
  };

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("belongingsTitle")}>
        <DetailsCardNote>
          {fill(items.length === 1 ? "itemsReturnedOne" : "itemsReturnedMany", {
            n: items.length,
            returned,
          })}
        </DetailsCardNote>
      </DetailsCardHeader>
      <div className="flex flex-col px-5 pt-1.5 pb-2">
        {items.length === 0 ? (
          <span className="text-ink-disabled py-3 text-[14px]">
            {t("belongingsNone")}
          </span>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border-line-soft flex items-center justify-between gap-3 border-b py-2.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-medium">{item.name}</span>
                {note(item) ? (
                  <span className="text-ink-tertiary text-[12px]">
                    {note(item)}
                  </span>
                ) : null}
              </span>
              <Button
                variant="quiet"
                size="bd-34"
                disabled={saving || closed}
                aria-pressed={item.returned}
                onClick={() => toggle(item.id)}
                className="aria-pressed:bg-wash-success aria-pressed:text-success aria-pressed:border-(--bd-ok-line)"
              >
                {item.returned ? t("returnedCheck") : t("markReturned")}
              </Button>
            </div>
          ))
        )}
      </div>
      {closed ? null : (
        <form
          className="flex gap-2 px-5 pt-2.5 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("belongingsPlaceholder")}
            aria-label={t("belongingsAdd")}
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            variant="quiet"
            size="bd-40"
            disabled={!draft.trim()}
            loading={saving && Boolean(draft.trim())}
          >
            {t("add")}
          </Button>
        </form>
      )}
    </DetailsCard>
  );
}
