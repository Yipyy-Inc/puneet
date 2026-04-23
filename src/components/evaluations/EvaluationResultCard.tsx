"use client";

import {
  CheckCircle2,
  XCircle,
  PawPrint,
  User,
  Calendar,
  Zap,
  Heart,
  Users,
  Tag,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  EvaluationReportCardConfig,
  ReportCardBrandConfig,
} from "@/types/facility";
import { ReportCardBrandedHeader } from "@/components/shared/ReportCardBrandedHeader";
import { ReportCardBrandedFooter } from "@/components/shared/ReportCardBrandedFooter";
import { businessProfile } from "@/data/settings";

export interface EvaluationResultCardData {
  petName: string;
  ownerName: string;
  facilityName: string;
  evaluatorName?: string;
  evaluationDate?: string;
  result: "pass" | "fail";
  resultLabel?: string;
  denialReason?: string;
  denialNotes?: string;
  // Temperament
  dogFriendly?: "yes" | "no";
  humanFriendly?: "yes" | "no";
  energyLevel?: string;
  anxietyLevel?: string;
  reactivity?: string;
  // Play
  playStyle?: string;
  playGroup?: string;
  // Tags
  behaviorTags?: string[];
  // Notes (public version)
  staffNotes?: string;
  // Approved services
  approvedServices?: {
    daycare?: boolean;
    boarding?: boolean;
    customApproved?: string[];
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function LevelIndicator({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  if (!value) return null;
  const color =
    value === "low"
      ? "text-emerald-600 bg-emerald-50"
      : value === "medium"
        ? "text-amber-600 bg-amber-50"
        : "text-rose-600 bg-rose-50";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", color)}
      >
        {capitalize(value)}
      </span>
    </div>
  );
}

interface EvaluationResultCardProps {
  data: EvaluationResultCardData;
  config: EvaluationReportCardConfig;
  brandConfig?: ReportCardBrandConfig;
  className?: string;
}

export function EvaluationResultCard({
  data,
  config,
  brandConfig,
  className,
}: EvaluationResultCardProps) {
  const passed = data.result === "pass";
  const resultLabel = data.resultLabel ?? (passed ? "Passed" : "Not Approved");
  const hasBranding = !!brandConfig;

  const approvedList = [
    ...(data.approvedServices?.daycare ? ["Daycare"] : []),
    ...(data.approvedServices?.boarding ? ["Boarding"] : []),
    ...(data.approvedServices?.customApproved ?? []),
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        className,
      )}
    >
      {/* Header band */}
      <div
        className={cn(
          passed
            ? "border-b border-emerald-100 bg-emerald-50"
            : "border-b border-rose-100 bg-rose-50",
        )}
      >
        {hasBranding ? (
          <div>
            <ReportCardBrandedHeader
              brandConfig={brandConfig}
              profile={businessProfile}
              title={`${data.petName}'s Evaluation`}
              subtitle={
                data.evaluationDate
                  ? new Date(data.evaluationDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : undefined
              }
              accentColor={passed ? "#059669" : "#e11d48"}
            />
            <div className="flex justify-center pb-3">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                  passed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {passed ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {resultLabel}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  passed ? "bg-emerald-100" : "bg-rose-100",
                )}
              >
                <PawPrint
                  className={cn(
                    "size-5",
                    passed ? "text-emerald-600" : "text-rose-600",
                  )}
                />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  {data.facilityName}
                </p>
                <h2 className="text-lg font-bold text-gray-900">
                  {data.petName}&apos;s Evaluation
                </h2>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                passed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700",
              )}
            >
              {passed ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              {resultLabel}
            </div>
          </div>
        )}

        {config.headerMessage && (
          <p className="mt-3 text-sm text-gray-600">{config.headerMessage}</p>
        )}
      </div>

      {/* Body */}
      <div className="divide-y px-6">
        {/* Meta */}
        {(config.showEvaluatorName || config.showEvaluationDate) && (
          <div className="flex flex-wrap gap-4 py-4">
            {config.showEvaluationDate && data.evaluationDate && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="text-muted-foreground size-3.5" />
                {new Date(data.evaluationDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
            {config.showEvaluatorName && data.evaluatorName && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <User className="text-muted-foreground size-3.5" />
                Evaluated by{" "}
                <span className="font-medium">{data.evaluatorName}</span>
              </div>
            )}
          </div>
        )}

        {/* Result message */}
        <div className="py-4">
          <p className="text-sm/relaxed text-gray-700">
            {passed ? config.passMessage : config.failMessage}
          </p>
        </div>

        {!passed && (data.denialReason || data.denialNotes) && (
          <div className="py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <XCircle className="text-muted-foreground size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Review Outcome
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-rose-100 bg-rose-50/60 p-3">
              {data.denialReason && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium text-rose-700">
                    {data.denialReason}
                  </span>
                </div>
              )}
              {data.denialNotes && (
                <p className="text-sm/relaxed text-gray-700">
                  {data.denialNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Temperament */}
        {config.showTemperament && (
          <div className="py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Heart className="text-muted-foreground size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Temperament
              </p>
            </div>
            <div className="space-y-1.5">
              {data.dogFriendly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dog-friendly</span>
                  <Badge
                    variant={
                      data.dogFriendly === "yes" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {capitalize(data.dogFriendly)}
                  </Badge>
                </div>
              )}
              {data.humanFriendly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Human-friendly</span>
                  <Badge
                    variant={
                      data.humanFriendly === "yes" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {capitalize(data.humanFriendly)}
                  </Badge>
                </div>
              )}
              <LevelIndicator label="Energy" value={data.energyLevel} />
              <LevelIndicator label="Anxiety" value={data.anxietyLevel} />
              <LevelIndicator label="Reactivity" value={data.reactivity} />
            </div>
          </div>
        )}

        {/* Play */}
        {(config.showPlayStyle || config.showPlayGroup) && (
          <div className="py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Zap className="text-muted-foreground size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Play Profile
              </p>
            </div>
            <div className="space-y-1.5">
              {config.showPlayStyle && data.playStyle && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Play style</span>
                  <span className="font-medium">
                    {capitalize(data.playStyle)}
                  </span>
                </div>
              )}
              {config.showPlayGroup && data.playGroup && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Play group</span>
                  <span className="font-medium">
                    {data.playGroup === "solo"
                      ? "Solo / Separate"
                      : capitalize(data.playGroup) + " Dogs"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Behavior tags */}
        {config.showBehaviorTags &&
          data.behaviorTags &&
          data.behaviorTags.length > 0 && (
            <div className="py-4">
              <div className="mb-2 flex items-center gap-1.5">
                <Tag className="text-muted-foreground size-3.5" />
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Behavior Tags
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.behaviorTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        {/* Staff notes */}
        {config.showStaffNotes && data.staffNotes && (
          <div className="py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <FileText className="text-muted-foreground size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Staff Notes
              </p>
            </div>
            <p className="text-sm/relaxed text-gray-700 italic">
              &ldquo;{data.staffNotes}&rdquo;
            </p>
          </div>
        )}

        {/* Approved services */}
        {config.showApprovedServices && passed && approvedList.length > 0 && (
          <div className="py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldCheck className="text-muted-foreground size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Services Unlocked
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {approvedList.map((svc) => (
                <div
                  key={svc}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {svc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        {config.footerNote && (
          <div className="py-4">
            <div className="flex items-start gap-2">
              <Users className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <p className="text-muted-foreground text-xs/relaxed">
                {config.footerNote}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Branded footer */}
      {hasBranding && (
        <div className="border-t">
          <ReportCardBrandedFooter
            brandConfig={brandConfig}
            profile={businessProfile}
            accentColor={passed ? "#059669" : "#e11d48"}
          />
        </div>
      )}
    </div>
  );
}
