/**
 * Generates facility tasks from booking care instructions.
 *
 * Reads feeding/medication/activity data from active bookings and creates
 * tasks with shift-based or skill-based assignment. This is the bridge
 * between booking care data and the Task Management Center.
 */

import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { assignTask } from "@/lib/task-assignment";
import type { FacilityTask } from "@/data/facility-tasks";
import type { Booking } from "@/types/booking";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getShiftPeriod(time: string): "morning" | "afternoon" | "evening" {
  const [h] = time.split(":").map(Number);
  if (h < 14) return "morning";
  if (h < 22) return "afternoon";
  return "evening";
}

function getPetName(booking: Booking): string {
  const client = clients.find((c) => c.id === booking.clientId);
  if (!client) return "Pet";
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  return client.pets.find((p) => p.id === petId)?.name ?? "Pet";
}

function getOwnerName(booking: Booking): string {
  return clients.find((c) => c.id === booking.clientId)?.name ?? "Client";
}

// ── Generator ────────────────────────────────────────────────────────────────

let _taskId = 5000;

function nextTaskId(): string {
  _taskId += 1;
  return `bt-${_taskId}`;
}

/**
 * Generate tasks from a single booking's care instructions for a given date.
 */
function generateTasksForBooking(
  booking: Booking,
  date: string,
  assignmentCounts: Map<string, number>,
): FacilityTask[] {
  const tasks: FacilityTask[] = [];
  const petName = getPetName(booking);
  const ownerName = getOwnerName(booking);

  // ── Feeding tasks ──
  if (booking.feedingInstructions) {
    for (const feed of booking.feedingInstructions) {
      const assignment = assignTask({
        date,
        time: feed.time,
        existingAssignments: assignmentCounts,
      });
      if (assignment.staffId) {
        assignmentCounts.set(
          assignment.staffId,
          (assignmentCounts.get(assignment.staffId) ?? 0) + 1,
        );
      }

      tasks.push({
        id: nextTaskId(),
        bookingId: booking.id,
        petId: Array.isArray(booking.petId) ? booking.petId[0] : booking.petId,
        petName,
        ownerName,
        name: feed.label.includes("—")
          ? feed.label
          : `${feed.label} — ${petName}`,
        description: [feed.amount, feed.foodType, feed.instructions]
          .filter(Boolean)
          .join(" · "),
        category: "feeding",
        assignmentType: assignment.type,
        assignedToId: assignment.staffId,
        assignedToName: assignment.staffName,
        autoAssigned: assignment.autoAssigned,
        scheduledDate: date,
        scheduledTime: feed.time,
        shiftPeriod: getShiftPeriod(feed.time),
        status: feed.status === "completed" ? "completed" : "pending",
        isOverdue: false,
        isCritical: false,
        completedAt: feed.completedAt,
        completedByName: feed.completedBy,
        feedback: feed.feedback,
        completionNotes: feed.notes,
      });
    }
  }

  // ── Medication tasks ──
  if (booking.medicationInstructions) {
    for (const med of booking.medicationInstructions) {
      for (const dose of med.doses) {
        const doseTime = new Date(dose.scheduledAt).toTimeString().slice(0, 5);
        const doseDate = new Date(dose.scheduledAt).toISOString().slice(0, 10);

        // Only generate for the requested date
        if (doseDate !== date) continue;

        const requiredSkill =
          med.method === "Injection" ? "medication" : undefined;
        const assignment = assignTask({
          date,
          time: doseTime,
          requiredSkill,
          existingAssignments: assignmentCounts,
        });
        if (assignment.staffId) {
          assignmentCounts.set(
            assignment.staffId,
            (assignmentCounts.get(assignment.staffId) ?? 0) + 1,
          );
        }

        const isOverdue =
          dose.status === "pending" &&
          new Date(dose.scheduledAt).getTime() < Date.now();

        tasks.push({
          id: nextTaskId(),
          bookingId: booking.id,
          petId: Array.isArray(booking.petId)
            ? booking.petId[0]
            : booking.petId,
          petName,
          ownerName,
          name: med.name.includes("—") ? med.name : `${med.name} — ${petName}`,
          description: [med.dosage, med.method, med.instructions]
            .filter(Boolean)
            .join(" · "),
          category: "medication",
          assignmentType: assignment.type,
          requiredSkill,
          assignedToId: assignment.staffId,
          assignedToName: assignment.staffName,
          autoAssigned: assignment.autoAssigned,
          scheduledDate: date,
          scheduledTime: doseTime,
          shiftPeriod: getShiftPeriod(doseTime),
          status:
            dose.status === "given"
              ? "completed"
              : isOverdue
                ? "overdue"
                : "pending",
          isOverdue,
          isCritical: med.isCritical,
          completedAt: dose.administeredAt,
          completedByName: dose.administeredBy,
          feedback: dose.status === "given" ? "Given" : undefined,
          completionNotes: dose.notes,
        });
      }
    }
  }

  return tasks;
}

/**
 * Generate all tasks for a given date from all active bookings.
 */
export function generateAllTasksForDate(date: string): FacilityTask[] {
  const assignmentCounts = new Map<string, number>();
  const allTasks: FacilityTask[] = [];

  // Find bookings that overlap with this date
  const activeBookings = bookings.filter((b) => {
    if (b.status === "cancelled" || b.status === "declined") return false;
    const start = b.startDate;
    const end = b.endDate;
    return date >= start && date <= end;
  });

  for (const booking of activeBookings) {
    const tasks = generateTasksForBooking(booking, date, assignmentCounts);
    allTasks.push(...tasks);
  }

  // Sort by time
  allTasks.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return allTasks;
}
