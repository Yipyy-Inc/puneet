import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  CalendarPlus,
  CalendarX,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Info,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Paperclip,
  Puzzle,
  Scissors,
  ShieldCheck,
  SquareCheck,
  UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  FacilityNotification,
  FacilityNotificationType,
} from "@/types/facility";

/**
 * Single source of truth for notification type → icon + color (spec Table 31).
 * Consumed identically by the bell dropdown (FacilityNotificationsDropdown) and
 * the full page (NotificationCenter) so the two can never drift. The color is
 * the urgency/semantic language: blue = informational, green = done/arrived,
 * amber = soon / needs attention, red = urgent, gray = closed-out, purple =
 * custom module. Icon color follows the semantics, NOT the row's read state.
 */
export interface NotificationVisual {
  Icon: LucideIcon;
  /** Tailwind text-color class applied to the icon. */
  colorClass: string;
}

// Semantic color buckets from Table 31.
const BLUE = "text-blue-600 dark:text-blue-400";
const GREEN = "text-green-600 dark:text-green-500";
const AMBER = "text-amber-600 dark:text-amber-500";
const RED = "text-red-600 dark:text-red-500";
const GRAY = "text-muted-foreground";
const PURPLE = "text-purple-600 dark:text-purple-400";

/** Custom-module notifications (any type, when `serviceModuleId` is set). */
export const CUSTOM_MODULE_VISUAL: NotificationVisual = {
  Icon: Puzzle,
  colorClass: PURPLE,
};

const DEFAULT_VISUAL: NotificationVisual = { Icon: Info, colorClass: GRAY };

export const NOTIFICATION_TYPE_VISUALS: Record<
  FacilityNotificationType,
  NotificationVisual
> = {
  // Blue — informational
  customer_registered: { Icon: UserPlus, colorClass: BLUE },
  customer_message: { Icon: MessageSquare, colorClass: BLUE },
  booking_new: { Icon: CalendarPlus, colorClass: BLUE },
  session_update: { Icon: GraduationCap, colorClass: BLUE },
  form_submission_new: { Icon: FileText, colorClass: BLUE },
  form_submission_has_files: { Icon: Paperclip, colorClass: BLUE },
  shift_swap: { Icon: ArrowLeftRight, colorClass: BLUE },
  staff_announcement: { Icon: Megaphone, colorClass: BLUE },
  vaccination_uploaded: { Icon: ShieldCheck, colorClass: BLUE },
  info: DEFAULT_VISUAL,

  // Green — arrived / confirmed / done-good
  checkin: { Icon: LogIn, colorClass: GREEN },
  appointment_confirmed: { Icon: CheckCircle, colorClass: GREEN },
  yipyygo_submitted: { Icon: CheckCircle, colorClass: GREEN },

  // Amber — soon / needs attention
  checkout: { Icon: LogOut, colorClass: AMBER },
  attendance_alert: { Icon: AlertTriangle, colorClass: AMBER },
  warning: { Icon: AlertCircle, colorClass: AMBER },
  yipyygo_missing: { Icon: AlertCircle, colorClass: AMBER },
  task_assigned: { Icon: SquareCheck, colorClass: AMBER },

  // Red — urgent
  daycare_capacity: { Icon: AlertTriangle, colorClass: RED },
  incident: { Icon: AlertTriangle, colorClass: RED },
  form_submission_red_flag: { Icon: AlertTriangle, colorClass: RED },
  task_overdue: { Icon: Clock, colorClass: RED },
  booking_cancelled: { Icon: CalendarX, colorClass: RED },

  // Gray — closed out
  appointment_completed: { Icon: Scissors, colorClass: GRAY },
};

/**
 * Resolve the icon + color for a notification. Custom-module notifications
 * (those carrying a `serviceModuleId`) always render as the purple module icon
 * regardless of their underlying type.
 */
export function getNotificationVisual(
  n: Pick<FacilityNotification, "type" | "serviceModuleId">,
): NotificationVisual {
  if (n.serviceModuleId) return CUSTOM_MODULE_VISUAL;
  return NOTIFICATION_TYPE_VISUALS[n.type] ?? DEFAULT_VISUAL;
}

/**
 * Renders a notification's colored type icon. `className` is merged onto the
 * icon (defaults to `size-4`) so callers can size it per surface.
 */
export function NotificationTypeIcon({
  n,
  className,
}: {
  n: Pick<FacilityNotification, "type" | "serviceModuleId">;
  className?: string;
}) {
  const { Icon, colorClass } = getNotificationVisual(n);
  return <Icon className={cn("size-4", colorClass, className)} />;
}
