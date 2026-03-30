"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Smartphone,
  Download,
  Tag,
  XCircle,
  UserCog,
  X,
  ChevronUp,
  Users,
  Send,
  Printer,
  GitMerge,
  Trash2,
} from "lucide-react";
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

  const confirm = (action: string, cb: () => void) => {
    if (
      window.confirm(
        `${action} for ${selectedCount} client${selectedCount !== 1 ? "s" : ""}?`,
      )
    ) {
      cb();
    }
  };

  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 animate-in slide-in-from-bottom-4 fixed right-0 bottom-0 left-0 z-30 border-t px-4 py-3 shadow-lg backdrop-blur-sm duration-200 md:left-[var(--sidebar-width,0px)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount} client{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={onDeselect}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <X className="size-3" />
            Deselect
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              confirm("Send email", () =>
                toast.success(
                  `Email compose opened for ${selectedCount} clients`,
                ),
              )
            }
          >
            <Mail className="size-3.5" />
            <span className="hidden sm:inline">Email</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              confirm("Send SMS", () =>
                toast.success(
                  `SMS compose opened for ${selectedCount} clients`,
                ),
              )
            }
          >
            <Smartphone className="size-3.5" />
            <span className="hidden sm:inline">SMS</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => confirm("Export", onExport)}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              confirm("Add tag", () =>
                toast.success("Tag picker would open here"),
              )
            }
          >
            <Tag className="size-3.5" />
            <span className="hidden sm:inline">Tag</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              confirm("Remove tag", () =>
                toast.success("Tag removal picker would open here"),
              )
            }
          >
            <XCircle className="size-3.5" />
            <span className="hidden sm:inline">Untag</span>
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                More
                <ChevronUp className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() =>
                  confirm("Change status", () =>
                    toast.success("Status change dialog would open"),
                  )
                }
              >
                <UserCog className="size-4" />
                Change Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => toast.info("Create segment from selection")}
              >
                <Users className="size-4" />
                Create Marketing Segment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Send campaign to selection")}
              >
                <Send className="size-4" />
                Send Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Print mailing labels")}
              >
                <Printer className="size-4" />
                Print Mailing Labels
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Merge duplicate accounts")}
              >
                <GitMerge className="size-4" />
                Merge Duplicates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  confirm("DELETE", () =>
                    toast.error(`${selectedCount} clients would be deleted`),
                  )
                }
              >
                <Trash2 className="size-4" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
