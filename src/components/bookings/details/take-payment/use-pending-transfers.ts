"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useChargeBooking } from "@/lib/api/booking-money";
import {
  taskQueries,
  useCreateTask,
  useUpdateTask,
  type TaskRow,
} from "@/lib/api/facility-tasks";
import { useNoteMutations } from "@/lib/api/notes";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

// ============================================================================
// An e-transfer that has not arrived yet (decision 3, 2026-10-03).
//
// NOTHING IS RECORDED AS PAID. Interac transfers land minutes or days later,
// and a ledger row for money still in somebody's bank is a balance that lies.
// So "Mark as pending until the transfer arrives" writes two things a person
// will see:
//
//   - a note on the booking: "E-transfer of $X pending (ref …)"
//   - a facility task, "Confirm e-transfer of $X (ref …)", whose source_ref
//     names the booking (`etransfer:booking:{ref}:{id}`) and whose metadata
//     carries the supply, the tax and the reference
//
// The balance stays owing. The payment card shows the pending line in amber,
// and the dialog lists it with "Record arrival", which records the transfer
// on the ledger with its reference as the note, then completes the task.
// If NEITHER the note nor the task could be written, the dialog is told and
// stops — a pending transfer nobody can see is a transfer nobody chases.
// ============================================================================

const prefixFor = (bookingRef: number) => `etransfer:booking:${bookingRef}:`;

export interface PendingTransfer {
  /** The task's id. */
  id: string;
  /** Tax included — what the client sends. */
  total: number;
  subtotal: number;
  tax: number;
  reference: string;
  createdAt: string;
}

function toTransfer(task: TaskRow): PendingTransfer {
  const meta = task.metadata as {
    amount?: number;
    subtotal?: number;
    tax?: number;
    reference?: string;
  };
  return {
    id: task.id,
    total: Number(meta.amount ?? 0),
    subtotal: Number(meta.subtotal ?? 0),
    tax: Number(meta.tax ?? 0),
    reference: meta.reference ?? "",
    createdAt: task.createdAt,
  };
}

export function usePendingTransfers(bookingRef: number | null) {
  const { data } = useQuery({
    ...taskQueries.all({
      sourceRefPrefix: prefixFor(bookingRef ?? 0),
      status: "all",
    }),
    enabled: bookingRef !== null && bookingRef > 0,
  });
  const transfers = (data?.tasks ?? [])
    .filter(
      (task) => task.status === "pending" || task.status === "in_progress",
    )
    .map(toTransfer);
  return { transfers };
}

/** "Mark as pending": the note and the task, and nothing on the ledger. */
export function useMarkTransferPending(bookingRef: number) {
  const { fill, locale } = useStaffText("takePayment");
  const notes = useNoteMutations("booking", bookingRef);
  const createTask = useCreateTask();
  return useMutation({
    mutationFn: async (input: {
      total: number;
      subtotal: number;
      tax: number;
      reference: string;
    }) => {
      const amount = formatMoney(input.total, locale);
      const reference = input.reference.trim();
      const id = Date.now().toString(36);
      const [note, task] = await Promise.allSettled([
        notes.create.mutateAsync({
          content: fill(reference ? "pendingNoteRef" : "pendingNote", {
            amount,
            reference,
          }),
        }),
        createTask.mutateAsync({
          title: fill(reference ? "pendingTaskRef" : "pendingTask", {
            amount,
            reference,
          }),
          category: "payments",
          priority: "medium",
          source: "manual",
          sourceRef: `${prefixFor(bookingRef)}${id}`,
          metadata: {
            kind: "etransfer_pending",
            bookingRef,
            amount: input.total,
            subtotal: input.subtotal,
            tax: input.tax,
            reference,
          },
        }),
      ]);
      if (note.status === "rejected" && task.status === "rejected") {
        throw task.reason instanceof Error
          ? task.reason
          : new Error("The pending transfer could not be written down.");
      }
      return {
        noteWritten: note.status === "fulfilled",
        taskWritten: task.status === "fulfilled",
      };
    },
  });
}

/**
 * "Record arrival": the transfer goes on the ledger as an e-transfer, its
 * reference as the note, and the task is completed. Never more than is still
 * owed — the bill may have moved since the transfer was promised.
 */
export function useRecordTransferArrival(
  booking: Pick<Booking, "id" | "totalCost" | "amountDue" | "amountPaid">,
) {
  const chargeBooking = useChargeBooking();
  const updateTask = useUpdateTask();
  return useMutation({
    mutationFn: async (transfer: PendingTransfer) => {
      const owed = Math.max(
        0,
        (booking.amountDue ?? booking.totalCost) - (booking.amountPaid ?? 0),
      );
      const supply = Math.min(transfer.subtotal, owed);
      const tax =
        transfer.subtotal > 0
          ? Math.round(((transfer.tax * supply) / transfer.subtotal) * 100) /
            100
          : 0;
      const taken = await chargeBooking.mutateAsync({
        booking,
        amount: supply,
        tax,
        method: "e_transfer",
        ...(transfer.reference ? { note: transfer.reference } : {}),
      });
      await updateTask.mutateAsync({ id: transfer.id, status: "completed" });
      return taken;
    },
  });
}
