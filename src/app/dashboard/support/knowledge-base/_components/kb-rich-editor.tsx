"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading, Italic, Link2, List, Underline } from "lucide-react";

import { cn } from "@/lib/utils";

const TOOLS: { cmd: string; arg?: string; icon: typeof Bold; label: string }[] =
  [
    { cmd: "bold", icon: Bold, label: "Bold" },
    { cmd: "italic", icon: Italic, label: "Italic" },
    { cmd: "underline", icon: Underline, label: "Underline" },
    { cmd: "formatBlock", arg: "H3", icon: Heading, label: "Heading" },
    { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
  ];

/** WYSIWYG editor for KB article bodies (contentEditable + execCommand). No
 *  rich-text library in the repo; uncontrolled, seeded once, emits HTML. */
export function KbRichEditor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (html: string) => void;
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

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
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
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              aria-label={t.label}
              title={t.label}
              onMouseDown={(e) => {
                e.preventDefault();
                exec(t.cmd, t.arg);
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
        aria-label="Article body"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className={cn(
          "min-h-[340px] px-3 py-2.5 text-sm/relaxed outline-none",
          "[&_a]:text-primary [&_a]:underline [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        )}
      />
    </div>
  );
}
