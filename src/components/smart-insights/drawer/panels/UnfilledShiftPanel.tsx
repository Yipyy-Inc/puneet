"use client";

import { useState } from "react";
import {
  Calendar,
  UserPlus,
  Send,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { staffMembers } from "@/data/staff";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 6.2 Take Action — three options for an unfilled shift, all rendered
 * as buttons in the action drawer:
 *  1. Assign a staff member (confirm-before-modify)
 *  2. Post a shift swap request
 *  3. Contact available staff via Messaging (preview-before-send)
 */

const SHIFT = {
  dateLabel: "Tomorrow, May 21, 2026",
  dateIso: "2026-05-21",
  role: "Front Desk",
  start: "07:30 AM",
  end: "12:00 PM",
};

const AVAILABLE_STAFF_IDS = [
  "staff-001",
  "staff-002",
  "staff-005",
  "staff-006",
];

type Mode = "menu" | "assign" | "swap" | "contact";

export function UnfilledShiftPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "menu") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <ShiftCard />
        <div className="grid gap-3">
          <OptionButton
            icon={<UserPlus className="size-5" />}
            label="Assign a staff member"
            description="Pick from active staff and add them to this shift"
            onClick={() => setMode("assign")}
          />
          <OptionButton
            icon={<Send className="size-5" />}
            label="Post a shift swap request"
            description="Broadcast the open shift to all eligible staff"
            onClick={() => setMode("swap")}
          />
          <OptionButton
            icon={<MessageSquare className="size-5" />}
            label="Contact available staff"
            description="Open a messaging thread with pre-selected available staff"
            onClick={() => setMode("contact")}
          />
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Close"
            onPrimary={onCancel}
            primaryDestructive={false}
          />
        </div>
      </div>
    );
  }

  if (mode === "assign") {
    return (
      <AssignFlow
        onBack={() => setMode("menu")}
        onComplete={() => onComplete()}
      />
    );
  }

  if (mode === "swap") {
    return (
      <SwapFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />
    );
  }

  return (
    <ContactFlow onBack={() => setMode("menu")} onComplete={() => onComplete()} />
  );
}

function OptionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
    >
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {description}
        </span>
      </span>
    </button>
  );
}

function ShiftCard() {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
        <Calendar className="size-3.5" />
        Unfilled shift
      </div>
      <p className="font-semibold">{SHIFT.dateLabel}</p>
      <p className="text-sm">
        {SHIFT.role} · {SHIFT.start} – {SHIFT.end}
      </p>
    </div>
  );
}

// ─── Assign flow ─────────────────────────────────────────────────────────────
function AssignFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const [staffId, setStaffId] = useState<string>("");
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  const candidates = staffMembers.filter((s) => AVAILABLE_STAFF_IDS.includes(s.id));
  const selected = candidates.find((s) => s.id === staffId);

  if (step === "pick") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Assign a staff member" />
        <ShiftCard />

        <div className="space-y-2">
          <Label htmlFor="assign-staff">Available staff</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger id="assign-staff">
              <SelectValue placeholder="Pick a staff member" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Review assignment"
            onPrimary={() => setStep("confirm")}
            primaryDisabled={!staffId}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("pick")} label="Confirm assignment" />
      <ConfirmBeforeModify
        title="Confirm shift assignment"
        changes={[
          { field: "Date", to: SHIFT.dateLabel },
          { field: "Role", to: SHIFT.role },
          { field: "Time", to: `${SHIFT.start} – ${SHIFT.end}` },
          {
            field: "Staff",
            to: selected ? `${selected.name} (${selected.role})` : "—",
          },
        ]}
        note="The staff member will be notified that they've been added to this shift."
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Assign shift"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("pick")}
        />
      </div>
    </div>
  );
}

// ─── Swap flow ───────────────────────────────────────────────────────────────
function SwapFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={onBack} label="Post shift swap request" />
      <ShiftCard />

      <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Who will see this</p>
        <p className="text-muted-foreground text-xs">
          All staff with Front Desk skill across all locations who are not
          already on this shift.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {staffMembers
            .filter((s) => AVAILABLE_STAFF_IDS.includes(s.id))
            .map((s) => (
              <Badge key={s.id} variant="outline" className="bg-white">
                {s.name}
              </Badge>
            ))}
        </div>
      </div>

      <ConfirmBeforeModify
        title="Confirm swap broadcast"
        changes={[
          { field: "Action", to: "Post shift to swap board" },
          { field: "Date", to: SHIFT.dateLabel },
          { field: "Role", to: `${SHIFT.role} · ${SHIFT.start}–${SHIFT.end}` },
          { field: "Audience", to: `${AVAILABLE_STAFF_IDS.length} eligible staff` },
        ]}
        note="Staff who accept the shift will be added to the schedule automatically. You'll be notified when someone claims it."
      />

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Post swap"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={onBack}
        />
      </div>
    </div>
  );
}

// ─── Contact flow ────────────────────────────────────────────────────────────
function ContactFlow({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [body, setBody] = useState(
    `Hi team — we have an unfilled ${SHIFT.role} shift on ${SHIFT.dateLabel}, ${SHIFT.start}–${SHIFT.end}. If anyone can cover, please reply to this message. Thanks!`,
  );

  const recipients = staffMembers
    .filter((s) => AVAILABLE_STAFF_IDS.includes(s.id))
    .map((s) => s.name);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <BackHeader onBack={onBack} label="Contact available staff" />
        <ShiftCard />
        <div className="space-y-2">
          <Label htmlFor="contact-body">Message</Label>
          <Textarea
            id="contact-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
          />
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={body.trim() === ""}
            secondaryLabel="Back"
            onSecondary={onBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={() => setStep("compose")} label="Confirm message" />
      <PreviewBeforeSend
        channel="sms"
        recipients={recipients}
        body={body}
        meta={[
          { label: "Channel", value: "Messaging module" },
          { label: "Recipients", value: recipients.length },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send message"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}

function BackHeader({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-xs uppercase tracking-wide transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  );
}
