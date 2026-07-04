"use client";

import { useMemo } from "react";
import { Bell, Mail, Megaphone, Smartphone, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  AnnouncementPriority,
  DeliveryMethod,
} from "@/types/announcement";
import {
  DELIVERY_LABEL,
  PRIORITY_BADGE,
  PRIORITY_HELP,
} from "./announcement-utils";

// Facility-portal content styling — images at natural size (capped to the
// container) and videos as playable embeds. Mirrors the notification feed.
const CONTENT_CLASS =
  "text-foreground/90 [&_a]:text-primary mt-2 text-sm/relaxed [&_a]:underline [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_ul]:list-disc [&_ul]:pl-5 [&_video]:h-auto [&_video]:max-w-full";

/**
 * Email body: keeps text and images, but replaces every video (iframe/<video>)
 * with a "View full announcement" button — videos can't be delivered by email
 * (Task 15 rule). Returns whether any video was replaced.
 */
function buildEmailBody(html: string): { html: string; hadVideo: boolean } {
  if (typeof window === "undefined" || !html) {
    return { html, hadVideo: /<iframe|<video/i.test(html) };
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const media = doc.querySelectorAll("iframe, video");
  const hadVideo = media.length > 0;
  media.forEach((el) => {
    const wrapper = el.parentElement;
    // Replace the media's single-purpose wrapper div if it only holds the media.
    const target =
      wrapper && wrapper !== doc.body && wrapper.children.length === 1
        ? wrapper
        : el;
    const cta = doc.createElement("div");
    cta.setAttribute("style", "margin:12px 0");
    cta.innerHTML =
      '<span style="display:inline-block;padding:9px 16px;background:#4f46e5;color:#ffffff;border-radius:8px;font-weight:600;font-size:13px">▶ View full announcement</span>';
    target.replaceWith(cta);
  });
  return { html: doc.body.innerHTML, hadVideo };
}

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
        Yellow bell badge + notification dropdown
      </div>
    );
  }
  return (
    <div className="text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <Bell className="size-4" />
      Notification dropdown only
    </div>
  );
}

function PanelHeading({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
      {icon}
      {label}
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
  const showInPlatform =
    deliveryMethod === "both" || deliveryMethod === "in_platform";
  const showEmail = deliveryMethod === "both" || deliveryMethod === "email";
  const both = deliveryMethod === "both";

  const { html: emailHtml, hadVideo } = useMemo(
    () => buildEmailBody(body),
    [body],
  );

  const bodyHtml =
    body || "<p class='text-muted-foreground'>No content yet.</p>";

  const inPlatformView = (
    <div className="space-y-3">
      <SurfaceMock priority={priority} title={title} />
      <div className="rounded-lg border p-4">
        <h3 className="text-base font-semibold">{title || "Untitled"}</h3>
        <div
          className={CONTENT_CLASS}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>
  );

  const emailView = (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/40 space-y-0.5 border-b px-4 py-2 text-xs">
          <p>
            <span className="text-muted-foreground">From:</span> Yipyy
            &lt;announcements@yipyy.com&gt;
          </p>
          <p>
            <span className="text-muted-foreground">Subject:</span>{" "}
            <span className="font-medium">{title || "Untitled"}</span>
          </p>
        </div>
        <div className="p-4">
          <h3 className="text-base font-semibold">{title || "Untitled"}</h3>
          <div
            className={CONTENT_CLASS}
            dangerouslySetInnerHTML={{
              __html:
                emailHtml ||
                "<p class='text-muted-foreground'>No content yet.</p>",
            }}
          />
        </div>
      </div>
      {hadVideo && (
        <p className="text-muted-foreground text-xs">
          Video isn’t sent by email — recipients get a “View full announcement”
          button that opens the in-platform version.
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100vh-4rem)] overflow-y-auto",
          both ? "sm:max-w-4xl" : "sm:max-w-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>
            {both
              ? "How this announcement appears in-platform and by email, side by side."
              : "Exactly how this announcement reaches facilities."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={cn("grid gap-4", both && "md:grid-cols-2")}>
            {showInPlatform && (
              <div className="space-y-2">
                <PanelHeading
                  icon={<Smartphone className="size-3.5" />}
                  label="In-platform"
                />
                {inPlatformView}
              </div>
            )}
            {showEmail && (
              <div className="space-y-2">
                <PanelHeading
                  icon={<Mail className="size-3.5" />}
                  label="Email"
                />
                {emailView}
              </div>
            )}
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
