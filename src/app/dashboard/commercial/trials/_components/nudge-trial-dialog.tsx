"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getEmailTemplate } from "@/data/email-templates";
import type { Trial } from "@/types/trials";
import { resolveTrialMergeTags } from "./trials-utils";

const TEMPLATE_ID = "tmpl-trial-expiry";

interface NudgeTrialDialogProps {
  trial: Trial;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trial: Trial) => void;
}

export function NudgeTrialDialog({
  trial,
  onOpenChange,
  onConfirm,
}: NudgeTrialDialogProps) {
  const template = getEmailTemplate(TEMPLATE_ID);
  const [subject, setSubject] = useState(
    resolveTrialMergeTags(template?.subject ?? "Your Yipyy trial", trial),
  );
  const [body, setBody] = useState(
    resolveTrialMergeTags(template?.body ?? "", trial),
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send nudge</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Pre-filled from the “{template?.name ?? "Trial Expiry"}” template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nudge-to">To</Label>
            <Input id="nudge-to" value={trial.adminEmail} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nudge-subject">Subject</Label>
            <Input
              id="nudge-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nudge-body">Message</Label>
            <Textarea
              id="nudge-body"
              className="min-h-[140px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!subject.trim() || !body.trim()}
            onClick={() => onConfirm(trial)}
          >
            Send nudge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
