"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageSquare, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";

/** One messageable owner. An owner with two dogs in the same series collapses
 *  into a single recipient (one message, both pets listed). */
interface Recipient {
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  petNames: string[];
}

type Channel = "sms" | "email";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: TrainingSeries;
  enrollments: TrainingEnrollment[];
}

/**
 * "Message Students" broadcast composer. Pre-loads every active student in the
 * series as a recipient (deselectable), and mock-sends the same message to all
 * of them — the constant use case is a class reminder ("bring treats + a
 * 6-foot leash to Saturday's class"). Mirrors the local-composer pattern used
 * elsewhere in the training module; a real messaging integration plugs in at
 * `handleSend`.
 */
export function SeriesMessageStudentsDialog({
  open,
  onOpenChange,
  series,
  enrollments,
}: Props) {
  const recipients = useMemo<Recipient[]>(() => {
    const byOwner = new Map<number, Recipient>();
    for (const e of enrollments) {
      // Active roster only — waitlisted/withdrawn/completed students aren't
      // coming to the next class, so they're not pre-loaded.
      if (e.status !== "enrolled" && e.status !== "paused") continue;
      const existing = byOwner.get(e.ownerId);
      if (existing) {
        if (!existing.petNames.includes(e.petName)) {
          existing.petNames.push(e.petName);
        }
      } else {
        byOwner.set(e.ownerId, {
          ownerId: e.ownerId,
          ownerName: e.ownerName,
          ownerEmail: e.ownerEmail,
          ownerPhone: e.ownerPhone,
          petNames: [e.petName],
        });
      }
    }
    return [...byOwner.values()].sort((a, b) =>
      a.ownerName.localeCompare(b.ownerName),
    );
  }, [enrollments]);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [channel, setChannel] = useState<Channel>("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => recipients.filter((r) => !excluded.has(r.ownerId)),
    [recipients, excluded],
  );
  const reachable = useMemo(
    () =>
      selected.filter((r) => (channel === "email" ? r.ownerEmail : r.ownerPhone)),
    [selected, channel],
  );

  function toggle(ownerId: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  }

  async function handleSend() {
    if (selected.length === 0) {
      toast.error("Pick at least one student to message.");
      return;
    }
    if (!body.trim()) {
      toast.error("Message can't be empty.");
      return;
    }
    const channelLabel = channel === "email" ? "email" : "phone";
    if (reachable.length === 0) {
      toast.error(`No selected students have a ${channelLabel} on file.`);
      return;
    }
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const skipped = selected.length - reachable.length;
      toast.success(
        `${channel === "email" ? "Email" : "SMS"} sent to ${reachable.length} student${
          reachable.length === 1 ? "" : "s"
        } in ${series.seriesName}.`,
        skipped > 0
          ? { description: `${skipped} skipped — no ${channelLabel} on file.` }
          : undefined,
      );
      setBody("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-5 text-indigo-600" />
            Message students
          </DialogTitle>
          <DialogDescription className="text-sm/relaxed">
            Sends one message to every selected student in{" "}
            <span className="font-medium">{series.seriesName}</span>. Great for
            class reminders — what to bring, schedule changes, weather calls.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Recipients ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Recipients</Label>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                <Users className="size-3" />
                {selected.length} of {recipients.length} selected
              </span>
            </div>
            {recipients.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
                No active students enrolled in this series yet.
              </p>
            ) : (
              <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-1.5">
                {recipients.map((r) => {
                  const checked = !excluded.has(r.ownerId);
                  const contact =
                    channel === "email" ? r.ownerEmail : r.ownerPhone;
                  return (
                    <li key={r.ownerId}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
                          !checked && "opacity-55",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(r.ownerId)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {r.ownerName}
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              · {r.petNames.join(", ")}
                            </span>
                          </p>
                          <p
                            className={cn(
                              "truncate text-[11px]",
                              contact
                                ? "text-muted-foreground"
                                : "text-rose-600",
                            )}
                          >
                            {contact ??
                              `No ${channel === "email" ? "email" : "phone"} on file`}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Channel ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Channel</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  channel === "sms"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "hover:bg-slate-50",
                )}
              >
                <MessageSquare className="size-4" />
                SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  channel === "email"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "hover:bg-slate-50",
                )}
              >
                <Mail className="size-4" />
                Email
              </button>
            </div>
          </div>

          {/* Subject (email only) ───────────────────────────────────── */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Reminder · ${series.seriesName}`}
              />
            </div>
          )}

          {/* Message ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Message</Label>
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g., Please bring high-value treats and a 6-foot leash (no retractable leashes) to this Saturday's class. See you there!"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50/40 p-4 dark:bg-slate-950/40">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={busy || selected.length === 0 || !body.trim()}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="mr-1.5 size-4" />
            {busy
              ? "Sending…"
              : `Send to ${reachable.length || selected.length} student${
                  (reachable.length || selected.length) === 1 ? "" : "s"
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
