"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Link2, List, Underline } from "lucide-react";

import { cn } from "@/lib/utils";

const TOOLS: { cmd: string; icon: typeof Bold; label: string }[] = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
];

/** Lightweight rich-text editor (no rich-text library in the repo). Uncontrolled
 *  contentEditable seeded once from `initialValue`; emits HTML via onChange. The
 *  parent keys it per announcement so editing a different one remounts. */
export function RichTextEditor({
  initialValue,
  onChange,
  placeholder = "Write your announcement…",
}: {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && ref.current) {
      initialized.current = true;
      ref.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  function sync() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    ref.current?.focus();
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) {
      document.execCommand("createLink", false, url);
      sync();
    }
  }

  return (
    <div className="focus-within:border-ring focus-within:ring-ring/30 rounded-lg border transition-shadow focus-within:ring-[3px]">
      <div className="flex items-center gap-0.5 border-b p-1.5">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.cmd}
              type="button"
              aria-label={t.label}
              title={t.label}
              onMouseDown={(e) => {
                e.preventDefault();
                exec(t.cmd);
              }}
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <Icon className="size-4" />
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Insert link"
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            addLink();
          }}
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <Link2 className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Announcement body"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[260px] px-3 py-2.5 text-sm/relaxed outline-none",
          "empty:before:text-muted-foreground empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)]",
          "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
        )}
      />
    </div>
  );
}
