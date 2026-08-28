"use client";

import { useRef, useState } from "react";
import { Mail, MessageSquare, Save, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  REBOOK_TEMPLATE_VARIABLES,
  getServiceLabel,
  type RebookMessageTemplate,
  type ReminderChannel,
  type ServiceTypeKey,
} from "@/data/rebook-reminders";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceTypeKey;
  channel: ReminderChannel;
  template: RebookMessageTemplate;
  onSave: (template: RebookMessageTemplate) => void;
  /** True while the parent is writing. The dialog stays open until it lands. */
  saving?: boolean;
}

export function RebookTemplateEditorModal({
  open,
  onOpenChange,
  service,
  channel,
  template,
  onSave,
  saving = false,
}: Props) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const insertVariable = (token: string) => {
    if (activeField === "subject") {
      const el = subjectRef.current;
      if (!el) return;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    } else {
      const el = bodyRef.current;
      if (!el) return;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    }
  };

  // The PARENT saves and reports. This used to raise its own
  // `toast.success("… template saved")` and close, before anything had been
  // written — which was true only while the save went into a local draft map
  // that was lost on reload. It is a real round trip now, so the outcome is
  // whoever made the request's to announce.
  const handleSave = () => onSave({ subject, body });

  const showSubject = channel === "email" || channel === "both";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            {getServiceLabel(service)} reminder template
          </DialogTitle>
          <DialogDescription>
            Used for both the first reminder and the follow-up. Click a variable
            to insert it at the cursor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Channel:</span>
            <Badge variant="outline" className="gap-1">
              {channel === "both" ? (
                <>
                  <Mail className="size-3" />
                  <MessageSquare className="size-3" />
                  Email + SMS
                </>
              ) : channel === "email" ? (
                <>
                  <Mail className="size-3" />
                  Email
                </>
              ) : (
                <>
                  <MessageSquare className="size-3" />
                  SMS
                </>
              )}
            </Badge>
          </div>

          {showSubject && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Subject (email only)
              </label>
              <Input
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setActiveField("subject")}
                placeholder="Time for {{pet_name}}'s next visit?"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Message body
              {channel === "sms" && (
                <span className="text-muted-foreground ml-2 font-normal">
                  ({body.length} chars · {Math.ceil(body.length / 160)} SMS
                  segment{body.length > 160 ? "s" : ""})
                </span>
              )}
            </label>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setActiveField("body")}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Insert variable</label>
            <div className="flex flex-wrap gap-1.5">
              {REBOOK_TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(v.token)}
                  className="bg-muted hover:bg-muted/70 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                  title={v.label}
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1 size-4" />
            {saving ? "Saving…" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
