"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Clock,
  User,
  MoreHorizontal,
  Plus,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, ActivityType, ActivityStatus } from "@/data/crm/activities";

interface ActivityTimelineProps {
  activities: Activity[];
  onAddActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activity: Activity) => void;
  onCompleteActivity?: (activity: Activity) => void;
  showFilters?: boolean;
  compact?: boolean;
}

const activityIcons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckSquare,
};

const activityColors: Record<ActivityType, string> = {
  call: "bg-green-500",
  email: "bg-blue-500",
  meeting: "bg-purple-500",
  note: "bg-yellow-500",
  task: "bg-orange-500",
};

const statusColors: Record<ActivityStatus, string> = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(dateString);
}

export function ActivityTimeline({
  activities,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onCompleteActivity,
  showFilters = true,
  compact = false,
}: ActivityTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">(
    "all",
  );

  const filteredActivities = activities.filter((activity) => {
    if (typeFilter !== "all" && activity.type !== typeFilter) return false;
    if (statusFilter !== "all" && activity.status !== statusFilter)
      return false;
    return true;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const dateA = a.completedAt || a.dueDate || a.createdAt;
    const dateB = b.completedAt || b.dueDate || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as ActivityType | "all")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Activity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ActivityStatus | "all")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {onAddActivity && (
            <Button onClick={onAddActivity} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          )}
        </div>
      )}

      {sortedActivities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No activities found</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {sortedActivities.map((activity) => {
              const Icon = activityIcons[activity.type];
              const iconColor = activityColors[activity.type];
              const displayDate =
                activity.completedAt || activity.dueDate || activity.createdAt;
              const isOverdue =
                activity.status === "pending" &&
                activity.dueDate &&
                new Date(activity.dueDate) < new Date();

              return (
                <div key={activity.id} className="relative pl-12">
                  {/* Icon */}
                  <div
                    className={`absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center ${iconColor}`}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>

                  {/* Content */}
                  <div
                    className={`bg-card border rounded-lg ${compact ? "p-3" : "p-4"} hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">
                            {activity.subject}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={
                              statusColors[
                                isOverdue ? "overdue" : activity.status
                              ]
                            }
                          >
                            {isOverdue ? "Overdue" : activity.status}
                          </Badge>
                        </div>

                        {!compact && activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(displayDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.assignedToName}
                          </span>
                          {activity.duration && (
                            <span>{activity.duration} min</span>
                          )}
                        </div>

                        {!compact && activity.outcome && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Outcome: </span>
                            {activity.outcome}
                          </div>
                        )}

                        {!compact && activity.notes && (
                          <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                            {activity.notes}
                          </div>
                        )}
                      </div>

                      {(onEditActivity ||
                        onDeleteActivity ||
                        onCompleteActivity) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {activity.status === "pending" &&
                              onCompleteActivity && (
                                <DropdownMenuItem
                                  onClick={() => onCompleteActivity(activity)}
                                >
                                  <CheckSquare className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                            {onEditActivity && (
                              <DropdownMenuItem
                                onClick={() => onEditActivity(activity)}
                              >
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDeleteActivity && (
                              <DropdownMenuItem
                                onClick={() => onDeleteActivity(activity)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
