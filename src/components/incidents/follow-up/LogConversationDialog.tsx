"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, PhoneOff, Voicemail, MessageSquare, Mail } from "lucide-react";
import type {
  ContactMethod,
  CustomerSentiment,
  FollowUpConversationEntry,
  FollowUpTask,
} from "@/types/incidents";

interface LogConversationDialogProps {
  task: FollowUpTask;
  loggedBy: string;
  onSave: (entry: FollowUpConversationEntry) => void;
  onCancel: () => void;
}

// Contact outcomes map to a contactMethod + whether the owner was actually
// reached (drives sentiment + the follow-up task's completion signal).
type Outcome = {
  value: string;
  label: string;
  icon: typeof Phone;
  contactMethod: ContactMethod;
  reachedClient: boolean;
};

const OUTCOMES: Outcome[] = [
  {
    value: "reached",
    label: "Reached owner",
    icon: Phone,
    contactMethod: "phone",
    reachedClient: true,
  },
  {
    value: "no_answer",
    label: "No answer",
    icon: PhoneOff,
    contactMethod: "phone",
    reachedClient: false,
  },
  {
    value: "voicemail",
    label: "Left voicemail",
    icon: Voicemail,
    contactMethod: "phone",
    reachedClient: false,
  },
  {
    value: "sms",
    label: "Sent SMS",
    icon: MessageSquare,
    contactMethod: "sms",
    reachedClient: false,
  },
  {
    value: "email",
    label: "Sent email",
    icon: Mail,
    contactMethod: "email",
    reachedClient: false,
  },
];

export function LogConversationDialog({
  task,
  loggedBy,
  onSave,
  onCancel,
}: LogConversationDialogProps) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [nextAttempt, setNextAttempt] = useState("");

  const handleSave = () => {
    const selected = OUTCOMES.find((o) => o.value === outcome);
    if (!selected) return;

    const trimmedNotes = notes.trim();
    const summary = trimmedNotes
      ? `${selected.label} — ${trimmedNotes}`
      : selected.label;
    const sentiment: CustomerSentiment = selected.reachedClient
      ? "neutral"
      : "unreachable";

    const entry: FollowUpConversationEntry = {
      id: `conv-${Date.now()}`,
      loggedAt: new Date().toISOString(),
      loggedBy,
      contactMethod: selected.contactMethod,
      reachedClient: selected.reachedClient,
      summary,
      customerStatement: "",
      staffResponse: "",
      sentiment,
      topics: [],
      nextSteps: nextAttempt
        ? `Next attempt: ${new Date(nextAttempt).toLocaleString()}`
        : undefined,
    };
    onSave(entry);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Phone className="text-primary size-5" />
          Log Conversation
        </DialogTitle>
        <DialogDescription>
          Record this follow-up contact. It&apos;s added to the task&apos;s
          conversation log and mirrored to the incident&apos;s notes.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Task context */}
        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-900/10">
          <CardContent className="py-3">
            <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-400">
              {task.protocolName ?? "Follow-Up Task"}
              {task.stepOrder ? ` · Step ${task.stepOrder}` : ""}
            </p>
            <p className="text-sm font-semibold">{task.title}</p>
          </CardContent>
        </Card>

        {/* Contact outcome — required */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Contact outcome *</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              const active = outcome === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes — optional */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Notes{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth recording for the next person..."
            rows={3}
          />
        </div>

        {/* Next attempt — optional */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Next attempt{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            type="datetime-local"
            value={nextAttempt}
            onChange={(e) => setNextAttempt(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!outcome}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
