"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QUICKBOOKS_CONSENT } from "@/lib/quickbooks/oauth-mock";

// The "What will Yipyy access in QuickBooks?" disclosure (Section 3A). Reads
// straight from QUICKBOOKS_CONSENT so this screen can never drift from the
// scope the connect flow actually asks for.

export function QuickBooksAccessModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What will Yipyy access in QuickBooks?</DialogTitle>
          <DialogDescription>
            Yipyy only touches the records it needs to post your sales. It never
            edits your existing entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowDownToLine className="size-4 text-sky-600 dark:text-sky-400" />
              Yipyy will read
            </h3>
            <ul className="text-muted-foreground space-y-1.5 pl-6 text-sm">
              {QUICKBOOKS_CONSENT.reads.map((line) => (
                <li key={line} className="list-disc">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ArrowUpFromLine className="size-4 text-emerald-600 dark:text-emerald-400" />
              Yipyy will create
            </h3>
            <ul className="text-muted-foreground space-y-1.5 pl-6 text-sm">
              {QUICKBOOKS_CONSENT.writes.map((line) => (
                <li key={line} className="list-disc">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-muted-foreground bg-muted/40 rounded-md border p-3 text-xs">
            You can disconnect at any time. Disconnecting stops future syncs —
            entries already in QuickBooks are left exactly as they are.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
