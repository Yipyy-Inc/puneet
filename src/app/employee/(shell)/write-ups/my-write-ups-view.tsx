"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ShieldCheck,
  CircleAlert,
  CheckCircle2,
  Link2,
  Paperclip,
} from "lucide-react";
import { getEmployeeStaffId } from "@/lib/role-utils";
import {
  useWriteUps,
  acknowledgeWriteUp,
  WRITEUP_CATEGORY_LABEL,
  type WriteUpCategory,
} from "@/data/staff-writeups";

function categoryClass(category: WriteUpCategory): string {
  switch (category) {
    case "termination_notice":
    case "final_warning":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300";
    case "written_warning":
    case "pip":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
    case "positive_recognition":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

const needsAck = (w: {
  acknowledgedAt?: string;
  category: WriteUpCategory;
}): boolean => !w.acknowledgedAt && w.category !== "positive_recognition";

export function MyWriteUpsView() {
  // SECURITY: the view only ever reads the current staff member's own id — there
  // is no way to pass another staff member's id, so records stay private.
  const [staffId] = useState<string | null>(() => getEmployeeStaffId());
  const records = useWriteUps(staffId);

  const active = useMemo(
    () =>
      records
        .filter((w) => !w.archived)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  );
  const pending = active.filter(needsAck).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <FileText className="text-primary size-6" /> My HR Records
        </h1>
        <p className="text-muted-foreground text-sm">
          Your write-ups and recognition. You can review and acknowledge — only
          your managers can edit these.
        </p>
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <CircleAlert className="size-4 shrink-0" />
          You have {pending} record{pending === 1 ? "" : "s"} to review and
          acknowledge.
        </div>
      )}

      {active.length === 0 ? (
        <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-12 text-center">
          <ShieldCheck className="size-8 opacity-40" />
          <p className="text-sm">No HR records on file.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((w) => {
            const acknowledged = !!w.acknowledgedAt;
            const mustAck = needsAck(w);
            return (
              <div
                key={w.id}
                className={cn(
                  "rounded-xl border p-4",
                  mustAck
                    ? "border-rose-200 dark:border-rose-900/60"
                    : "border-border/60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={categoryClass(w.category)}
                  >
                    {WRITEUP_CATEGORY_LABEL[w.category]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {w.date} · issued by {w.issuedBy}
                  </span>
                </div>

                {/* Description shown exactly as written by the manager. */}
                <div
                  className="text-foreground mt-2 text-sm [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: w.description }}
                />

                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  {w.incidentRef && (
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="size-3" /> Incident {w.incidentRef}
                    </span>
                  )}
                  {w.attachmentUrl && (
                    <a
                      href={w.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <Paperclip className="size-3" /> Attachment
                    </a>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {acknowledged ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Acknowledged{" "}
                      {w.acknowledgedAt?.split("T")[0]}
                    </span>
                  ) : mustAck ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                        <span className="size-1.5 rounded-full bg-rose-500" />{" "}
                        Not yet acknowledged
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (staffId) acknowledgeWriteUp(staffId, w.id);
                          toast.success("Record acknowledged");
                        }}
                      >
                        I acknowledge this record
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      No acknowledgement required
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
