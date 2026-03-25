/**
 * Post check-in system updates (automation).
 * On successful check-in:
 * - Update calendar status, lodging/kennel view, pet stay record
 * - Auto-create stay tasks (feeding, meds, walks, play sessions)
 * - Optional staff assignments (if scheduling rules exist)
 * - Store audit log (customer submission, staff edits, timestamps + user IDs)
 */

import { getYipyyGoForm } from "@/data/yipyygo-forms";
import { bookings } from "@/data/bookings";
import { staffTasks, type StaffTask } from "@/data/staff-tasks";
import { logCheckInCompleted } from "@/lib/checkin-audit";

/** In-memory pet stay record: one per booking (or per pet for multi-pet) after check-in. */
export interface PetStayRecord {
  id: string;
  bookingId: number;
  petId: number;
  facilityId: number;
  serviceType: "daycare" | "boarding" | "grooming" | "training";
  checkedInAt: string;
  /** Optional link to lodging/kennel view (e.g. kennel id) */
  kennelId?: string;
  status: "active" | "checked_out";
}

const petStayRecords: PetStayRecord[] = [];

export function getPetStayRecords(filters?: {
  facilityId?: number;
  bookingId?: number;
  status?: "active" | "checked_out";
}): PetStayRecord[] {
  let list = [...petStayRecords];
  if (filters?.facilityId != null)
    list = list.filter((r) => r.facilityId === filters.facilityId);
  if (filters?.bookingId != null)
    list = list.filter((r) => r.bookingId === filters.bookingId);
  if (filters?.status != null)
    list = list.filter((r) => r.status === filters.status);
  return list.sort(
    (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
  );
}

function nextTaskId(): number {
  const ids = staffTasks.map((t) => t.id);
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

export interface PostCheckInParams {
  bookingId: number;
  facilityId: number;
  petId: number;
  serviceType: "daycare" | "boarding" | "grooming" | "training";
  source: "qr" | "manual";
  staffUserId?: number;
  staffUserName?: string;
  /** If scheduling rules exist, assign tasks to this staff (or round-robin). */
  assignToStaffId?: number;
  assignToStaffName?: string;
}

/**
 * Run post check-in automation:
 * - Update pet stay record (for calendar / kennel view)
 * - Create stay tasks from YipyyGo form (feeding, meds, walks, play)
 * - Log check-in completed in audit
 */
export function runPostCheckInAutomation(params: PostCheckInParams): {
  stayRecord: PetStayRecord;
  tasksCreated: number;
  auditEntry: ReturnType<typeof logCheckInCompleted>;
} {
  const {
    bookingId,
    facilityId,
    petId,
    serviceType,
    source,
    staffUserId,
    staffUserName,
    assignToStaffId,
    assignToStaffName,
  } = params;

  const now = new Date().toISOString();
  const today = now.split("T")[0];

  // 1. Create/update pet stay record (calendar + lodging/kennel view)
  const existingStay = petStayRecords.find(
    (r) => r.bookingId === bookingId && r.petId === petId && r.status === "active"
  );
  const stayRecord: PetStayRecord = existingStay ?? {
    id: `stay-${bookingId}-${petId}-${Date.now()}`,
    bookingId,
    petId,
    facilityId,
    serviceType,
    checkedInAt: now,
    status: "active",
  };
  if (!existingStay) {
    petStayRecords.push(stayRecord);
  }

  // 2. Auto-create stay tasks from YipyyGo form (feeding, meds, walks, play)
  const form = getYipyyGoForm(bookingId);
  const booking = bookings.find((b) => b.id === bookingId);
  const petName = booking ? `Pet ${petId}` : "Pet"; // Could resolve from clients/pets
  let tasksCreated = 0;
  const taskCategory = serviceType === "daycare" ? "daycare" : "boarding";
  const facilityName = "Paws & Play Daycare"; // TODO: from facility config

  if (form) {
    // Feeding tasks from form (V2 — occasion-based or V1 fallback)
    const fi = form.feedingInstructions;
    if (fi?.occasions?.length) {
      // V2 — one task per occasion
      fi.occasions.forEach((occ) => {
        const componentsSummary = occ.components
          .map((c) => `${c.amount} ${c.unit} ${c.name || c.type}`)
          .join(", ");
        const task: StaffTask = {
          id: nextTaskId(),
          templateId: occ.time <= "12:00" ? 1 : 2,
          templateName: occ.label || (occ.time <= "12:00" ? "Morning Feeding" : "Evening Feeding"),
          category: taskCategory,
          description: `Feed ${petName} – ${occ.label}: ${componentsSummary || "see details"}`,
          assignedTo: assignToStaffId ?? 0,
          assignedToName: assignToStaffName ?? "Unassigned",
          petId,
          petName,
          priority: "high",
          requiresPhoto: false,
          status: "pending",
          dueDate: today,
          dueTime: occ.time,
          repeatPattern: "none",
          facility: facilityName,
        };
        staffTasks.push(task);
        tasksCreated++;
      });
    } else if (fi?.feedingSchedule?.length) {
      // V1 fallback — simple time-based schedule
      fi.feedingSchedule.forEach((slot) => {
        const task: StaffTask = {
          id: nextTaskId(),
          templateId: slot.time <= "12:00" ? 1 : 2,
          templateName: slot.time <= "12:00" ? "Morning Feeding" : "Evening Feeding",
          category: taskCategory,
          description: `Feed ${petName} – ${fi.foodType} ${slot.amount}`,
          assignedTo: assignToStaffId ?? 0,
          assignedToName: assignToStaffName ?? "Unassigned",
          petId,
          petName,
          priority: "high",
          requiresPhoto: false,
          status: "pending",
          dueDate: today,
          dueTime: slot.time,
          repeatPattern: "none",
          facility: facilityName,
        };
        staffTasks.push(task);
        tasksCreated++;
      });
    }

    // Medication tasks from form (V2 — includes strength + admin instructions)
    if (!form.noMedications && form.medications?.length) {
      form.medications.forEach((med) => {
        med.times.forEach((time) => {
          const strengthInfo = med.strength ? ` ${med.strength}` : "";
          const adminInfo = med.adminInstructions?.length
            ? ` (${med.adminInstructions.map((a) => a.replace(/_/g, " ")).join(", ")})`
            : "";
          const task: StaffTask = {
            id: nextTaskId(),
            templateId: 3,
            templateName: "Medication Administration",
            category: "medication",
            description: `${med.name}${strengthInfo} – ${med.dosage}, ${med.frequency}${adminInfo} (${petName})`,
            assignedTo: assignToStaffId ?? 0,
            assignedToName: assignToStaffName ?? "Unassigned",
            petId,
            petName,
            priority: med.isHighRisk ? "urgent" : "urgent",
            requiresPhoto: true,
            status: "pending",
            dueDate: today,
            dueTime: time,
            repeatPattern: "none",
            facility: facilityName,
          };
          staffTasks.push(task);
          tasksCreated++;
        });
      });
    }

    // Play session / walk (one per day for boarding/daycare if applicable)
    if (serviceType === "boarding" || serviceType === "daycare") {
      const playTask: StaffTask = {
        id: nextTaskId(),
        templateId: serviceType === "boarding" ? 8 : 7,
        templateName: serviceType === "boarding" ? "Individual Walk" : "Group Play Session",
        category: taskCategory,
        description: serviceType === "boarding" ? `${petName} – walk` : `Play session – ${petName}`,
        assignedTo: assignToStaffId ?? 0,
        assignedToName: assignToStaffName ?? "Unassigned",
        petId,
        petName,
        priority: "medium",
        requiresPhoto: true,
        status: "pending",
        dueDate: today,
        dueTime: "14:00",
        repeatPattern: "none",
        facility: facilityName,
      };
      staffTasks.push(playTask);
      tasksCreated++;
    }
  }

  // 3. Audit log
  const auditEntry = logCheckInCompleted({
    facilityId,
    bookingId,
    petId,
    staffUserId,
    staffUserName,
    source,
    metadata: {
      stayRecordId: stayRecord.id,
      tasksCreated,
      hadYipyyGoForm: !!form,
    },
  });

  return { stayRecord, tasksCreated, auditEntry };
}
