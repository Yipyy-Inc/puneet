"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BoardingMoveError,
  useBoardingRooms,
  useMoveBoardingStay,
} from "@/lib/api/boarding-rooms";
import { todayIso } from "@/lib/care-log-scheduler";
import { formatCalendarDayLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Move a guest to another kennel from a night on.
//
// The nights before the one picked stay where they were slept or booked; the
// picked night and every one after it move. From the first night, that is the
// whole stay. The database judges the new kennel on those nights alone and
// refuses one somebody else holds, so the list below is every kennel rather
// than a guess at which are free — the refusal says which nights clash.
// ============================================================================

/** Every night of a stay: `start` up to the night before `end`. */
function nightsOf(start: string, end: string): string[] {
  const nights: string[] = [];
  const day = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (day < last && nights.length < 366) {
    nights.push(todayIso(day));
    day.setDate(day.getDate() + 1);
  }
  return nights;
}

export function MoveKennelDialog({
  open,
  onOpenChange,
  bookingRef,
  petName,
  startDate,
  endDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingRef: number;
  petName: string;
  /** The booking's first night and its check-out day, YYYY-MM-DD. */
  startDate: string;
  endDate: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Re-mounted on open, so a second move starts from a clean form. */}
        {open && (
          <MoveKennelBody
            bookingRef={bookingRef}
            petName={petName}
            startDate={startDate}
            endDate={endDate}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoveKennelBody({
  bookingRef,
  petName,
  startDate,
  endDate,
  onDone,
}: {
  bookingRef: number;
  petName: string;
  startDate: string;
  endDate: string;
  onDone: () => void;
}) {
  const { t, fill, locale } = useStaffText("kennelMoves");
  const { data, isPending } = useBoardingRooms();
  const moveStay = useMoveBoardingStay();

  const nights = useMemo(
    () => nightsOf(startDate, endDate),
    [startDate, endDate],
  );
  const today = todayIso();
  const [from, setFrom] = useState(
    () => nights.find((night) => night >= today) ?? nights[0] ?? startDate,
  );
  const [roomId, setRoomId] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);

  const rooms = useMemo(() => {
    const categories = new Map((data?.categories ?? []).map((c) => [c.id, c]));
    return (data?.rooms ?? [])
      .filter(
        (room) =>
          room.active &&
          categories.get(room.categoryId)?.service === "boarding",
      )
      .map((room) => ({
        id: room.id,
        label: [room.name, categories.get(room.categoryId)?.name]
          .filter(Boolean)
          .join(" · "),
        name: room.name,
      }));
  }, [data]);

  const room = rooms.find((r) => r.id === roomId);
  const values = {
    guest: petName,
    pet: petName,
    room: room?.name ?? roomId,
    date: formatCalendarDayLong(from, locale),
  };

  const submit = () => {
    if (!roomId || !from) return;
    setRefusal(null);
    moveStay.mutate(
      { bookingRef, from, roomId },
      {
        onSuccess: () => {
          toast.success(fill("movedFrom", values));
          onDone();
        },
        onError: (err) =>
          setRefusal(
            fill(
              `refused_${err instanceof BoardingMoveError && err.reason ? err.reason : "failed"}`,
              values,
            ),
          ),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRightLeft className="size-5" />
          {fill("dialogTitle", { pet: petName })}
        </DialogTitle>
        <DialogDescription>{t("dialogHelp")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="move-kennel-from">{t("fromLabel")}</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger id="move-kennel-from" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nights.map((night) => (
                <SelectItem key={night} value={night}>
                  {formatCalendarDayLong(night, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {from === nights[0] && (
            <p className="text-ink-tertiary text-sm">{t("wholeStay")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="move-kennel-room">{t("kennelLabel")}</Label>
          <Select value={roomId} onValueChange={setRoomId} disabled={isPending}>
            <SelectTrigger id="move-kennel-room" className="w-full">
              <SelectValue placeholder={t("kennelPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {refusal && (
          <p role="alert" className="text-destructive text-sm">
            {refusal}
          </p>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onDone}
          disabled={moveStay.isPending}
        >
          {t("keep")}
        </Button>
        <Button
          onClick={submit}
          disabled={!roomId || !from || moveStay.isPending}
        >
          {moveStay.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="size-4" />
          )}
          {moveStay.isPending
            ? fill("moving", { pet: petName })
            : fill("moveButton", { pet: petName })}
        </Button>
      </DialogFooter>
    </>
  );
}
