import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// The booking wizard's window (the client's mock, 2026-10-01).
//
//   ≥640px  centred, the width of the screen less a margin, up to 1280px;
//           tall enough to keep the footer in view (640–900px). Logged as a
//           §5v exception to §5i's 960px modal: the wizard holds a rail, a
//           two-column schedule and a two-column Confirm side by side.
//   <640px  a sheet from the bottom edge, nearly the full height, 24px top
//           corners (§5m: on a phone a modal is a full-height sheet).
//
// It used to inherit `sm:max-w-lg` from DialogContent, so a tablet held the
// whole wizard in 512px.
// ============================================================================

export function WizardDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // The step's own first thing — the client search, say — takes the
        // focus the dialog would give its first button (the mock opens with
        // the search field ready to type in).
        onOpenAutoFocus={(event) => {
          const first = (
            event.currentTarget as HTMLElement | null
          )?.querySelector<HTMLElement>("[data-autofocus]");
          if (!first) return;
          event.preventDefault();
          first.focus();
        }}
        className="bg-background flex max-h-[min(900px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:h-[calc(100dvh-12px)] max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-0 max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 sm:h-[calc(100dvh-110px)] sm:min-h-[min(640px,calc(100dvh-2rem))] sm:w-[calc(100vw-3rem)] sm:max-w-[1280px] sm:rounded-3xl md:gap-0 md:p-0"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        ) : null}
        <div className="flex min-h-0 flex-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
