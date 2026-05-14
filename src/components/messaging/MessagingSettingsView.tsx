"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Smartphone,
  Mail,
  Clock,
  Ban,
  ShieldCheck,
  AlertTriangle,
  Bookmark,
  Plus,
  Pencil,
  Trash2,
  Hash,
  RefreshCw,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSavedReplies } from "./saved-replies-context";
import {
  SAVED_REPLY_CATEGORY_COLORS,
  SAVED_REPLY_CATEGORY_LABELS,
  type SavedReply,
  type SavedReplyCategory,
} from "@/types/saved-replies";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const CATEGORIES: SavedReplyCategory[] = [
  "boarding",
  "grooming",
  "daycare",
  "pricing",
  "general",
];

const DEFAULT_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  Monday: { open: "07:00", close: "19:00", closed: false },
  Tuesday: { open: "07:00", close: "19:00", closed: false },
  Wednesday: { open: "07:00", close: "19:00", closed: false },
  Thursday: { open: "07:00", close: "19:00", closed: false },
  Friday: { open: "07:00", close: "19:00", closed: false },
  Saturday: { open: "08:00", close: "17:00", closed: false },
  Sunday: { open: "08:00", close: "17:00", closed: true },
};

const STOP_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL", "QUIT", "END"];

// ── Saved-reply editor ───────────────────────────────────────────────

function SavedReplyEditor({
  reply,
  onSave,
  onClose,
}: {
  reply: SavedReply | null;
  onSave: (reply: SavedReply) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(reply?.title ?? "");
  const [shortcut, setShortcut] = useState(reply?.shortcut ?? "");
  const [body, setBody] = useState(reply?.body ?? "");
  const [category, setCategory] = useState<SavedReplyCategory>(
    reply?.category ?? "general",
  );

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    onSave({
      id: reply?.id ?? `sr-${Date.now()}`,
      title: title.trim(),
      shortcut:
        shortcut.trim() ||
        title.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24),
      body: body.trim(),
      category,
      createdAt: reply?.createdAt ?? new Date().toISOString(),
      useCount: reply?.useCount ?? 0,
      createdBy: reply?.createdBy ?? "You",
    });
  };

  return (
    <div className="space-y-3 p-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Boarding rates"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as SavedReplyCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {SAVED_REPLY_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Shortcut</Label>
        <Input
          value={shortcut}
          onChange={(e) =>
            setShortcut(e.target.value.replace(/\s+/g, "-").toLowerCase())
          }
          placeholder="boarding-rates"
        />
        <p className="text-[10px] text-slate-400">
          Staff types <code className="rounded bg-slate-100 px-1">/{shortcut || "shortcut"}</code>{" "}
          to insert this reply.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Reply body</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="resize-none text-sm"
          placeholder="Hi {ClientName}, …"
        />
        <p className="text-[10px] text-slate-400">
          Use <code className="rounded bg-slate-100 px-1">{`{ClientName}`}</code>{" "}
          and <code className="rounded bg-slate-100 px-1">{`{PetName}`}</code>{" "}
          to personalize.
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Save reply</Button>
      </div>
    </div>
  );
}

// ── Main settings view ───────────────────────────────────────────────

export function MessagingSettingsView() {
  const savedRepliesCtx = useSavedReplies();

  // Business identity
  const [businessPhone, setBusinessPhone] = useState("(514) 555-0100");
  const [smsSenderId, setSmsSenderId] = useState("DOGGIEVL");
  const [emailFrom, setEmailFrom] = useState("hello@doggieville.ca");

  // Auto-reply
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState(
    "Hi! We're closed right now, but we'll get back to you first thing in the morning. For urgent boarding matters, call (514) 555-0100.",
  );
  const [autoReplyAfterHoursOnly, setAutoReplyAfterHoursOnly] = useState(true);

  // Hours
  const [hours, setHours] = useState(DEFAULT_HOURS);

  // Opt-out
  const [stopHandlingEnabled, setStopHandlingEnabled] = useState(true);
  const [stopConfirmation, setStopConfirmation] = useState(
    "You have been unsubscribed from Doggieville MTL messages. Reply START to re-subscribe.",
  );
  const [optedOutNumbers, setOptedOutNumbers] = useState<
    Array<{ name: string; phone: string; optedOutAt: string }>
  >([
    {
      name: "Marie Tremblay",
      phone: "(514) 555-0182",
      optedOutAt: "2026-04-12T14:22:00Z",
    },
    {
      name: "Daniel Roy",
      phone: "(450) 555-0917",
      optedOutAt: "2026-03-28T09:05:00Z",
    },
  ]);

  const removeOptOut = (phone: string) => {
    setOptedOutNumbers((prev) => prev.filter((o) => o.phone !== phone));
    toast.success("Re-enabled SMS for this client");
  };

  // Saved replies UI state
  const [editingReply, setEditingReply] = useState<SavedReply | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SavedReplyCategory | "all">(
    "all",
  );

  const filteredReplies =
    categoryFilter === "all"
      ? savedRepliesCtx.replies
      : savedRepliesCtx.replies.filter((r) => r.category === categoryFilter);

  const updateHours = (
    day: string,
    patch: Partial<{ open: string; close: string; closed: boolean }>,
  ) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Messaging Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Business identity, auto-reply, opt-out handling, and saved replies — all
          in one place.
        </p>
      </div>

      {/* Business identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-4 text-blue-500" />
            Business identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Smartphone className="size-3" />
              Business phone (SMS sender)
            </Label>
            <Input
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
            />
            <p className="text-[10px] text-slate-400">
              Shown as "from" on outgoing SMS.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Hash className="size-3" />
              SMS sender ID
            </Label>
            <Input
              value={smsSenderId}
              onChange={(e) => setSmsSenderId(e.target.value.toUpperCase())}
              maxLength={11}
            />
            <p className="text-[10px] text-slate-400">
              {smsSenderId.length}/11 characters · alphanumeric
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Mail className="size-3" />
              Email "from" address
            </Label>
            <Input
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-reply */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-violet-500" />
              Auto-reply outside business hours
            </CardTitle>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={setAutoReplyEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Message clients receive</Label>
            <Textarea
              value={autoReplyMessage}
              onChange={(e) => setAutoReplyMessage(e.target.value)}
              rows={3}
              disabled={!autoReplyEnabled}
              className="resize-none text-sm"
            />
            <p className="text-[10px] text-slate-400">
              {autoReplyMessage.length} chars ·{" "}
              {Math.ceil(autoReplyMessage.length / 160) || 0} SMS segments · sends
              once per client per closed period
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Only send when closed
              </p>
              <p className="text-[11px] text-slate-400">
                Leave on so your team can reply manually during open hours.
              </p>
            </div>
            <Switch
              checked={autoReplyAfterHoursOnly}
              onCheckedChange={setAutoReplyAfterHoursOnly}
              disabled={!autoReplyEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-blue-500" />
            Business hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {DAYS.map((day, idx) => {
              const cfg = hours[day];
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm",
                    idx > 0 && "border-t border-slate-100",
                    cfg.closed && "bg-slate-50",
                  )}
                >
                  <span className="w-28 font-semibold text-slate-700">{day}</span>
                  {cfg.closed ? (
                    <span className="flex-1 text-xs text-slate-400">Closed</span>
                  ) : (
                    <>
                      <Input
                        type="time"
                        value={cfg.open}
                        onChange={(e) => updateHours(day, { open: e.target.value })}
                        className="h-8 w-28 text-xs"
                      />
                      <span className="text-slate-400">–</span>
                      <Input
                        type="time"
                        value={cfg.close}
                        onChange={(e) => updateHours(day, { close: e.target.value })}
                        className="h-8 w-28 text-xs"
                      />
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {cfg.closed ? "" : "Open"}
                    </span>
                    <Switch
                      checked={!cfg.closed}
                      onCheckedChange={(checked) => updateHours(day, { closed: !checked })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Saved replies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bookmark className="size-4 text-emerald-500" />
              Saved replies library
            </CardTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingReply(null);
                setShowEditor(true);
              }}
            >
              <Plus className="size-4" />
              New saved reply
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            Tip: staff type <code className="rounded bg-blue-100 px-1 font-semibold">/</code>{" "}
            in the compose box to bring up this menu instantly. They can also
            "Save as reply" from any message they've drafted.
          </div>

          <div className="mb-3 flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                categoryFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              All ({savedRepliesCtx.replies.length})
            </button>
            {CATEGORIES.map((c) => {
              const count = savedRepliesCtx.replies.filter((r) => r.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                    categoryFilter === c
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  )}
                >
                  {SAVED_REPLY_CATEGORY_LABELS[c]} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className="group rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          SAVED_REPLY_CATEGORY_COLORS[reply.category],
                        )}
                      >
                        {SAVED_REPLY_CATEGORY_LABELS[reply.category]}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {reply.title}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Hash className="size-2.5" />
                        {reply.shortcut}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                        <RefreshCw className="size-2.5" />
                        Used {reply.useCount}×
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                      {reply.body}
                    </p>
                    {reply.createdBy && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Added by {reply.createdBy}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-slate-400 hover:bg-slate-100"
                      onClick={() => {
                        navigator.clipboard.writeText(reply.body);
                        toast.success("Copied to clipboard");
                      }}
                      title="Copy"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => {
                        setEditingReply(reply);
                        setShowEditor(true);
                      }}
                      title="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        savedRepliesCtx.remove(reply.id);
                        toast.success("Saved reply deleted");
                      }}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredReplies.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <Bookmark className="mx-auto mb-3 size-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No saved replies in this category
                </p>
                <Button
                  variant="link"
                  className="mt-1 text-blue-600"
                  onClick={() => {
                    setEditingReply(null);
                    setShowEditor(true);
                  }}
                >
                  Create one
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Opt-out */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="size-4 text-red-500" />
              SMS opt-out (STOP) handling
            </CardTitle>
            <Switch
              checked={stopHandlingEnabled}
              onCheckedChange={setStopHandlingEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="size-4" />
              Compliant with TCPA / CASL
            </p>
            <p className="mt-1 text-[11px] text-emerald-700/80">
              Replying with any of these keywords automatically stops messaging
              this client. We log the timestamp and surface it on their profile.
            </p>
          </div>

          <div>
            <Label className="text-xs">Trigger keywords</Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {STOP_KEYWORDS.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Confirmation reply</Label>
            <Textarea
              value={stopConfirmation}
              onChange={(e) => setStopConfirmation(e.target.value)}
              rows={2}
              disabled={!stopHandlingEnabled}
              className="resize-none text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Currently opted out</Label>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {optedOutNumbers.length} client
                {optedOutNumbers.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1.5 space-y-1">
              {optedOutNumbers.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  No clients have opted out.
                </p>
              ) : (
                optedOutNumbers.map((o) => (
                  <div
                    key={o.phone}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {o.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {o.phone} · opted out{" "}
                        {new Date(o.optedOutAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-[10px] text-red-700"
                      >
                        Unsubscribed
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => removeOptOut(o.phone)}
                      >
                        <RefreshCw className="size-3" />
                        Re-enable
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Only re-enable if the client has explicitly asked to receive SMS
              again — keep written confirmation for compliance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMS credit autotop callout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            Credit & failure handling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <p>
            <strong>Auto-reload</strong> will purchase 500 credits ($20) when your
            balance drops below 100. Toggle this in Billing.
          </p>
          <p>
            <strong>Send failures</strong> are surfaced as red badges on the
            conversation row and in the Inbox banner so staff can retry or call
            instead.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={showEditor}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditor(false);
            setEditingReply(null);
          }
        }}
      >
        <DialogContent className="max-w-xl p-0">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingReply ? "Edit saved reply" : "New saved reply"}
            </h3>
          </div>
          <SavedReplyEditor
            reply={editingReply}
            onSave={(reply) => {
              if (editingReply) {
                savedRepliesCtx.update(reply);
                toast.success(`Saved "${reply.title}"`);
              } else {
                savedRepliesCtx.add(reply);
                toast.success(`Created "${reply.title}"`);
              }
              setShowEditor(false);
              setEditingReply(null);
            }}
            onClose={() => {
              setShowEditor(false);
              setEditingReply(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
