"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientQueries } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// ============================================================================
// Ask one client for a review, because somebody decided to.
//
// ── THE REFUSAL IS THE INTERESTING PART OF THIS SCREEN ────────────────────
//
// Most presses of this button will send. The ones that do not are where a
// person needs telling WHY, in words, rather than a toast saying "failed" —
// because the reason is usually a rule they can reason about: this client was
// asked four days ago, or they left a bad review last week and the pause is
// still running.
//
// So a refusal is not an error state here. It is an answer, shown in place,
// and the server decides whether it can be argued with.
//
// ── WHICH REFUSALS OFFER A REASON BOX, AND WHY IT IS THE SERVER'S CALL ────
//
// The cooldown and the negative pause are a facility's own policy about how
// often to ask, so a manager who knows this client may override them with a
// reason that is recorded on the row. Consent, a hard bounce, a refund and a
// cancellation may not be overridden by anybody.
//
// This component does not decide that. The 409 carries an `overridable` flag
// and the box appears when it is true; the server checks the reason against the
// same list again when it arrives. A client that decided for itself would be a
// second copy of a rule about consent, and there is no version of that worth
// having — including the version that infers it by matching on the wording of
// the message, which loses the box silently the day somebody rephrases it.
// ============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Refusal {
  message: string;
  /** Whether the server indicated a reason could get past it. */
  overridable: boolean;
}

export function AskForReviewDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  // The numeric `ref` — the only client identifier this screen has. See the
  // route: `rowToClient` maps `id: row.ref` and the uuid never reaches the UI.
  const [clientRef, setClientRef] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isFetching } = useQuery({
    ...clientQueries.search(query),
    enabled: open && query.trim().length >= 2,
  });

  const reset = () => {
    setQuery("");
    setClientRef(null);
    setReason("");
    setRefusal(null);
  };

  const send = useMutation({
    mutationFn: async (override: string | null) => {
      const response = await fetch("/api/reputation/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRef,
          ...(override ? { overrideReason: override } : {}),
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        overridable?: boolean;
      } | null;

      if (!response.ok) {
        // 409 is "the rules said no", not "something broke". It carries the
        // sentence the server wants this person to read, and a flag saying
        // whether a reason would get past it — see the header for why that is
        // sent rather than inferred from the wording.
        const message = body?.error ?? "That review request was not sent.";
        throw Object.assign(new Error(message), {
          refusal: response.status === 409,
          overridable: body?.overridable === true,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reputation"] });
      toast.success("Review request sent", {
        description: "It goes out on the next messaging run.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error & { refusal?: boolean; overridable?: boolean }) => {
      if (error.refusal) {
        setRefusal({
          message: error.message,
          overridable: Boolean(error.overridable),
        });
        return;
      }
      toast.error(error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask for a review</DialogTitle>
          <DialogDescription>
            Sends one request to this client about today&apos;s visit. It goes
            through the same rules as the automatic ones — quiet hours, consent
            and the daily cap all still apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ask-review-client">Client</Label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="ask-review-client"
                autoComplete="off"
                className="pl-9"
                placeholder="Search by name or email"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setClientRef(null);
                  setRefusal(null);
                }}
              />
            </div>
          </div>

          {query.trim().length >= 2 ? (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
              {isFetching && clients.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  Searching…
                </p>
              ) : clients.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                  No client matches that.
                </p>
              ) : (
                clients.slice(0, 25).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setClientRef(Number(client.id));
                      setRefusal(null);
                    }}
                    className={cn(
                      "hover:bg-muted flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition-colors",
                      clientRef === Number(client.id) && "bg-muted",
                    )}
                  >
                    <span className="text-sm font-medium">{client.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {client.email || "No email on file"}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {refusal ? (
            <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {refusal.message}
              </p>

              {refusal.overridable ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="ask-review-reason"
                    className="text-amber-900 dark:text-amber-200"
                  >
                    Why send it anyway?
                  </Label>
                  <Textarea
                    id="ask-review-reason"
                    rows={2}
                    placeholder="Recorded on the request, so the exception is not anonymous."
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={send.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={
              !clientRef ||
              send.isPending ||
              // An override needs an actual reason, not a keystroke. The server
              // enforces three characters too.
              (refusal?.overridable === true && reason.trim().length < 3)
            }
            onClick={() =>
              send.mutate(refusal?.overridable ? reason.trim() : null)
            }
          >
            {send.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {refusal?.overridable ? "Send anyway" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
