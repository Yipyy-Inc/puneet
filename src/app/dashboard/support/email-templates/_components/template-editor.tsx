"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Italic, Link2, List, Underline } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TemplateEditorHandle {
  /** Insert text (e.g. a merge tag) at the current caret. */
  insert: (text: string) => void;
}

const TOOLS: { cmd: string; icon: typeof Bold; label: string }[] = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
];

/** Lightweight rich-text editor (contentEditable + execCommand). Uncontrolled,
 *  seeded once from initialValue; exposes insert() so the merge-tags panel can
 *  drop a {{tag}} at the caret. The parent keys it per template so switching
 *  templates remounts with fresh content. */
export const TemplateEditor = forwardRef<
  TemplateEditorHandle,
  { initialValue: string; onChange: (html: string) => void }
>(function TemplateEditor({ initialValue, onChange }, ref) {
  const elRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && elRef.current) {
      initialized.current = true;
      elRef.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  function sync() {
    if (elRef.current) onChange(elRef.current.innerHTML);
  }

  function exec(cmd: string) {
    document.execCommand(cmd, false);
    elRef.current?.focus();
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) {
      document.execCommand("createLink", false, url);
      sync();
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      insert: (text: string) => {
        const el = elRef.current;
        if (!el) return;
        el.focus();
        document.execCommand("insertText", false, text);
        onChange(el.innerHTML);
      },
    }),
    [onChange],
  );

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
        ref={elRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className={cn(
          "min-h-[300px] px-3 py-2.5 text-sm/relaxed outline-none",
          "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
        )}
      />
    </div>
  );
});
