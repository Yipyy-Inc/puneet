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
  ChevronDown,
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
    <div className="animate-in fade-in slide-in-from-right-2 ml-auto flex items-center gap-2 duration-200">
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        {selectedCount} selected
        <button
          onClick={onDeselect}
          className="hover:bg-muted -mr-0.5 rounded-full p-0.5"
        >
          <X className="size-3" />
        </button>
      </span>

      <div className="bg-border h-4 w-px" />

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() =>
          confirm("Send email", () =>
            toast.success(`Email compose opened for ${selectedCount} clients`),
          )
        }
      >
        <Mail className="size-3.5" />
        <span className="hidden lg:inline">Email</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() =>
          confirm("Send SMS", () =>
            toast.success(`SMS compose opened for ${selectedCount} clients`),
          )
        }
      >
        <Smartphone className="size-3.5" />
        <span className="hidden lg:inline">SMS</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => confirm("Export", onExport)}
      >
        <Download className="size-3.5" />
        <span className="hidden lg:inline">Export</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() =>
          confirm("Add tag", () => toast.success("Tag picker would open here"))
        }
      >
        <Tag className="size-3.5" />
        <span className="hidden lg:inline">Tag</span>
      </Button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            More
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() =>
              confirm("Remove tag", () =>
                toast.success("Tag removal picker would open here"),
              )
            }
          >
            <XCircle className="size-4" />
            Untag
          </DropdownMenuItem>
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
          <DropdownMenuItem onClick={() => toast.info("Print mailing labels")}>
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
  );
}
