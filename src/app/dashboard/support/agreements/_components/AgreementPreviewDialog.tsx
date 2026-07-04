"use client";

import { useRef } from "react";
import { FileText, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildAgreementPreviewDoc } from "@/lib/agreements/merge-preview";

/**
 * Full-page preview of an agreement template with SAMPLE data substituted for
 * every merge field. Rendered in a sandboxed iframe at document reading size;
 * "Print" hands off to the browser's print / Save-as-PDF dialog. Lazy-loaded via
 * next/dynamic from the editor.
 */
export function AgreementPreviewDialog({
  open,
  onOpenChange,
  html,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = buildAgreementPreviewDoc(html, title || "Agreement");

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            {title || "Agreement"} — preview
          </DialogTitle>
          <div className="mr-8 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Sample data
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 gap-1.5"
            >
              <Printer className="size-3.5" />
              Print / PDF
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-zinc-200/50 p-4">
          <iframe
            ref={iframeRef}
            title={`${title || "Agreement"} preview`}
            srcDoc={srcDoc}
            className="mx-auto size-full max-w-[820px] rounded-md border bg-white shadow-sm"
            sandbox="allow-same-origin allow-modals"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
