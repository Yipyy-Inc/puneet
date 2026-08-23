"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRemovePrincipal } from "@/lib/api/merchant-application";
import {
  BENEFICIAL_OWNER_THRESHOLD,
  principalProblems,
  type MerchantApplication,
  type Principal,
} from "@/lib/merchant-application/application";
import { OwnerDialog } from "./OwnerDialog";

// ============================================================================
// Step 2 — everyone the acquirer has to know about.
//
// ── WHY THIS SCREEN ASKS FOR MORE THAN A NAME ─────────────────────────────
//
// Anti-money-laundering rules make an acquirer identify every beneficial owner
// at or above 25%, and exactly one person who controls the business. Those two
// are different questions and a facility that assumes they are the same submits
// an application that comes back. The screen says so before they add anybody.
//
// ── AND WHY REMOVING IS A REAL BUTTON ─────────────────────────────────────
//
// A co-owner typed twice, or a partner who left, has to be removable, and the
// database grants exactly that and nothing wider: DELETE exists on the
// principals table alone, policy-narrowed to the person who started the
// application. See migration 20260823700000 and assertion M18.
// ============================================================================

export function StepOwners({
  application,
  onBack,
  onContinue,
}: {
  application: MerchantApplication;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [editing, setEditing] = useState<Principal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<Principal | null>(null);
  const remove = useRemovePrincipal();

  const principals = application.principals;
  const { blocking, notes } = principalProblems(principals);
  const total = principals.reduce((sum, p) => sum + p.ownershipPercent, 0);
  const hasControl = principals.some((p) => p.isControlPerson);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(principal: Principal) {
    setEditing(principal);
    setDialogOpen(true);
  }

  function confirmRemove() {
    const target = removing;
    if (!target?.id) return;
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.fullName} removed.`);
        setRemoving(null);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold">Who owns the business</h3>
        <p className="text-muted-foreground text-sm/relaxed">
          Everyone who owns {BENEFICIAL_OWNER_THRESHOLD}% or more, plus the one
          person who runs it day to day. This is a legal requirement on whoever
          opens a merchant account, not a Yipyy preference.
        </p>
      </header>

      {principals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
            <UserRound className="size-6" />
          </span>
          <p className="mt-4 font-medium">No owners added yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm/relaxed">
            Start with yourself if you own part of the business, or with whoever
            does.
          </p>
          <Button className="mt-5" onClick={openAdd}>
            <Plus className="size-4" />
            Add the first owner
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {principals.map((principal) => (
            <OwnerRow
              key={principal.id ?? principal.email}
              principal={principal}
              onEdit={() => openEdit(principal)}
              onRemove={() => setRemoving(principal)}
            />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button variant="outline" onClick={openAdd}>
              <Plus className="size-4" />
              Add another owner
            </Button>
            <p className="text-muted-foreground text-sm">
              Ownership listed:{" "}
              <span className="text-foreground font-[tabular-nums] font-semibold">
                {total}%
              </span>
            </p>
          </div>
        </div>
      )}

      {blocking.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
            Before you continue
          </p>
          <ul className="space-y-1.5 pl-6">
            {blocking.map((problem) => (
              <li key={problem} className="list-disc text-sm/relaxed">
                {problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="text-muted-foreground space-y-1.5 text-xs/relaxed">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={onContinue}
          disabled={blocking.length > 0 || !hasControl}
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <OwnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        principal={editing}
        suggestControl={!hasControl}
      />

      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing?.fullName ?? "this owner"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their details and any identity number stored for them are deleted.
              You can add them again, but you will have to type it all in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Keep them
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmRemove();
              }}
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OwnerRow({
  principal,
  onEdit,
  onRemove,
}: {
  principal: Principal;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
        <UserRound className="size-5" />
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{principal.fullName}</p>
          {principal.isControlPerson && (
            <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
              Controls the business
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {principal.title} · {principal.ownershipPercent}% · {principal.email}
        </p>
        {principal.nationalIdLast4 ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="size-3.5" />
            Identity number on file, ending {principal.nationalIdLast4}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3.5" />
            No identity number yet
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-600"
          aria-label={`Remove ${principal.fullName}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
