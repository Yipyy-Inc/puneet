import type { GeneratedTask } from "@/types/task";
import type { Booking } from "@/types/booking";
import { generateTasksForBooking } from "@/lib/task-generator";
import { bookings } from "@/data/bookings";

// ============================================================================
// In-memory + localStorage store for generated tasks
// ============================================================================

const STORAGE_KEY = "yipyy_generated_tasks";

function loadTasks(): GeneratedTask[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: GeneratedTask[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
}

// ============================================================================
// Query functions
// ============================================================================

export function getTasksForBooking(bookingId: number): GeneratedTask[] {
  const stored = loadTasks().filter((t) => t.bookingId === bookingId);
  if (stored.length > 0) return stored;

  // Auto-generate if no tasks exist yet for this booking
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return [];
  if (booking.status === "cancelled") return [];

  const generated = generateTasksForBooking(booking);
  // Persist
  const all = loadTasks();
  all.push(...generated);
  saveTasks(all);
  return generated;
}

export function getAllPendingTasks(): GeneratedTask[] {
  return loadTasks().filter((t) => t.status === "pending");
}

export function getTasksForModule(moduleId: string): GeneratedTask[] {
  return loadTasks().filter((t) => t.moduleId === moduleId);
}

// ============================================================================
// Mutation functions
// ============================================================================

export function completeTask(
  taskId: string,
  completedBy: string,
  notes?: string,
): GeneratedTask | null {
  const all = loadTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = "completed";
  task.completedAt = new Date().toISOString();
  task.completedBy = completedBy;
  if (notes) task.notes = notes;
  saveTasks(all);
  return task;
}

export function startTask(taskId: string): GeneratedTask | null {
  const all = loadTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = "in_progress";
  saveTasks(all);
  return task;
}

export function skipTask(taskId: string): GeneratedTask | null {
  const all = loadTasks();
  const task = all.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = "skipped";
  saveTasks(all);
  return task;
}

export function addCustomTask(task: GeneratedTask) {
  const all = loadTasks();
  all.push(task);
  saveTasks(all);
}

export function generateAndStoreTasks(booking: Booking): GeneratedTask[] {
  const generated = generateTasksForBooking(booking);
  const all = loadTasks().filter((t) => t.bookingId !== booking.id);
  all.push(...generated);
  saveTasks(all);
  return generated;
}
