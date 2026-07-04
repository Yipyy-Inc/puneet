"use client";

import { useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontSize } from "@/lib/tiptap/font-size";
import { Indent } from "@/lib/tiptap/indent";
import { KbImage } from "@/lib/tiptap/kb-image";
import { KbVideo } from "@/lib/tiptap/kb-video";
import { Tooltip } from "@/lib/tiptap/tooltip-mark";
import { HeadingAnchor } from "@/lib/tiptap/heading-anchor";
import { KbCallout } from "@/lib/tiptap/kb-callout";
import { KbSteps, KbStep } from "@/lib/tiptap/kb-steps";
import { KbMediaTools } from "./kb-media-tools";
import { KbBlockTools } from "./kb-block-tools";
import styles from "./kb-editor.module.css";

const lowlight = createLowlight(common);

type FontOption =
  | { label: string; kind: "size"; value: string }
  | { label: string; kind: "normal" }
  | { label: string; kind: "heading"; level: 1 | 2 | 3 };

const FONT_OPTIONS: FontOption[] = [
  { label: "Small", kind: "size", value: "13px" },
  { label: "Normal", kind: "normal" },
  { label: "Large", kind: "size", value: "18px" },
  { label: "H1", kind: "heading", level: 1 },
  { label: "H2", kind: "heading", level: 2 },
  { label: "H3", kind: "heading", level: 3 },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-active={active || undefined}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "hover:bg-muted text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors",
        "data-active:bg-primary/10 data-active:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Reads live editor state off a stable reference; opt out of the compiler so
  // active button states stay accurate.
  "use no memo";

  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);

  const currentFontLabel = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
      ? "H2"
      : editor.isActive("heading", { level: 3 })
        ? "H3"
        : editor.getAttributes("textStyle").fontSize === "18px"
          ? "Large"
          : editor.getAttributes("textStyle").fontSize === "13px"
            ? "Small"
            : "Normal";

  const applyFont = (opt: FontOption) => {
    const chain = editor.chain().focus();
    if (opt.kind === "heading") {
      chain.unsetFontSize().setHeading({ level: opt.level }).run();
    } else if (opt.kind === "normal") {
      chain.setParagraph().unsetFontSize().run();
    } else {
      chain.setParagraph().setFontSize(opt.value).run();
    }
  };

  const increaseIndent = () => {
    if (editor.can().sinkListItem("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
    } else {
      editor.chain().focus().increaseIndent().run();
    }
  };
  const decreaseIndent = () => {
    if (editor.can().liftListItem("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
    } else {
      editor.chain().focus().decreaseIndent().run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
      {/* Font size / heading */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
            <Type className="size-3.5" />
            <span className="text-xs font-medium">{currentFontLabel}</span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FONT_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.label} onClick={() => applyFont(opt)}>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>

      {/* Text color */}
      <ToolbarButton
        label="Text color"
        onClick={() => textColorRef.current?.click()}
      >
        <span className="flex flex-col items-center leading-none">
          <span className="text-[11px] font-semibold">A</span>
          <span
            className="mt-0.5 h-1 w-3.5 rounded-sm"
            style={{
              background: editor.getAttributes("textStyle").color || "#1f2937",
            }}
          />
        </span>
      </ToolbarButton>
      <input
        ref={textColorRef}
        type="color"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />

      {/* Highlight */}
      <ToolbarButton
        label="Highlight color"
        active={editor.isActive("highlight")}
        onClick={() => highlightRef.current?.click()}
      >
        <Highlighter className="size-4" />
      </ToolbarButton>
      <input
        ref={highlightRef}
        type="color"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .toggleHighlight({ color: e.target.value })
            .run()
        }
      />

      <ToolbarButton
        label="Clear formatting"
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
      >
        <RemoveFormatting className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Structure */}
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Decrease indent" onClick={decreaseIndent}>
        <IndentDecrease className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Increase indent" onClick={increaseIndent}>
        <IndentIncrease className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Block quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <KbMediaTools editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <KbBlockTools editor={editor} />
    </div>
  );
}

/** TipTap-based WYSIWYG editor for KB article bodies. Uncontrolled: seeded once
 *  from `initialValue`, emits HTML via `onChange` (persisted by the parent to
 *  the KB articles store). */
export function KbRichEditor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Indent,
      HeadingAnchor,
      KbImage,
      KbVideo,
      Tooltip,
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { rel: "noopener noreferrer", class: "kb-link" },
      }),
      KbCallout,
      KbSteps,
      KbStep,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialValue,
    editorProps: { attributes: { class: "px-3 py-2.5" } },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  return (
    <div className="focus-within:border-ring focus-within:ring-ring/30 rounded-lg border transition-shadow focus-within:ring-[3px]">
      {editor ? <Toolbar editor={editor} /> : null}
      <div className={styles.canvas}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
