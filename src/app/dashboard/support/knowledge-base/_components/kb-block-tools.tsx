"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  ListChecks,
  Table as TableIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CalloutType } from "@/lib/tiptap/kb-callout";

const CALLOUTS: {
  type: CalloutType;
  label: string;
  icon: typeof Info;
  className: string;
}[] = [
  { type: "info", label: "Info", icon: Info, className: "text-blue-600" },
  {
    type: "warning",
    label: "Warning",
    icon: AlertTriangle,
    className: "text-amber-600",
  },
  {
    type: "success",
    label: "Success",
    icon: CheckCircle2,
    className: "text-emerald-600",
  },
  {
    type: "danger",
    label: "Danger",
    icon: AlertOctagon,
    className: "text-rose-600",
  },
];

const MAX_ROWS = 6;
const MAX_COLS = 8;

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

export function KbBlockTools({ editor }: { editor: Editor }) {
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [tableOpen, setTableOpen] = useState(false);

  const insertSteps = () => {
    if (editor.isActive("step")) editor.chain().focus().addStep().run();
    else editor.chain().focus().setSteps().run();
  };

  const insertTable = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    setTableOpen(false);
    setHover({ r: 0, c: 0 });
  };

  return (
    <>
      {/* Callout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insert callout"
            title="Insert callout"
            onMouseDown={(e) => e.preventDefault()}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
          >
            <Info className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CALLOUTS.map((c) => {
            const Icon = c.icon;
            return (
              <DropdownMenuItem
                key={c.type}
                onClick={() => editor.chain().focus().setCallout(c.type).run()}
              >
                <Icon className={cn("size-4", c.className)} />
                {c.label} callout
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Steps */}
      <ToolbarButton label="Step-by-step block" onClick={insertSteps}>
        <ListChecks className="size-4" />
      </ToolbarButton>

      {/* Table */}
      <Popover open={tableOpen} onOpenChange={setTableOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Insert table"
            title="Insert table"
            onMouseDown={(e) => e.preventDefault()}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
          >
            <TableIcon className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1rem)` }}
            onMouseLeave={() => setHover({ r: 0, c: 0 })}
          >
            {Array.from({ length: MAX_ROWS }).map((_, r) =>
              Array.from({ length: MAX_COLS }).map((__, c) => {
                const active = r < hover.r && c < hover.c;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                    onClick={() => insertTable(r + 1, c + 1)}
                    className={cn(
                      "size-4 rounded-[3px] border",
                      active
                        ? "border-primary bg-primary/30"
                        : "border-muted-foreground/20 hover:border-primary/50",
                    )}
                  />
                );
              }),
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Select size"}
          </p>
        </PopoverContent>
      </Popover>
    </>
  );
}
