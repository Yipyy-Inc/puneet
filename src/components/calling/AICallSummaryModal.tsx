"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Syringe,
  Dog,
  AlertCircle,
  ShoppingBag,
  UserCheck,
  BookmarkCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AICallSummary } from "@/types/calling";

interface AICallSummaryModalProps {
  summary: AICallSummary;
  clientName?: string;
  onSave: (summary: AICallSummary) => void;
  onClose: () => void;
}

function SentimentGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7 ? "bg-green-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  const label =
    score >= 8 ? "Very Positive" : score >= 6 ? "Positive" : score >= 4 ? "Neutral" : score >= 2 ? "Frustrated" : "Very Upset";
  const Icon =
    score >= 6 ? TrendingUp : score >= 4 ? Minus : TrendingDown;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-semibold">Sentiment Score</span>
        <span className={cn("flex items-center gap-1 font-bold", score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-600")}>
          <Icon className="size-4" />
          {score.toFixed(1)} / 10 — {label}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-3 rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const riskConfig: Record<
  AICallSummary["riskFlag"],
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  none: { label: "No Risk", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
  angry_client: { label: "Angry Client", color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle },
  refund_risk: { label: "Refund Risk", color: "text-orange-600 bg-orange-50 border-orange-200", icon: AlertCircle },
  churn_risk: { label: "Churn Risk", color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertCircle },
};

export function AICallSummaryModal({
  summary: initialSummary,
  clientName,
  onSave,
  onClose,
}: AICallSummaryModalProps) {
  const [summary, setSummary] = useState<AICallSummary>(initialSummary);
  const [assignedTo, setAssignedTo] = useState(summary.assignedTo ?? "");
  const risk = riskConfig[summary.riskFlag];
  const RiskIcon = risk.icon;

  const handleSave = () => {
    onSave({ ...summary, assignedTo: assignedTo || undefined });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Zap className="size-5 text-primary" />
          AI Call Summary
        </DialogTitle>
        <DialogDescription>
          {clientName && <span className="font-medium text-foreground">{clientName} · </span>}
          Generated {new Date(summary.generatedAt).toLocaleString([], {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Sentiment + Risk */}
        <div className="rounded-xl border p-4 space-y-3">
          <SentimentGauge score={summary.sentimentScore} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Risk Flag:</span>
            <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", risk.color)}>
              <RiskIcon className="size-3.5" />
              {risk.label}
            </span>
          </div>
        </div>

        {/* Call Reason */}
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <AlertCircle className="size-4 text-blue-500" />
            Call Reason
          </Label>
          <Textarea
            rows={2}
            className="text-sm"
            value={summary.callReason}
            onChange={(e) => setSummary((s) => ({ ...s, callReason: e.target.value }))}
          />
        </div>

        {/* Dynamic detail rows */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.appointmentRequest && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">
                <Calendar className="size-3.5" />
                Appointment Request
              </p>
              <p className="text-sm">{summary.appointmentRequest}</p>
            </div>
          )}
          {summary.vaccinationDiscussion && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-600">
                <Syringe className="size-3.5" />
                Vaccinations
              </p>
              <p className="text-sm">{summary.vaccinationDiscussion}</p>
            </div>
          )}
          {summary.specialCareNotes && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-600">
                <Dog className="size-3.5" />
                Special Care Notes
              </p>
              <p className="text-sm">{summary.specialCareNotes}</p>
            </div>
          )}
          {summary.behaviorAlerts && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                <AlertTriangle className="size-3.5" />
                Behavior Alerts
              </p>
              <p className="text-sm">{summary.behaviorAlerts}</p>
            </div>
          )}
        </div>

        {/* Upsell opportunities */}
        {summary.upsellOpportunities.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ShoppingBag className="size-4 text-teal-600" />
              Upsell Opportunities
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.upsellOpportunities.map((opp) => (
                <Badge key={opp} variant="secondary" className="gap-1 text-xs">
                  <TrendingUp className="size-3 text-teal-600" />
                  {opp}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up task */}
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <BookmarkCheck className="size-4 text-primary" />
            Follow-Up Task
          </Label>
          <Textarea
            rows={2}
            className="text-sm"
            placeholder="Describe the follow-up action needed…"
            value={summary.followUpTask ?? ""}
            onChange={(e) => setSummary((s) => ({ ...s, followUpTask: e.target.value }))}
          />
        </div>

        {/* Assign to */}
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <UserCheck className="size-4 text-muted-foreground" />
            Assign Follow-Up To
          </Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select staff member…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sarah M.">Sarah M. — Reception</SelectItem>
              <SelectItem value="James K.">James K. — Reception</SelectItem>
              <SelectItem value="Priya N.">Priya N. — Grooming</SelectItem>
              <SelectItem value="Manager – Sophie R.">Manager – Sophie R.</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Save for Later
        </Button>
        <Button onClick={handleSave} className="gap-2">
          <CheckCircle2 className="size-4" />
          Save to Client Profile
        </Button>
      </DialogFooter>
    </>
  );
}
