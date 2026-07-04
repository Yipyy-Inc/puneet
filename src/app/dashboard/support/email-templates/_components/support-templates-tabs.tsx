"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplatesClient } from "./email-templates-client";
import { SavedRepliesManager } from "./saved-replies-manager";

/**
 * Two-tab support content area:
 *  • Transactional Templates — automated emails (dunning, onboarding, …).
 *  • Saved Replies — manual chat/support responses that feed the composer "/".
 * Managed separately but related; live on the same page.
 */
export function SupportTemplatesTabs() {
  return (
    <Tabs defaultValue="templates" className="flex h-full flex-col gap-0">
      <div className="border-b px-4 pt-3">
        <TabsList>
          <TabsTrigger value="templates">Transactional Templates</TabsTrigger>
          <TabsTrigger value="replies">Saved Replies</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="templates" className="min-h-0 flex-1">
        <EmailTemplatesClient />
      </TabsContent>
      <TabsContent value="replies" className="min-h-0 flex-1 overflow-y-auto">
        <SavedRepliesManager />
      </TabsContent>
    </Tabs>
  );
}
