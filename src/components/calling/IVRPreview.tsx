"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayCircle, Square, Volume2, Phone, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IVRConfig, IVRNode, IVRAction } from "@/types/calling";

const ACTION_LABEL: Record<IVRAction, string> = {
  route_staff: "Route to staff",
  route_department: "Route to department",
  route_voicemail: "Send to voicemail",
  play_recording: "Play recording",
  send_sms: "Send SMS link",
  submenu: "Sub-menu",
  route_operator: "Route to operator",
};

// Browser text-to-speech — stands in for the Twilio TTS that renders prompts
// in production. Plays the audio in the browser so staff can hear it.
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// What the caller hears after pressing this option's key.
function nodePrompt(node: IVRNode): string {
  switch (node.action) {
    case "play_recording":
      return node.message ?? `${node.label}.`;
    case "send_sms":
      return node.smsText
        ? `Sending you a text now. ${node.smsText}`
        : `We've just sent you a text with a link for ${node.label}.`;
    case "route_voicemail":
      return `Please leave a message after the tone for ${node.label}.`;
    case "route_operator":
      return `Connecting you to an operator${node.destination ? ` — ${node.destination}` : ""}. Please hold.`;
    case "submenu":
      return `${node.label}. Please listen to the following options.`;
    default:
      return `Connecting you to ${node.destination || node.label}. Please hold.`;
  }
}

export function IVRPreview({
  config,
  className,
}: {
  config: IVRConfig;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Stop any audio when the dialog closes or the component unmounts.
  useEffect(() => {
    if (!open) stopSpeaking();
    return () => stopSpeaking();
  }, [open]);

  const sortedNodes = [...config.nodes].sort((a, b) => {
    const order = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "*", "#"];
    return order.indexOf(a.key) - order.indexOf(b.key);
  });

  const play = (id: string, text: string) => {
    setActive(id);
    speak(text, () => setActive((cur) => (cur === id ? null : cur)));
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <PlayCircle className="size-4" />
        Preview IVR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] min-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-sky-600" />
              IVR Preview
            </DialogTitle>
            <DialogDescription>
              Read-only simulation — nothing is saved. Audio uses your browser&apos;s
              text-to-speech (Twilio TTS in production).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Greeting (menu root) */}
            <div className="rounded-xl border bg-card p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Main greeting
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={active === "greeting" ? "default" : "outline"}
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => play("greeting", config.greeting)}
                >
                  {active === "greeting" ? <Volume2 className="size-3.5" /> : <PlayCircle className="size-3.5" />}
                  {active === "greeting" ? "Playing…" : "Play"}
                </Button>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{config.greeting}</p>
            </div>

            {/* Interactive menu tree */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Menu — click an option to hear what the caller hears
              </p>
              <div className="space-y-1.5 border-l-2 border-dashed border-border pl-3">
                {sortedNodes.map((node) => {
                  const isActive = active === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => play(node.id, nodePrompt(node))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50",
                        isActive && "border-sky-400 ring-1 ring-sky-300",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        {node.key}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{node.label}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {ACTION_LABEL[node.action]}
                          {node.destination ? ` · ${node.destination}` : ""}
                        </span>
                      </span>
                      {isActive ? (
                        <Volume2 className="size-4 shrink-0 text-sky-600" />
                      ) : (
                        <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
                {sortedNodes.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">No menu options configured.</p>
                )}
              </div>
            </div>

            {/* After-hours greeting */}
            {config.afterHoursMessage && (
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    After-hours greeting
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant={active === "afterhours" ? "default" : "outline"}
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => play("afterhours", config.afterHoursMessage ?? "")}
                  >
                    {active === "afterhours" ? <Volume2 className="size-3.5" /> : <PlayCircle className="size-3.5" />}
                    {active === "afterhours" ? "Playing…" : "Play"}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{config.afterHoursMessage}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3.5" />
                Preview only — your IVR changes are not saved.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  stopSpeaking();
                  setActive(null);
                }}
              >
                <Square className="size-3.5" />
                Stop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
