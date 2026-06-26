"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Mail, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DunningSequence } from "@/types/dunning";
import { formatDate, formatMoney } from "./dunning-utils";

interface DunningSequenceCardProps {
  sequence: DunningSequence;
  onSendNow: (sequence: DunningSequence) => void;
  onSuspend: (sequence: DunningSequence) => void;
}

export function DunningSequenceCard({
  sequence,
  onSendNow,
  onSuspend,
}: DunningSequenceCardProps) {
  const flagged = sequence.flaggedForSuspension;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-xs">
              {sequence.invoiceNumber}
            </span>
            <Link
              href={`/dashboard/facilities/${sequence.facilityId}`}
              className="truncate font-medium hover:underline"
            >
              {sequence.facilityName}
            </Link>
          </div>
          <p className="text-muted-foreground text-xs">
            {formatMoney(sequence.amount, sequence.currency)} · due{" "}
            {formatDate(sequence.dueDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-rose-500/20 bg-rose-500/10 text-rose-600 tabular-nums dark:text-rose-300"
          >
            {sequence.daysPastDue}d past due
          </Badge>
          {flagged && (
            <Badge className="bg-rose-600 text-white hover:bg-rose-600">
              <ShieldAlert className="mr-1 size-3" />
              Flagged
            </Badge>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-stretch gap-1 px-4 py-4">
        {sequence.jobs.map((job, idx) => {
          const sent = job.status === "sent";
          return (
            <div key={job.id} className="flex flex-1 items-start gap-1">
              <div className="flex flex-1 flex-col items-center text-center">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2",
                    sent
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {sent ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                </div>
                <p className="mt-1.5 text-xs font-semibold">Day {job.step}</p>
                <p className="text-muted-foreground line-clamp-1 text-[10px]">
                  {job.templateName.replace("Invoice Overdue — ", "")}
                </p>
                <p
                  className={cn(
                    "text-[10px]",
                    sent
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {sent
                    ? `Sent ${formatDate(job.sentAt)}`
                    : `Scheduled ${formatDate(job.scheduledAt)}`}
                </p>
              </div>
              {idx < sequence.jobs.length - 1 && (
                <div
                  className={cn(
                    "mt-4 h-0.5 w-full flex-1 self-start",
                    sent ? "bg-emerald-500/50" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
        {/* Suspension terminal node */}
        <div className="bg-muted mt-4 h-0.5 w-6 flex-1 self-start" />
        <div className="flex w-16 flex-col items-center text-center">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full border-2",
              flagged
                ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-muted-foreground/30 text-muted-foreground",
            )}
          >
            <ShieldAlert className="size-4" />
          </div>
          <p className="mt-1.5 text-xs font-semibold">Suspend</p>
          <p
            className={cn(
              "text-[10px]",
              flagged
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground",
            )}
          >
            {flagged ? "Flagged" : "Day 14"}
          </p>
        </div>
      </div>

      {/* Footer action */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
        {flagged ? (
          <p className="text-muted-foreground text-xs">
            Full sequence sent — facility flagged for suspension.
          </p>
        ) : sequence.nextJob ? (
          <p className="text-muted-foreground text-xs">
            Next:{" "}
            <span className="font-medium">{sequence.nextJob.templateName}</span>{" "}
            scheduled {formatDate(sequence.nextJob.scheduledAt)}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Sequence complete.</p>
        )}
        <div className="flex items-center gap-2">
          {sequence.nextJob && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSendNow(sequence)}
            >
              <Mail className="mr-1.5 size-3.5" />
              Send now
            </Button>
          )}
          {flagged && (
            <Button
              size="sm"
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => onSuspend(sequence)}
            >
              Suspend
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
