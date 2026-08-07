"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MailWarning,
  Pencil,
  Send,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Where the owner's invitation got to, and what to do about it.
//
// The API for this has existed and been tested since spec 002 phase 2 — send,
// re-send, withdraw, read the state — and nothing in the product called any of
// it. So when an invitation went to the wrong address in production, the only
// way to find out what state it was in was to query the database by hand, and
// the only way to fix it was to edit a row.
//
// That is the difference this panel makes. Not a new capability: a way to
// reach one that already worked.
//
// ── THE FOUR STATES ARE DIFFERENT PROBLEMS ────────────────────────────────
//
//   accepted  they are in. Nothing to do, and the actions are GONE rather than
//             disabled — a resend button that would refuse is an invitation to
//             press it.
//   pending   sent, not yet accepted. Could be in a spam folder, could be the
//             wrong address entirely. Both fixes are here.
//   expired   the 14 days ran out. One button.
//   none      no invitation exists — a facility nobody can enter, which looks
//             identical to a healthy one everywhere else on this page.
//
// ── CHANGING THE ADDRESS IS THE POINT ─────────────────────────────────────
//
// Withdrawing alone never fixed a typo: the staff row kept the wrong address,
// so re-inviting sent to the same place. The two actions only became useful
// together.
// ============================================================================

type State =
  | { state: "none" }
  | {
      state: "pending" | "accepted" | "expired";
      email: string;
      sentAt: string;
      expiresAt: string | null;
      acceptedAt: string | null;
    };

function day(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export function OwnerInvitation({ facilityId }: { facilityId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const key = ["admin", "facility", facilityId, "owner-invite"];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<State> => {
      const response = await fetch(
        `/api/facilities/${facilityId}/invite-owner`,
      );
      if (!response.ok) throw new Error("Could not read the invitation.");
      return (await response.json()) as State;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  // Three calls at the top level, not a helper that wraps them: a hook called
  // inside an ordinary function is a rules-of-hooks violation even when the
  // call order happens to be stable.
  const resend = useOwnerInviteAction(facilityId, "POST", refresh, setNotice);
  const changeAddress = useOwnerInviteAction(
    facilityId,
    "PATCH",
    refresh,
    setNotice,
  );
  const withdraw = useOwnerInviteAction(
    facilityId,
    "DELETE",
    refresh,
    setNotice,
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-3.5 animate-spin" />
        Checking the invitation…
      </div>
    );
  }

  const busy =
    resend.isPending || changeAddress.isPending || withdraw.isPending;
  const error = resend.error ?? changeAddress.error ?? withdraw.error ?? null;

  return (
    <div className="space-y-3">
      {/* ── The state ───────────────────────────────────────────────────── */}
      {data?.state === "accepted" && (
        <p className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="size-4" />
          <span>
            <strong>{data.email}</strong> accepted on {day(data.acceptedAt)} —
            they can sign in.
          </span>
        </p>
      )}

      {data?.state === "pending" && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            Invitation sent to <strong>{data.email}</strong> on{" "}
            {day(data.sentAt)}, not accepted yet. Expires {day(data.expiresAt)}.
          </span>
        </p>
      )}

      {data?.state === "expired" && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          <span>
            The invitation to <strong>{data.email}</strong> expired on{" "}
            {day(data.expiresAt)}. They cannot sign in until it is sent again.
          </span>
        </p>
      )}

      {data?.state === "none" && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>No invitation has been sent.</strong> Nobody can get into
            this facility.
          </span>
        </p>
      )}

      {/* ── Changing the address ────────────────────────────────────────── */}
      {editing && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            changeAddress.mutate(
              { email: address.trim() },
              {
                onSuccess: () => {
                  setEditing(false);
                  setNotice(
                    "Address changed. Send the invitation again to reach it.",
                  );
                },
              },
            );
          }}
        >
          <Input
            type="email"
            required
            autoFocus
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="owner@theirbusiness.com"
            className="h-9 max-w-xs"
          />
          <Button type="submit" size="sm" disabled={busy}>
            {changeAddress.isPending ? "Saving…" : "Save address"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </form>
      )}

      {/* ── The actions. Absent when accepted, not disabled. ────────────── */}
      {data && data.state !== "accepted" && !editing && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={() =>
              resend.mutate(undefined, {
                onSuccess: (result) =>
                  setNotice(
                    (result as { sent?: boolean })?.sent
                      ? "Invitation sent."
                      : "Recorded, but the email could not be sent. Check RESEND_API_KEY.",
                  ),
              })
            }
          >
            <Send className="mr-2 size-3.5" />
            {resend.isPending
              ? "Sending…"
              : data.state === "none"
                ? "Send invitation"
                : "Send again"}
          </Button>

          {data.state !== "none" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setAddress(data.email);
                  setNotice(null);
                  setEditing(true);
                }}
              >
                <Pencil className="mr-2 size-3.5" />
                Change address
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => setConfirmWithdraw(true)}
              >
                <X className="mr-2 size-3.5" />
                Withdraw
              </Button>
            </>
          )}
        </div>
      )}

      {notice && <p className="text-muted-foreground text-xs">{notice}</p>}
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error.message}
        </p>
      )}

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The link stops working and nobody can use it to reach this
              facility. The owner&apos;s record stays — send it again, or change
              the address first if it went to the wrong person.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                withdraw.mutate(undefined, {
                  onSuccess: () => setNotice("Invitation withdrawn."),
                })
              }
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * The three actions are one request shape — send, re-aim, withdraw — differing
 * only in verb and body. A custom hook rather than three near-identical
 * useMutation blocks, named `use*` so the rules-of-hooks lint can see it is one.
 */
function useOwnerInviteAction(
  facilityId: string,
  method: "POST" | "PATCH" | "DELETE",
  onDone: () => void,
  setNotice: (value: string | null) => void,
) {
  return useMutation({
    mutationFn: async (body?: { email: string }) => {
      const response = await fetch(
        `/api/facilities/${facilityId}/invite-owner`,
        {
          method,
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        },
      );
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "That did not work.");
      }
      return parsed;
    },
    onMutate: () => setNotice(null),
    onSuccess: () => onDone(),
  });
}
