"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, ArrowRight } from "lucide-react";
import type { Estimate } from "@/types/booking";

interface EstimateRevisionHistoryProps {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EstimateRevisionHistory({
  estimate,
  open,
  onOpenChange,
}: EstimateRevisionHistoryProps) {
  const revisions = estimate.revisions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" />
            Revision History
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {revisions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No revisions yet
            </p>
          ) : (
            <div className="space-y-0">
              {[...revisions].reverse().map((rev, idx) => (
                <div key={rev.version} className="relative flex gap-3 pb-6">
                  {/* Timeline line */}
                  {idx < revisions.length - 1 && (
                    <div className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-px bg-slate-200" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
                    <span className="text-[10px] font-bold text-slate-500">
                      {rev.version}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rev.changedBy}</p>
                      {rev.version === (estimate.currentVersion ?? 1) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-600"
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {new Date(rev.changedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{rev.changes}</p>
                    {rev.previousTotal > 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground tabular-nums">
                          ${rev.previousTotal.toFixed(2)}
                        </span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className="font-semibold tabular-nums">
                          ${rev.newTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RevisionHistoryButton({ estimate }: { estimate: Estimate }) {
  const [open, setOpen] = useState(false);
  const count = estimate.revisions?.length ?? 0;
  if (count === 0) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <History className="size-3" />v{estimate.currentVersion ?? 1}
      </Button>
      <EstimateRevisionHistory
        estimate={estimate}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
