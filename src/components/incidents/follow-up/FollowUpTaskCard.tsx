"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckSquare,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Video,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ListChecks,
  PhoneOff,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  ThumbsDown,
  CalendarClock,
  Plus,
  PlayCircle,
  History,
  Calendar as CalendarIcon,
} from "lucide-react";
import type {
  ContactMethod,
  CustomerSentiment,
  FollowUpConversationEntry,
  FollowUpTask,
} from "@/types/incidents";
import { LogConversationDialog } from "./LogConversationDialog";

interface FollowUpTaskCardProps {
  task: FollowUpTask;
  onUpdate?: (next: FollowUpTask) => void;
  defaultExpanded?: boolean;
  currentUser?: string;
  /**
   * Sibling tasks from the same incident, in protocol order.
   * Used to surface the running history of previous follow-up
   * conversations on later tasks so the staff member calling
   * today knows what was already said and by whom.
   */
  siblingTasks?: FollowUpTask[];
}

const CONTACT_ICONS: Record<ContactMethod, typeof Phone> = {
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
  in_person: Users,
  video_call: Video,
  other: ArrowUpRight,
};

const SENTIMENT_META: Record<
  CustomerSentiment,
  { icon: typeof Smile; color: string; label: string }
> = {
  positive: {
    icon: ThumbsUp,
    color: "text-green-600 bg-green-50 border-green-200",
    label: "Positive",
  },
  neutral: {
    icon: Meh,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    label: "Neutral",
  },
  concerned: {
    icon: Frown,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    label: "Concerned",
  },
  upset: {
    icon: ThumbsDown,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Upset",
  },
  unreachable: {
    icon: PhoneOff,
    color: "text-slate-500 bg-slate-50 border-slate-200",
    label: "Unreachable",
  },
};

export function FollowUpTaskCard({
  task,
  onUpdate,
  defaultExpanded,
  currentUser = "Current User",
  siblingTasks = [],
}: FollowUpTaskCardProps) {
  const [open, setOpen] = useState(defaultExpanded ?? false);
  const [logOpen, setLogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  const ContactIcon = task.contactMethod
    ? CONTACT_ICONS[task.contactMethod]
    : null;

  const due = new Date(task.dueDate);
  const now = new Date();
  const isOverdue = due < now && task.status !== "completed";
  const conversations = task.conversationLog ?? [];

  // ── Build "Previous Conversations" timeline from earlier steps ─────
  // Pull every conversation entry from sibling tasks whose stepOrder is
  // smaller than this task's, sort chronologically.
  const priorEntries = siblingTasks
    .filter(
      (t) =>
        t.id !== task.id &&
        task.stepOrder !== undefined &&
        t.stepOrder !== undefined &&
        t.stepOrder < task.stepOrder,
    )
    .flatMap((t) =>
      (t.conversationLog ?? []).map((entry) => ({
        entry,
        sourceTask: t,
      })),
    )
    .sort(
      (a, b) =>
        new Date(a.entry.loggedAt).getTime() -
        new Date(b.entry.loggedAt).getTime(),
    );

  const handleAddEntry = (entry: FollowUpConversationEntry) => {
    if (!onUpdate) {
      setLogOpen(false);
      return;
    }
    const nextLog = [...conversations, entry];
    const attemptCount = (task.attemptCount ?? 0) + 1;
    const reached = entry.reachedClient;

    let nextStatus = task.status;
    // If client reached & questions answered, mark complete; otherwise keep in-progress
    if (reached) nextStatus = "completed";
    else if (task.status === "pending") nextStatus = "in_progress";

    onUpdate({
      ...task,
      conversationLog: nextLog,
      attemptCount,
      status: nextStatus,
      completedDate:
        nextStatus === "completed" ? new Date().toISOString() : task.completedDate,
      completedBy:
        nextStatus === "completed" ? entry.loggedBy : task.completedBy,
      escalated:
        task.escalateAfterAttempts !== undefined &&
        !reached &&
        attemptCount >= task.escalateAfterAttempts,
    });
    setLogOpen(false);
  };

  const handleQuickStart = () => {
    if (!onUpdate || task.status !== "pending") return;
    onUpdate({ ...task, status: "in_progress" });
  };

  const handleMarkComplete = () => {
    if (!onUpdate) return;
    onUpdate({
      ...task,
      status: "completed",
      completedDate: new Date().toISOString(),
      completedBy: currentUser,
    });
  };

  const statusBadge = (() => {
    switch (task.status) {
      case "completed":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="size-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" /> In progress
          </Badge>
        );
      case "skipped":
        return (
          <Badge variant="outline" className="gap-1">
            Skipped
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={isOverdue ? "border-red-300 bg-red-50 text-red-700" : ""}
          >
            <AlertCircle className="mr-1 size-3" />
            {isOverdue ? "Overdue" : "Pending"}
          </Badge>
        );
    }
  })();

  return (
    <>
      <Card
        className={
          task.escalated
            ? "border-red-300 ring-1 ring-red-200"
            : isOverdue
              ? "border-amber-300"
              : ""
        }
      >
        <CardContent className="p-4">
          <Collapsible open={open} onOpenChange={setOpen}>
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                {ContactIcon ? (
                  <ContactIcon className="size-4" />
                ) : (
                  <CheckSquare className="size-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {task.protocolName && (
                    <Badge variant="outline" className="text-[10px]">
                      {task.protocolName}
                      {task.stepOrder ? ` · #${task.stepOrder}` : ""}
                    </Badge>
                  )}
                  {statusBadge}
                  {task.escalated && (
                    <Badge variant="destructive" className="text-[10px]">
                      Escalated
                    </Badge>
                  )}
                </div>
                <h4 className="mt-1 text-sm font-semibold">{task.title}</h4>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {task.description}
                </p>

                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {task.assignedTo}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      isOverdue ? "font-semibold text-red-600" : ""
                    }`}
                  >
                    <CalendarClock className="size-3" />
                    Due {due.toLocaleString()}
                  </span>
                  {task.contactMethod && (
                    <span className="flex items-center gap-1 capitalize">
                      via {task.contactMethod.replace("_", " ")}
                    </span>
                  )}
                  {conversations.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {conversations.length} conversation
                      {conversations.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {(task.attemptCount ?? 0) > 0 && (
                    <span>
                      {task.attemptCount} attempt
                      {task.attemptCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            {/* Quick action row */}
            {task.status !== "completed" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setLogOpen(true)}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Log Conversation
                </Button>
                {task.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickStart}
                  >
                    <PlayCircle className="mr-1.5 size-3.5" />
                    Start
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Mark Complete
                </Button>
              </div>
            )}

            {/* Expandable detail */}
            <CollapsibleContent className="mt-4 space-y-4 border-t pt-4">
              {/* Previous follow-up history (from earlier steps) */}
              {priorEntries.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/10">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <History className="size-4 text-amber-700 dark:text-amber-400" />
                    <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      Previous Conversations
                    </p>
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-white text-[10px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {priorEntries.length} entr
                      {priorEntries.length === 1 ? "y" : "ies"} from{" "}
                      {new Set(priorEntries.map((p) => p.sourceTask.id)).size}{" "}
                      step
                      {new Set(priorEntries.map((p) => p.sourceTask.id))
                        .size === 1
                        ? ""
                        : "s"}
                    </Badge>
                    <ChevronDown
                      className={`size-4 text-amber-700 transition-transform ${
                        historyOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {historyOpen && (
                    <div className="space-y-2 border-t border-amber-200 px-3 py-3 dark:border-amber-900">
                      <p className="text-amber-800 text-[11px] dark:text-amber-300">
                        Read this before calling — what was already said, by
                        whom, and on what date.
                      </p>
                      {priorEntries.map(({ entry, sourceTask }, idx) => (
                        <PriorConversationItem
                          key={entry.id}
                          entry={entry}
                          sourceTask={sourceTask}
                          index={idx + 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              {task.instructions && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-wide">
                    Procedure
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {task.instructions}
                  </p>
                </div>
              )}

              {/* Questions */}
              {task.questionsToAsk && task.questionsToAsk.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-900/10">
                  <div className="mb-2 flex items-center gap-2">
                    <ListChecks className="size-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      Questions to ask
                    </p>
                  </div>
                  <ol className="ml-4 list-decimal space-y-1 text-sm">
                    {task.questionsToAsk.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Conversation log */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Conversation History
                  </p>
                  {task.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLogOpen(true)}
                      className="h-7"
                    >
                      <Plus className="mr-1 size-3.5" />
                      New entry
                    </Button>
                  )}
                </div>
                {conversations.length === 0 ? (
                  <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
                    No conversation logged yet. Click &ldquo;Log Conversation&rdquo;
                    after talking with the customer.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <ConversationEntryCard
                          key={entry.id}
                          entry={entry}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Completion footer */}
              {task.completedDate && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs dark:bg-green-900/20">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>
                    Completed by{" "}
                    <strong>{task.completedBy ?? "Unknown"}</strong> on{" "}
                    {new Date(task.completedDate).toLocaleString()}
                  </span>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Log dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-h-[90vh] min-w-3xl overflow-y-auto">
          <LogConversationDialog
            task={task}
            loggedBy={currentUser}
            priorEntries={priorEntries}
            onSave={handleAddEntry}
            onCancel={() => setLogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Prior conversation item (compact, read-only timeline entry) ──

function PriorConversationItem({
  entry,
  sourceTask,
  index,
}: {
  entry: FollowUpConversationEntry;
  sourceTask: FollowUpTask;
  index: number;
}) {
  const ContactIcon = CONTACT_ICONS[entry.contactMethod] ?? ArrowUpRight;
  const sentimentMeta = SENTIMENT_META[entry.sentiment];
  const SentimentIcon = sentimentMeta.icon;
  const loggedDate = new Date(entry.loggedAt);

  return (
    <div className="bg-background space-y-2 rounded-md border border-amber-100 p-2.5 dark:border-amber-900/50">
      {/* Step + when + who */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="bg-amber-100 text-amber-900 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold dark:bg-amber-900/50 dark:text-amber-200">
          {index}
        </span>
        <Badge variant="outline" className="border-amber-300 text-[10px]">
          Step {sourceTask.stepOrder ?? "?"}: {sourceTask.title}
        </Badge>
        <span className="text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {loggedDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" · "}
          {loggedDate.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="text-muted-foreground">
          by <strong className="text-foreground">{entry.loggedBy}</strong>
        </span>
        <span className="bg-muted ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5">
          <ContactIcon className="size-3" />
          <span className="capitalize">
            {entry.contactMethod.replace("_", " ")}
          </span>
        </span>
        <Badge
          variant="outline"
          className={`gap-1 text-[10px] ${sentimentMeta.color}`}
        >
          <SentimentIcon className="size-3" />
          {sentimentMeta.label}
        </Badge>
      </div>

      {/* Headline summary */}
      <p className="text-sm font-medium">{entry.summary}</p>

      {/* Topics */}
      {entry.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.topics.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* The exchange — what customer said + what we said */}
      {entry.customerStatement && (
        <div className="rounded-md border-l-2 border-blue-300 bg-blue-50/60 px-2.5 py-1.5 text-[11px] dark:bg-blue-900/10">
          <p className="text-muted-foreground mb-0.5 font-semibold">
            Customer said
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">
            {entry.customerStatement}
          </p>
        </div>
      )}
      {entry.staffResponse && (
        <div className="rounded-md border-l-2 border-emerald-300 bg-emerald-50/60 px-2.5 py-1.5 text-[11px] dark:bg-emerald-900/10">
          <p className="text-muted-foreground mb-0.5 font-semibold">
            We told them
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">
            {entry.staffResponse}
          </p>
        </div>
      )}

      {/* Commitments — what carries forward to this call */}
      {(entry.customerRequests || entry.nextSteps) && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {entry.customerRequests && (
            <div className="bg-amber-50 rounded-md p-1.5 text-[11px] dark:bg-amber-900/30">
              <p className="text-muted-foreground mb-0.5 font-semibold">
                They asked us to
              </p>
              <p className="whitespace-pre-wrap">{entry.customerRequests}</p>
            </div>
          )}
          {entry.nextSteps && (
            <div className="bg-purple-50 rounded-md p-1.5 text-[11px] dark:bg-purple-900/30">
              <p className="text-muted-foreground mb-0.5 font-semibold">
                We promised
              </p>
              <p className="whitespace-pre-wrap">{entry.nextSteps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Conversation entry card ──────────────────────────────────────

function ConversationEntryCard({
  entry,
}: {
  entry: FollowUpConversationEntry;
}) {
  const ContactIcon = CONTACT_ICONS[entry.contactMethod] ?? ArrowUpRight;
  const sentimentMeta = SENTIMENT_META[entry.sentiment];
  const SentimentIcon = sentimentMeta.icon;

  return (
    <div className="bg-background space-y-2.5 rounded-lg border p-3">
      {/* Top meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5">
          <ContactIcon className="size-3" />
          <span className="capitalize">
            {entry.contactMethod.replace("_", " ")}
          </span>
        </span>
        <Badge
          variant="outline"
          className={`gap-1 ${sentimentMeta.color}`}
        >
          <SentimentIcon className="size-3" />
          {sentimentMeta.label}
        </Badge>
        <span className="text-muted-foreground">
          by <strong className="text-foreground">{entry.loggedBy}</strong>
        </span>
        <span className="text-muted-foreground">
          {new Date(entry.loggedAt).toLocaleString()}
        </span>
        {entry.durationMinutes !== undefined && (
          <span className="text-muted-foreground">
            {entry.durationMinutes} min
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm font-medium">{entry.summary}</p>

      {/* Topic tags */}
      {entry.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.topics.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Customer / staff exchange */}
      {entry.customerStatement && (
        <div className="rounded-md border-l-2 border-blue-300 bg-blue-50/50 px-3 py-2 text-xs dark:bg-blue-900/10">
          <p className="text-muted-foreground mb-1 font-semibold">
            Customer said
          </p>
          <p className="whitespace-pre-wrap">{entry.customerStatement}</p>
        </div>
      )}
      {entry.staffResponse && (
        <div className="rounded-md border-l-2 border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs dark:bg-emerald-900/10">
          <p className="text-muted-foreground mb-1 font-semibold">
            Staff response
          </p>
          <p className="whitespace-pre-wrap">{entry.staffResponse}</p>
        </div>
      )}

      {/* Requests + next steps */}
      {(entry.customerRequests || entry.nextSteps) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {entry.customerRequests && (
            <div className="bg-amber-50 rounded-md p-2 text-xs dark:bg-amber-900/20">
              <p className="text-muted-foreground mb-0.5 font-semibold">
                Customer requested
              </p>
              <p className="whitespace-pre-wrap">{entry.customerRequests}</p>
            </div>
          )}
          {entry.nextSteps && (
            <div className="bg-purple-50 rounded-md p-2 text-xs dark:bg-purple-900/20">
              <p className="text-muted-foreground mb-0.5 font-semibold">
                We committed to
              </p>
              <p className="whitespace-pre-wrap">{entry.nextSteps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
