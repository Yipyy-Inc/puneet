"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "Technical Issue",
  "Billing Question",
  "Feature Request",
  "Account Help",
  "Other",
];

export function SubmitTicketTab() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = subject.trim().length > 0 && description.trim().length > 0;

  function submit() {
    if (!valid) return;
    setSubmitted(true);
    toast.success("Ticket submitted — we'll email you a response.");
  }

  function reset() {
    setSubject("");
    setCategory(CATEGORIES[0]);
    setDescription("");
    setFile(null);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight">Ticket submitted</h3>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm">
            We&apos;ve received your request and will follow up by email. You
            can track it in your support history.
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="ticket-subject">Subject</Label>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Briefly, what do you need help with?"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="ticket-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-description">Description</Label>
        <Textarea
          id="ticket-description"
          className="min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Share as much detail as you can — steps, what you expected, and what happened."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Attachment (optional)</Label>
        {file ? (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Paperclip className="text-muted-foreground size-4 shrink-0" />
            <span className="flex-1 truncate">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setFile(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="mr-2 size-4" />
            Attach a file
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      <Button
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={!valid}
        onClick={submit}
      >
        Submit ticket
      </Button>
    </div>
  );
}
