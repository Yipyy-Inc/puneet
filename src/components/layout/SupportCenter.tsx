"use client";

import { useState } from "react";
import { Headset } from "lucide-react";

import { HelpFaqsTab } from "@/components/support/help-faqs-tab";
import { SubmitTicketTab } from "@/components/support/submit-ticket-tab";
import { SupportChatTab } from "@/components/support/support-chat-tab";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Persistent "Yipyy Support" entry point for the facility top nav. Opens the
 * Support Center drawer in place (no navigation), with live chat, ticket
 * submission and searchable help articles.
 */
export function SupportCenter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Yipyy Support"
        className="h-10 gap-2 rounded-xl px-2.5 sm:px-3"
      >
        <Headset className="text-muted-foreground size-5" />
        <span className="hidden text-sm font-medium sm:inline">Support</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white">
                <Headset className="size-4" />
              </span>
              Support Center
            </SheetTitle>
            <SheetDescription>
              Get help from the Yipyy support team without leaving this page.
            </SheetDescription>
          </SheetHeader>

          <Tabs
            defaultValue="chat"
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
        </SheetContent>
      </Sheet>
    </>
  );
}
