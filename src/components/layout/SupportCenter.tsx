"use client";

import { Headset, X } from "lucide-react";

import { HelpFaqsTab } from "@/components/support/help-faqs-tab";
import { SubmitTicketTab } from "@/components/support/submit-ticket-tab";
import { SupportChatTab } from "@/components/support/support-chat-tab";
import {
  setSupportDrawerOpen,
  setSupportDrawerTab,
  useSupportDrawer,
  type SupportDrawerTab,
} from "@/lib/support-drawer-store";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Facility Support Center (FB-3) — a floating card anchored to the Support FAB
 * (FB-2) in the bottom-right corner. Implemented as a NON-modal `Popover`: the
 * underlying page stays fully visible and usable, and the card floats on top
 * (~380×560, rounded, drop shadow) without pushing layout or spanning full
 * height. It slides in from the bottom-right. Closes via the X button or an
 * outside click — interactions with the FAB (which toggles it) and with nested
 * Radix popovers (e.g. the ticket Category select, which portals outside the
 * card) are excluded so they don't dismiss it. Opened programmatically through
 * the support-drawer store (FAB, Help Center, etc.).
 */
export function SupportCenter() {
  const { open, tab } = useSupportDrawer();

  return (
    <Popover open={open} onOpenChange={setSupportDrawerOpen} modal={false}>
      {/* Invisible anchor pinned to the FAB's location, bottom-right. */}
      <PopoverAnchor asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed right-6 bottom-6 size-12"
        />
      </PopoverAnchor>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // A click on the FAB must not dismiss the card — the FAB toggles it.
          const target = e.detail.originalEvent.target as Element | null;
          if (target?.closest("[data-support-fab]")) e.preventDefault();
        }}
        className="flex h-[560px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b p-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white">
                <Headset className="size-4" />
              </span>
              Support Center
            </h2>
            <p className="text-muted-foreground text-xs">
              Get help from the Yipyy support team without leaving this page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSupportDrawerOpen(false)}
            aria-label="Close Support Center"
            className="text-muted-foreground hover:bg-muted hover:text-foreground -mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setSupportDrawerTab(v as SupportDrawerTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="shrink-0 border-b px-3">
            <TabsTrigger
              value="chat"
              className="flex-1 justify-center px-2 text-xs"
            >
              Chat with Yipyy
            </TabsTrigger>
            <TabsTrigger
              value="ticket"
              className="flex-1 justify-center px-2 text-xs"
            >
              Submit a Ticket
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="flex-1 justify-center px-2 text-xs"
            >
              Help &amp; FAQs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
            <SupportChatTab />
          </TabsContent>
          <TabsContent
            value="ticket"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <SubmitTicketTab />
          </TabsContent>
          <TabsContent value="faq" className="flex min-h-0 flex-1 flex-col">
            <HelpFaqsTab />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
