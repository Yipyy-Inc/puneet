"use client";

import { useState } from "react";
import { CheckCircle2, Lock, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReplyBox({
  onSend,
}: {
  onSend: (body: string, isInternal: boolean, resolve: boolean) => void;
}) {
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const isNote = mode === "note";

  function submit(resolve: boolean) {
    if (!text.trim()) return;
    onSend(text.trim(), isNote, resolve);
    setText("");
    setMode("reply");
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-3 transition-colors",
        isNote && "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20",
      )}
    >
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as "reply" | "note")}
        className="flex flex-wrap gap-4"
      >
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="reply" />
          Reply to Facility
        </Label>
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="note" />
          <Lock className="size-3.5" />
          Add Internal Note
        </Label>
      </RadioGroup>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          isNote
            ? "Add an internal note (not visible to the facility)…"
            : "Write a reply to the facility…"
        }
        className={cn("min-h-24", isNote && "bg-background")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground text-[11px]">Rich text supported</p>
        <Button
          className="ml-auto"
          disabled={!text.trim()}
          onClick={() => submit(false)}
        >
          <Send className="mr-1.5 size-4" />
          {isNote ? "Add Note" : "Send Reply"}
        </Button>
        <Button
          variant="outline"
          disabled={!text.trim()}
          onClick={() => submit(true)}
        >
          <CheckCircle2 className="mr-1.5 size-4" />
          Reply &amp; Resolve
        </Button>
      </div>
    </div>
  );
}
