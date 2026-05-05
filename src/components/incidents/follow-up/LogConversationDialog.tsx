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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  PhoneOff,
  Smile,
  Meh,
  Frown,
  ThumbsUp,
  ThumbsDown,
  Plus,
  X,
  Tag,
  ListChecks,
} from "lucide-react";
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
  /** Conversation entries from earlier protocol steps for this incident. */
  priorEntries?: {
    entry: FollowUpConversationEntry;
    sourceTask: FollowUpTask;
  }[];
}

const CONTACT_METHODS: { value: ContactMethod; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS / text" },
  { value: "in_person", label: "In person" },
  { value: "video_call", label: "Video call" },
  { value: "other", label: "Other" },
];

const SENTIMENTS: {
  value: CustomerSentiment;
  label: string;
  icon: typeof Smile;
  color: string;
}[] = [
  { value: "positive", label: "Positive", icon: ThumbsUp, color: "text-green-600 border-green-300 bg-green-50" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "text-slate-600 border-slate-300 bg-slate-50" },
  { value: "concerned", label: "Concerned", icon: Frown, color: "text-amber-600 border-amber-300 bg-amber-50" },
  { value: "upset", label: "Upset", icon: ThumbsDown, color: "text-red-600 border-red-300 bg-red-50" },
  { value: "unreachable", label: "Couldn't reach", icon: PhoneOff, color: "text-slate-500 border-slate-300 bg-slate-50" },
];

export function LogConversationDialog({
  task,
  loggedBy,
  onSave,
  onCancel,
  priorEntries = [],
}: LogConversationDialogProps) {
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    task.contactMethod ?? "phone",
  );
  const [reachedClient, setReachedClient] = useState(true);
  const [summary, setSummary] = useState("");
  const [customerStatement, setCustomerStatement] = useState("");
  const [staffResponse, setStaffResponse] = useState("");
  const [sentiment, setSentiment] = useState<CustomerSentiment>("neutral");
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [customerRequests, setCustomerRequests] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, string>
  >({});

  const handleAddTopic = () => {
    const t = newTopic.trim();
    if (!t || topics.includes(t)) return;
    setTopics([...topics, t]);
    setNewTopic("");
  };

  const handleRemoveTopic = (t: string) => {
    setTopics(topics.filter((x) => x !== t));
  };

  const handleSave = () => {
    // If question answers were filled in, append them to the customer statement
    let mergedStatement = customerStatement;
    const answeredQuestions = Object.entries(questionAnswers).filter(
      ([, v]) => v.trim().length > 0,
    );
    if (answeredQuestions.length > 0) {
      const qaSection = answeredQuestions
        .map(([idx, ans]) => {
          const q = task.questionsToAsk?.[Number(idx)] ?? "";
          return `Q: ${q}\nA: ${ans}`;
        })
        .join("\n\n");
      mergedStatement = mergedStatement
        ? `${mergedStatement}\n\n— Q&A —\n${qaSection}`
        : qaSection;
    }

    const entry: FollowUpConversationEntry = {
      id: `conv-${Date.now()}`,
      loggedAt: new Date().toISOString(),
      loggedBy,
      contactMethod,
      reachedClient,
      summary: summary.trim(),
      customerStatement: mergedStatement.trim(),
      staffResponse: staffResponse.trim(),
      sentiment: reachedClient ? sentiment : "unreachable",
      topics,
      customerRequests: customerRequests.trim() || undefined,
      nextSteps: nextSteps.trim() || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
    };
    onSave(entry);
  };

  const isValid = summary.trim().length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageSquare className="text-primary size-5" />
          Log Customer Conversation
        </DialogTitle>
        <DialogDescription>
          Capture what was said. The next person doing follow-up will read this
          first.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Task context */}
        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-900/10">
          <CardContent className="py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              {task.protocolName ?? "Follow-Up Task"}
              {task.stepOrder ? ` · Step ${task.stepOrder}` : ""}
            </p>
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {task.description}
            </p>
          </CardContent>
        </Card>

        {/* Briefing — earlier conversations on this same incident */}
        {priorEntries.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/10">
            <CardContent className="space-y-2.5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Read first — what was already said
              </p>
              <p className="text-amber-800 text-[11px] dark:text-amber-300">
                {priorEntries.length} prior conversation
                {priorEntries.length === 1 ? "" : "s"} from earlier follow-up
                steps. Reference these so you don&apos;t repeat questions or
                contradict promises.
              </p>
              <div className="space-y-2">
                {priorEntries.map(({ entry, sourceTask }, idx) => {
                  const when = new Date(entry.loggedAt);
                  return (
                    <div
                      key={entry.id}
                      className="bg-background rounded-md border border-amber-100 p-2.5 dark:border-amber-900/50"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                        <span className="bg-amber-100 text-amber-900 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold dark:bg-amber-900/50 dark:text-amber-200">
                          {idx + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-[10px]"
                        >
                          Step {sourceTask.stepOrder ?? "?"}: {sourceTask.title}
                        </Badge>
                        <span className="text-muted-foreground">
                          {when.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" · "}
                          {when.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          by{" "}
                          <strong className="text-foreground">
                            {entry.loggedBy}
                          </strong>
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">
                        {entry.summary}
                      </p>
                      {entry.customerStatement && (
                        <p className="text-muted-foreground mt-1 text-[11px] line-clamp-3 whitespace-pre-wrap">
                          <span className="font-semibold">Customer:</span>{" "}
                          {entry.customerStatement}
                        </p>
                      )}
                      {entry.nextSteps && (
                        <p className="text-purple-700 mt-1 text-[11px] dark:text-purple-300">
                          <span className="font-semibold">We promised:</span>{" "}
                          {entry.nextSteps}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Method + reached */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Contact Method</Label>
            <Select
              value={contactMethod}
              onValueChange={(v) => setContactMethod(v as ContactMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Outcome</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
              <Checkbox
                checked={reachedClient}
                onCheckedChange={(v) => setReachedClient(Boolean(v))}
              />
              <span className="text-sm">
                {reachedClient
                  ? "Reached customer"
                  : "Did not reach — left voicemail / no answer"}
              </span>
            </div>
          </div>
        </div>

        {reachedClient && (
          <>
            {/* Sentiment selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Customer mood</Label>
              <div className="grid grid-cols-4 gap-2">
                {SENTIMENTS.filter((s) => s.value !== "unreachable").map(
                  (s) => {
                    const Icon = s.icon;
                    const active = sentiment === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSentiment(s.value)}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-xs font-medium transition-colors ${
                          active
                            ? s.color
                            : "border-input text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="size-4" />
                        {s.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Question prompts */}
            {task.questionsToAsk && task.questionsToAsk.length > 0 && (
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2">
                    <ListChecks className="size-4 text-blue-600" />
                    <Label className="text-sm font-semibold">
                      Questions for this step
                    </Label>
                    <Badge variant="secondary" className="text-[10px]">
                      Optional — fill what was answered
                    </Badge>
                  </div>
                  <div className="space-y-2.5">
                    {task.questionsToAsk.map((q, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <p className="text-sm font-medium">
                          <span className="text-muted-foreground mr-1.5">
                            {idx + 1}.
                          </span>
                          {q}
                        </p>
                        <Input
                          value={questionAnswers[idx] ?? ""}
                          onChange={(e) =>
                            setQuestionAnswers({
                              ...questionAnswers,
                              [idx]: e.target.value,
                            })
                          }
                          placeholder="Customer's answer..."
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Summary - always required */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Conversation summary *
          </Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="In a sentence or two — how did the conversation go? What's the headline for the next person?"
            rows={2}
          />
        </div>

        {reachedClient && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                What the customer said
              </Label>
              <Textarea
                value={customerStatement}
                onChange={(e) => setCustomerStatement(e.target.value)}
                placeholder="Verbatim quotes or paraphrased — anything they shared about their pet, the incident, their feelings, or context. The more detail the better."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                What you told them
              </Label>
              <Textarea
                value={staffResponse}
                onChange={(e) => setStaffResponse(e.target.value)}
                placeholder="Promises made, information shared, reassurances given. So the next staff member doesn't contradict you."
                rows={3}
              />
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="size-3.5" />
                Topics discussed
              </Label>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer gap-1"
                      onClick={() => handleRemoveTopic(t)}
                    >
                      {t}
                      <X className="size-3" />
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                  placeholder="e.g. recovery, vet visit, refund, anxiety"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTopic}
                  disabled={!newTopic.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Customer requests
                </Label>
                <Textarea
                  value={customerRequests}
                  onChange={(e) => setCustomerRequests(e.target.value)}
                  placeholder="Anything specific they asked us to do?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Next steps you committed to
                </Label>
                <Textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="What did you say you'd do next?"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Call duration (minutes)
              </Label>
              <Input
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Optional"
                className="w-32"
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          Save Log Entry
        </Button>
      </DialogFooter>
    </>
  );
}
