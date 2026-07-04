"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Pilcrow,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MERGE_FIELDS } from "@/lib/tiptap/merge-field";
import type { SignerRole } from "@/lib/tiptap/signature-block";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"];

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "15px" },
  { label: "Medium", value: "18px" },
  { label: "Large", value: "24px" },
  { label: "Extra large", value: "30px" },
];

const SIGNER_ROLES: SignerRole[] = ["Facility Owner", "Yipyy Representative"];

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-active={active || undefined}
      className={cn(
        "hover:bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        "data-active:bg-primary/10 data-active:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1 h-6" />;
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  // Opt this component out of the React Compiler: it reads live editor state
  // (editor.isActive/getAttributes) off a stable `editor` reference, which the
  // compiler would otherwise memoize into stale active-button highlighting.
  "use no memo";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);

  const currentBlock = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
      ? "H2"
      : editor.isActive("heading", { level: 3 })
        ? "H3"
        : "Paragraph";

  const handleImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only PNG or JPG images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large. Maximum size is 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src === "string") {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.onerror = () => toast.error("Could not read that image file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b p-2">
      {/* Block / heading selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
            <span className="text-xs font-medium">{currentBlock}</span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow className="size-4" /> Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-4" /> Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" /> Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-4" /> Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
            <Type className="size-3.5" />
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {FONT_SIZES.map((size) => (
            <DropdownMenuItem
              key={size.value}
              onClick={() =>
                editor.chain().focus().setFontSize(size.value).run()
              }
            >
              <span style={{ fontSize: size.value }}>{size.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetFontSize().run()}
          >
            Reset size
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarDivider />

      {/* Inline marks */}
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

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists + divider */}
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Image */}
      <ToolbarButton
        label="Insert image"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className="size-4" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          handleImageFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <ToolbarDivider />

      {/* Merge fields — dynamic tokens filled when the agreement is sent */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
            <Braces className="size-3.5" />
            <span className="text-xs font-medium">Field</span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Insert merge field</DropdownMenuLabel>
          {MERGE_FIELDS.map((field) => (
            <DropdownMenuItem
              key={field.token}
              onClick={() =>
                editor.chain().focus().insertMergeField(field.token).run()
              }
            >
              <span className="flex flex-col">
                <span>{field.label}</span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {`{{${field.token}}}`}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Signature blocks — multiple signers allowed per document */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
            <PenLine className="size-3.5" />
            <span className="text-xs font-medium">Signature</span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Insert signature block</DropdownMenuLabel>
          {SIGNER_ROLES.map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertSignatureBlock({
                    id: crypto.randomUUID(),
                    signerRole: role,
                  })
                  .run()
              }
            >
              <PenLine className="size-4" />
              {role}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
