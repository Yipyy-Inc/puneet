"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * Full-screen invoice preview. Renders the same document HTML as the small
 * side-panel preview, but at real reading size so every detail is verifiable.
 * Lazy-loaded via next/dynamic from InvoiceTemplateSettings.
 */
export function InvoiceFullPreviewDialog({
  open,
  onOpenChange,
  html,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
}) {
  const t = useSettingsText().section("invoice-template");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            {t("fullPreviewTitle")}
          </DialogTitle>
          <Badge variant="outline" className="mr-8 text-[10px]">
            {t("sampleData")}
          </Badge>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-zinc-200/50 p-4">
          <iframe
            title={t("fullPreviewTitle")}
            srcDoc={html}
            className="mx-auto size-full max-w-[820px] rounded-md border bg-white shadow-sm"
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
