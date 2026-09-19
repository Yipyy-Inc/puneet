"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAddBookingNote } from "@/lib/api/customer-bookings";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";

// ============================================================================
// Leave the facility a note on a booking, or ask to change its dates.
//
// "Add a note" saved nothing and toasted "Note added"; "Reschedule" opened a
// blank booking form. Changing dates stays the facility's to do — this asks,
// and says plainly that nothing moves until they change it. Both are saved on
// the booking as a note the customer and the staff read alike, and the desk
// is told (add_owner_booking_note, 20260919170912).
// ============================================================================

export type BookingNoteKind = "note" | "change_dates";

interface BookingNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BookingNoteKind;
  booking: { id: number; startDate: string } | null;
  petName?: string;
}

export function BookingNoteDialog({
  open,
  onOpenChange,
  kind,
  booking,
  petName,
}: BookingNoteDialogProps) {
  const { t, fill, locale } = useCustomerText("bookings");
  const [text, setText] = useState("");
  const add = useAddBookingNote();

  if (!booking) return null;
  const values = {
    pet: petName || t("petFallback"),
    date: formatDateLong(booking.startDate, locale),
  };
  const changeDates = kind === "change_dates";

  const close = (next: boolean) => {
    if (add.isPending) return;
    if (!next) setText("");
    onOpenChange(next);
  };

  const send = async () => {
    try {
      await add.mutateAsync({ ref: booking.id, kind, content: text });
      toast.success(changeDates ? t("changeDatesSent") : t("noteSent"));
      setText("");
      onOpenChange(false);
    } catch (error) {
      toast.error(changeDates ? t("changeDatesFailed") : t("noteFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {changeDates
              ? fill("changeDatesTitle", values)
              : fill("noteTitle", values)}
          </DialogTitle>
          <DialogDescription>
            {changeDates ? t("changeDatesBody") : t("noteBody")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="booking-note-text">
            {changeDates ? t("changeDatesLabel") : t("noteLabel")}
          </Label>
          <Textarea
            id="booking-note-text"
            value={text}
            maxLength={1000}
            rows={4}
            placeholder={
              changeDates ? t("changeDatesPlaceholder") : t("notePlaceholder")
            }
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => close(false)}
            disabled={add.isPending}
          >
            {t("noteClose")}
          </Button>
          <Button
            onClick={() => void send()}
            disabled={!text.trim()}
            loading={add.isPending}
          >
            {changeDates ? t("changeDatesSend") : t("noteSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
