"use client";

import { useState, useRef, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  SendHorizonal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  UnfinishedBooking,
  UnfinishedBookingNote,
  UnfinishedBookingStatus,
} from "@/types/unfinished-booking";
import {
  ABANDONMENT_STEP_LABELS,
  UNFINISHED_STATUS_LABELS,
} from "@/data/unfinished-bookings";

// In a real app this comes from the auth context
const CURRENT_STAFF = "Staff";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString: string): string {
  const then = new Date(isoString);
  const now = new Date("2026-04-12T00:00:00Z");
  const diffMs = now.getTime() - then.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

interface Props {
  booking: UnfinishedBooking | null;
  onClose: () => void;
  onMarkAs: (id: string, status: UnfinishedBookingStatus) => void;
  onAddNote: (id: string, note: UnfinishedBookingNote) => void;
  onSendEmail: (booking: UnfinishedBooking) => void;
  onSchedule: (booking: UnfinishedBooking) => void;
}

export function UnfinishedBookingDetailSheet({
  booking,
  onClose,
  onMarkAs,
  onAddNote,
  onSendEmail,
  onSchedule,
}: Props) {
  const [noteText, setNoteText] = useState("");
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNoteText("");
  }, [booking?.id]);

  if (!booking) return null;

  const stepConfig = ABANDONMENT_STEP_LABELS[booking.abandonmentStep];
  const statusConfig = UNFINISHED_STATUS_LABELS[booking.status];
  const notes = booking.notes ?? [];

  const handleAddNote = () => {
    const text = noteText.trim();
    if (!text) return;
    const note: UnfinishedBookingNote = {
      id: `note-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      staffName: CURRENT_STAFF,
    };
    onAddNote(booking.id, note);
    setNoteText("");
    toast.success("Note added");
    setTimeout(
      () => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  };

  return (
    <DialogPrimitive.Root
      open={!!booking}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/55 backdrop-blur-md duration-300" />

        {/* Card */}
        <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-3 fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.45)] duration-200 ease-out">
          {/* ── Gradient hero header ── */}
          <div className="to-background dark:to-background border-border/60 relative shrink-0 border-b bg-linear-to-br from-amber-50 via-orange-50/60 px-7 pt-7 pb-6 dark:from-amber-950/40 dark:via-amber-900/15">
            {/* Close */}
            <DialogPrimitive.Close
              className="text-muted-foreground hover:text-foreground bg-background/70 hover:bg-muted border-border/50 absolute top-4 right-4 flex size-7 items-center justify-center rounded-full border transition-all duration-150"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </DialogPrimitive.Close>

            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-base font-bold tracking-wide shadow-md ring-2 ring-white/80 dark:bg-slate-800 dark:ring-slate-700">
                {getInitials(booking.clientName)}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <DialogPrimitive.Title className="truncate text-xl font-semibold tracking-tight">
                  {booking.clientName}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">
                  Unfinished booking details and notes
                </DialogPrimitive.Description>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Abandoned {formatRelativeTime(booking.abandonedAt)}
                  </span>
                </div>

                {/* Contact row */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Mail className="size-3.5 shrink-0" />
                    {booking.clientEmail}
                  </span>
                  {booking.clientPhone && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Phone className="size-3.5 shrink-0" />
                      {booking.clientPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
            {/* Detail cards 2×2 grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {booking.petName && (
                <DetailCard label="Pet">
                  <span className="font-medium">{booking.petName}</span>
                  {booking.petType && (
                    <span className="text-muted-foreground block text-xs capitalize">
                      {booking.petType}
                    </span>
                  )}
                </DetailCard>
              )}
              {booking.service && (
                <DetailCard label="Service">
                  <span className="font-medium capitalize">
                    {booking.service}
                  </span>
                  {booking.serviceType && (
                    <span className="text-muted-foreground block text-xs capitalize">
                      {booking.serviceType.replace(/_/g, " ")}
                    </span>
                  )}
                </DetailCard>
              )}
              {booking.requestedStartDate && (
                <DetailCard label="Dates">
                  <span className="text-sm font-medium">
                    {fmtDate(booking.requestedStartDate)}
                    {booking.requestedEndDate &&
                      booking.requestedEndDate !==
                        booking.requestedStartDate && (
                        <> → {fmtDate(booking.requestedEndDate)}</>
                      )}
                  </span>
                </DetailCard>
              )}
              {booking.estimatedValue != null && (
                <DetailCard label="Est. Value">
                  <span className="price-value text-base font-bold">
                    ${booking.estimatedValue}
                  </span>
                </DetailCard>
              )}
            </div>

            {/* Abandonment step progress */}
            <div className="bg-muted/20 rounded-xl border px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">{stepConfig.label}</p>
                <span className="text-muted-foreground text-xs font-medium">
                  {stepConfig.progress}% complete
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-400 transition-all"
                  style={{ width: `${stepConfig.progress}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1.5 text-[10px] tracking-wide uppercase">
                Abandoned at step
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onSchedule(booking)}
              >
                <CalendarDays className="size-3.5" />
                Schedule
              </Button>
              {booking.status !== "recovered" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onSendEmail(booking)}
                >
                  <MessageSquare className="size-3.5" />
                  Send Email
                </Button>
              )}
              {booking.status === "abandoned" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/20"
                  onClick={() => onMarkAs(booking.id, "contacted")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Mark Contacted
                </Button>
              )}
              {booking.status !== "recovered" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
                  onClick={() => onMarkAs(booking.id, "recovered")}
                >
                  <RefreshCw className="size-3.5" />
                  Mark Recovered
                </Button>
              )}
            </div>

            <Separator />

            {/* Notes timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Notes</p>
                {notes.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {notes.length}
                  </Badge>
                )}
              </div>

              {notes.length === 0 ? (
                <p className="text-muted-foreground py-1 text-sm">
                  No notes yet — add one below.
                </p>
              ) : (
                <div className="space-y-5">
                  {notes.map((note) => (
                    <div key={note.id} className="flex gap-3">
                      {/* Staff avatar */}
                      <div className="bg-muted ring-background flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2">
                        {getInitials(note.staffName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold">
                            {note.staffName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatNoteDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-foreground/80 mt-1 text-sm/relaxed whitespace-pre-wrap">
                          {note.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={notesEndRef} />
                </div>
              )}

              {/* Add note input */}
              <div className="bg-muted/20 space-y-2.5 rounded-xl border p-3">
                <Textarea
                  placeholder="Add a note… e.g. Left voicemail, client said they'll call back"
                  className="min-h-[76px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <div className="border-border/50 flex items-center justify-between border-t pt-2.5">
                  <p className="text-muted-foreground text-[11px]">
                    Ctrl + Enter to submit
                  </p>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="h-7 gap-1.5 px-3 text-xs"
                  >
                    <SendHorizonal className="size-3.5" />
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/20 rounded-xl border px-3.5 py-3">
      <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
