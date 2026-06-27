"use client";

import { Bell, Megaphone, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AnnouncementPriority } from "@/types/announcement";
import {
  DELIVERY_LABEL,
  PRIORITY_BADGE,
  PRIORITY_HELP,
} from "./announcement-utils";
import type { DeliveryMethod } from "@/types/announcement";

export function AnnouncementPreview({
  open,
  onOpenChange,
  title,
  body,
  priority,
  targetText,
  deliveryMethod,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetText: string;
  deliveryMethod: DeliveryMethod;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>
            How this announcement reaches facilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Delivery surface mock */}
          {priority === "Urgent" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <span className="flex items-center gap-2">
                <Megaphone className="size-4 shrink-0" />
                <span className="font-semibold">{title || "Untitled"}</span>
              </span>
              <X className="size-4 shrink-0 opacity-60" />
            </div>
          ) : priority === "High" ? (
            <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="relative">
                <Bell className="size-4" />
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
              </span>
              Yellow bell badge + notification dropdown
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <Bell className="size-4" />
              Notification dropdown only
            </div>
          )}

          {/* Rendered content */}
          <div className="rounded-lg border p-4">
            <h3 className="text-base font-semibold">{title || "Untitled"}</h3>
            <div
              className="text-foreground/90 [&_a]:text-primary mt-2 text-sm/relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html:
                  body ||
                  "<p class='text-muted-foreground'>No content yet.</p>",
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={cn(PRIORITY_BADGE[priority])}>
              {priority}
            </Badge>
            <span className="text-muted-foreground">{targetText}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {DELIVERY_LABEL[deliveryMethod]}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {PRIORITY_HELP[priority]}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
