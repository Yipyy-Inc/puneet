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
import { sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize-html";
import type { AnnouncementPriority } from "@/types/announcement";
import { PRIORITY_BADGE, PRIORITY_HELP } from "./announcement-utils";

// The body as a facility will see it: through the same sanitiser the save and
// the bell use, so a tag the preview shows is a tag that will survive.
// Delivery is in-platform only, so there is one view (the email half of this
// dialog previewed a send nothing could perform).
const CONTENT_CLASS =
  "text-foreground [&_a]:text-primary mt-2 text-sm/relaxed [&_a]:underline [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:rounded-xl [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5";

function SurfaceMock({
  priority,
  title,
}: {
  priority: AnnouncementPriority;
  title: string;
}) {
  if (priority === "Urgent") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
        <span className="flex items-center gap-2">
          <Megaphone className="size-4 shrink-0" />
          <span className="font-semibold">{title || "Untitled"}</span>
        </span>
        <X className="size-4 shrink-0 opacity-60" />
      </div>
    );
  }
  if (priority === "High") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <span className="relative">
          <Bell className="size-4" />
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
        </span>
        Counts toward the bell badge, listed in the bell
      </div>
    );
  }
  return (
    <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <Bell className="size-4" />
      Listed in the notification bell
    </div>
  );
}

export function AnnouncementPreview({
  open,
  onOpenChange,
  title,
  body,
  priority,
  targetText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetText: string;
}) {
  const bodyHtml = sanitizeAnnouncementHtml(body);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>
            Exactly how this announcement reaches facilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <SurfaceMock priority={priority} title={title} />
            <div className="rounded-lg border p-4">
              <h3 className="text-base font-semibold">{title || "Untitled"}</h3>
              {bodyHtml ? (
                <div
                  className={CONTENT_CLASS}
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p className="text-muted-foreground mt-2 text-sm">
                  No content yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={cn(PRIORITY_BADGE[priority])}>
              {priority}
            </Badge>
            <span className="text-muted-foreground">{targetText}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            {PRIORITY_HELP[priority]}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
