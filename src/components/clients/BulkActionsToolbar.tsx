"use client";

import { Button } from "@/components/ui/button";
import { Mail, Smartphone, Download, Tag, X } from "lucide-react";
import { toast } from "sonner";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDeselect: () => void;
  onExport: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onDeselect,
  onExport,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-20 border-t px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount} client{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={onDeselect}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="inline size-3" /> Deselect
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Email compose would open here")}
          >
            <Mail className="size-3.5" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("SMS compose would open here")}
          >
            <Smartphone className="size-3.5" />
            SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onExport}
          >
            <Download className="size-3.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Tag picker would open here")}
          >
            <Tag className="size-3.5" />
            Tag
          </Button>
        </div>
      </div>
    </div>
  );
}
