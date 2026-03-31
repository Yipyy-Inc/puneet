import type { GeneratedTask, TaskTemplate } from "@/types/task";
import type { Booking } from "@/types/booking";
import { getTemplatesForModule } from "@/data/task-templates";
import { clients } from "@/data/clients";

// ============================================================================
// Task generation logic
// ============================================================================

function calculateScheduledTime(
  template: TaskTemplate,
  booking: Booking,
  dayOffset: number,
  timeOverride?: string,
): string {
  const baseDate = dayOffset === 0 ? booking.startDate : booking.endDate;
  const date = new Date(baseDate + "T00:00:00");

  if (
    dayOffset > 0 &&
    dayOffset < nightsBetween(booking.startDate, booking.endDate)
  ) {
    date.setDate(
      new Date(booking.startDate + "T00:00:00").getDate() + dayOffset,
    );
  }

  if (timeOverride) {
    const [h, m] = timeOverride.split(":").map(Number);
    date.setHours(h, m, 0, 0);
    return date.toISOString();
  }

  switch (template.timing.type) {
    case "before_start": {
      const [h, m] = (booking.checkInTime ?? "09:00").split(":").map(Number);
      date.setHours(h, m, 0, 0);
      date.setMinutes(date.getMinutes() + (template.timing.offsetMinutes ?? 0));
      return date.toISOString();
    }
    case "at_start": {
      const [h, m] = (booking.checkInTime ?? "09:00").split(":").map(Number);
      date.setHours(h, m, 0, 0);
      return date.toISOString();
    }
    case "during": {
      const [h, m] = (booking.checkInTime ?? "09:00").split(":").map(Number);
      date.setHours(h + 1, m, 0, 0);
      return date.toISOString();
    }
    case "at_end": {
      const endDate = new Date(booking.endDate + "T00:00:00");
      const [h, m] = (booking.checkOutTime ?? "17:00").split(":").map(Number);
      endDate.setHours(h, m, 0, 0);
      return endDate.toISOString();
    }
    case "after_end": {
      const endDate = new Date(booking.endDate + "T00:00:00");
      const [h, m] = (booking.checkOutTime ?? "17:00").split(":").map(Number);
      endDate.setHours(h, m, 0, 0);
      endDate.setMinutes(
        endDate.getMinutes() + (template.timing.offsetMinutes ?? 0),
      );
      return endDate.toISOString();
    }
    case "custom_time": {
      const [h, m] = (template.timing.customTime ?? "09:00")
        .split(":")
        .map(Number);
      date.setHours(h, m, 0, 0);
      return date.toISOString();
    }
    default:
      return date.toISOString();
  }
}

function nightsBetween(start: string, end: string): number {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function generateTasksForBooking(booking: Booking): GeneratedTask[] {
  const moduleId = booking.service?.toLowerCase() ?? "daycare";
  const templates = getTemplatesForModule(moduleId).filter((t) => t.autoCreate);

  const client = clients.find((c) => c.id === booking.clientId);
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  const pet = client?.pets.find((p) => p.id === petId);
  const petName = pet?.name ?? "Unknown";
  const ownerName = client?.name ?? "Unknown";
  const nights = nightsBetween(booking.startDate, booking.endDate);

  const tasks: GeneratedTask[] = [];
  let taskCounter = 0;

  for (const template of templates) {
    if (template.recurring) {
      // Generate one task per day per time slot
      const days = Math.max(1, nights);
      const times = template.recurring.times ?? ["09:00"];

      for (let day = 0; day < days; day++) {
        for (const time of times) {
          taskCounter++;
          const dayDate = new Date(booking.startDate + "T00:00:00");
          dayDate.setDate(dayDate.getDate() + day);

          tasks.push({
            id: `task-${booking.id}-${template.id}-d${day}-${time.replace(":", "")}`,
            bookingId: booking.id,
            moduleId,
            templateId: template.id,
            name: `${template.name}${days > 1 ? ` (Day ${day + 1})` : ""}`,
            description: template.description,
            category: template.category,
            scheduledAt: calculateScheduledTime(template, booking, day, time),
            durationMinutes: template.durationMinutes,
            assignedTo:
              template.assignTo === "booking_staff" ? "Staff" : undefined,
            status: "pending",
            isRequired: template.isRequired,
            petName,
            ownerName,
          });
        }
      }
    } else {
      taskCounter++;
      tasks.push({
        id: `task-${booking.id}-${template.id}`,
        bookingId: booking.id,
        moduleId,
        templateId: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        scheduledAt: calculateScheduledTime(template, booking, 0),
        durationMinutes: template.durationMinutes,
        assignedTo: template.assignTo === "booking_staff" ? "Staff" : undefined,
        status: "pending",
        isRequired: template.isRequired,
        petName,
        ownerName,
      });
    }
  }

  return tasks.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
}
