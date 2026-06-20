"use client";

/**
 * Five-button toolbar that sits directly below the pet header on the student
 * profile. Covers the workflows staff hit most often so they don't have to
 * navigate into a tab first:
 *
 *   1. Enroll in series       — deep-link to the new-enrollment flow
 *   2. Assign homework        — opens the homework prompt in-place
 *   3. Send message to owner  — small compose dialog that toasts a mock send
 *   4. Add note               — opens the Notes composer in-place
 *   5. Book private session   — deep-link to the booking flow, private preset
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CalendarPlus,
  GraduationCap,
  MessageSquare,
  Send,
  StickyNote,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { HomeworkEditDialog } from "@/components/facility/training/homework-edit-dialog";
import type { TrainerNote, TrainerNoteCategory } from "@/types/training";

interface Props {
  petId: number;
  petName: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

const CATEGORY_LABEL: Record<TrainerNoteCategory, string> = {
  behavior: "Behavior",
  progress: "Progress",
  concern: "Concern",
  achievement: "Achievement",
  general: "General",
};

export function TrainingProfileQuickActions({
  petId,
  petName,
  ownerName,
  ownerEmail,
  ownerPhone,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0]!, []);

  // Customer-facing booking flow is shared across services; deep-link with
  // the program pre-selected if/when the trainer comes in via the catalog.
  // For the bare "Enroll in series" action we hand off to the courses page
  // — staff pick the program first, then return here through the new
  // enrollment dialog they're already familiar with.
  const enrollHref = `/facility/dashboard/services/training/series`;
  // Private sessions live on the same booking entry point with a service
  // hint so the picker lands on the private-session step.
  const privateHref = `/facility/dashboard/services/training?newSession=1&private=1&petId=${petId}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href={enrollHref}>
            <GraduationCap className="size-4" />
            Enroll in series
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setHomeworkOpen(true)}
        >
          <BookOpen className="size-4" />
          Assign homework
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setMessageOpen(true)}
        >
          <MessageSquare className="size-4" />
          Send message
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setNoteOpen(true)}
        >
          <StickyNote className="size-4" />
          Add note
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href={privateHref}>
            <CalendarPlus className="size-4" />
            Book private session
          </Link>
        </Button>
      </div>

      <AddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        petId={petId}
        petName={petName}
      />
      <SendMessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        petName={petName}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        ownerPhone={ownerPhone}
      />
      {/* Same assign modal the Homework tab uses — writes through
          fanOutHomeworkUpsert so the record lands in the shared
          ["training","homework"] store and the owner sees it in their portal,
          identical to the session-completion auto-assign path. */}
      <HomeworkEditDialog
        open={homeworkOpen}
        onOpenChange={setHomeworkOpen}
        editing={null}
        restrictToPetId={petId}
        todayISO={todayISO}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Add Note Dialog — pared-down composer that writes through the shared
// notes cache so the Notes tab picks it up immediately.
// ─────────────────────────────────────────────────────────────────────────

function AddNoteDialog({
  open,
  onOpenChange,
  petId,
  petName,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  petId: number;
  petName: string;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<TrainerNoteCategory>("general");
  const [isPrivate, setIsPrivate] = useState(true);
  const [pinToProfile, setPinToProfile] = useState(false);

  function handleSave() {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error("Note can't be empty.");
      return;
    }
    const todayISO = new Date().toISOString().split("T")[0]!;
    const nowISO = new Date().toISOString();
    const record: TrainerNote = {
      id: `note-${Date.now()}`,
      enrollmentId: "",
      petId,
      petName,
      classId: "",
      className: "",
      trainerId: "trainer-001",
      trainerName: "Staff",
      date: todayISO,
      note: trimmed,
      category,
      isPrivate,
      isPinnedToProfile: pinToProfile,
      pinnedAtISO: pinToProfile ? nowISO : undefined,
    };
    const key = trainingQueries.trainerNotes().queryKey;
    queryClient.setQueryData<TrainerNote[]>(key, (prev = []) => {
      // Only one pin per pet — clear any prior pin when this one is pinned.
      const next = pinToProfile
        ? prev.map((n) =>
            n.petId === petId && n.isPinnedToProfile
              ? { ...n, isPinnedToProfile: false, pinnedAtISO: undefined }
              : n,
          )
        : prev;
      return [record, ...next];
    });
    toast.success(
      pinToProfile
        ? "Note added and pinned to the profile."
        : isPrivate
          ? "Private note added."
          : "Note added and shared with the owner.",
    );
    setNote("");
    setCategory("general");
    setIsPrivate(true);
    setPinToProfile(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <StickyNote className="size-4 text-indigo-600" />
            Add note for {petName}
          </DialogTitle>
          <DialogDescription>
            Logged against this pet&apos;s training notes. Toggle Pin to put it
            at the top of the Overview tab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Note</Label>
            <Textarea
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you notice? Be specific so future-you remembers context."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TrainerNoteCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as TrainerNoteCategory[]).map(
                  (c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">
                {isPrivate ? "Instructor-only" : "Share with client"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {isPrivate
                  ? "Stays internal — clients won't see this note."
                  : "Visible to the owner in their portal."}
              </p>
            </div>
            <Switch
              checked={!isPrivate}
              onCheckedChange={(checked) => setIsPrivate(!checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Pin to profile</p>
              <p className="text-muted-foreground text-[11px]">
                Surfaces at the top of this pet&apos;s Overview tab for every
                staff member. Replaces any existing pinned note.
              </p>
            </div>
            <Switch checked={pinToProfile} onCheckedChange={setPinToProfile} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!note.trim()}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Add note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Send Message Dialog — mock outbound message to the owner. Channel picker
// + body. Toasts a confirmation on send; a real integration plugs in here.
// ─────────────────────────────────────────────────────────────────────────

function SendMessageDialog({
  open,
  onOpenChange,
  petName,
  ownerName,
  ownerEmail,
  ownerPhone,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  petName: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
}) {
  type Channel = "email" | "sms";
  const [channel, setChannel] = useState<Channel>(ownerEmail ? "email" : "sms");
  const [subject, setSubject] = useState(`Update about ${petName}`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Message can't be empty.");
      return;
    }
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(
        channel === "email"
          ? `Email sent to ${ownerName} at ${ownerEmail}.`
          : `SMS sent to ${ownerName} at ${ownerPhone}.`,
      );
      setBody("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="size-4 text-indigo-600" />
            Message {ownerName}
          </DialogTitle>
          <DialogDescription>
            Sends through the configured channel. The customer portal logs the
            conversation against this pet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Channel</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("email")}
                disabled={!ownerEmail}
                className={`inline-flex flex-col items-start rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors ${
                  channel === "email"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "hover:bg-slate-50"
                } ${!ownerEmail ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Send className="size-3" />
                  Email
                </span>
                <span className="text-muted-foreground truncate">
                  {ownerEmail ?? "No email on file"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChannel("sms")}
                disabled={!ownerPhone}
                className={`inline-flex flex-col items-start rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors ${
                  channel === "sms"
                    ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                    : "hover:bg-slate-50"
                } ${!ownerPhone ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="inline-flex items-center gap-1 font-semibold">
                  <MessageSquare className="size-3" />
                  SMS
                </span>
                <span className="text-muted-foreground truncate">
                  {ownerPhone ?? "No phone on file"}
                </span>
              </button>
            </div>
          </div>
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Message</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi ${ownerName.split(" ")[0]} — quick update on ${petName}…`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!body.trim() || busy}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Send className="mr-1.5 size-4" />
            {busy
              ? "Sending…"
              : channel === "email"
                ? "Send email"
                : "Send SMS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
