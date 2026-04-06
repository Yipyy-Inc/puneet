"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Pin } from "lucide-react";
import type { Note, NoteVisibility, PetNoteSubType } from "@/data/tags-notes";
import { useAiText } from "@/hooks/use-ai-text";
import { AiGenerateButton } from "@/components/shared/AiGenerateButton";

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (params: {
    content: string;
    visibility: NoteVisibility;
    subType?: PetNoteSubType;
    isPinned: boolean;
  }) => void;
  /** If provided, we're in edit mode */
  editNote?: Note;
  /** Show sub-type selector (only for pet notes) */
  showSubType?: boolean;
  title?: string;
}

export function AddNoteModal({
  open,
  onOpenChange,
  onSave,
  editNote,
  showSubType = false,
  title,
}: AddNoteModalProps) {
  const [content, setContent] = useState(editNote?.content ?? "");
  const [visibility, setVisibility] = useState<NoteVisibility>(
    editNote?.visibility ?? "internal",
  );
  const [subType, setSubType] = useState<PetNoteSubType>(
    editNote?.subType ?? "general",
  );
  const [isPinned, setIsPinned] = useState(editNote?.isPinned ?? false);
  const ai = useAiText({ type: "staff_note", maxWords: 80 });

  const isEdit = !!editNote;
  const modalTitle = title ?? (isEdit ? "Edit Note" : "Add Note");

  function handleSave() {
    if (!content.trim()) return;
    onSave({
      content: content.trim(),
      visibility,
      subType: showSubType ? subType : undefined,
      isPinned,
    });
    // Reset form
    setContent("");
    setVisibility("internal");
    setSubType("general");
    setIsPinned(false);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      type="form"
      title={modalTitle}
      size="md"
      actions={{
        primary: {
          label: isEdit ? "Save Changes" : "Add Note",
          onClick: handleSave,
          disabled: !content.trim(),
        },
        secondary: {
          label: "Cancel",
          onClick: () => onOpenChange(false),
        },
      }}
    >
      <div className="space-y-4">
        {/* Sub-type selector (pet notes only) */}
        {showSubType && (
          <div className="space-y-1.5">
            <Label htmlFor="note-subtype" className="text-sm">
              Note Type
            </Label>
            <Select
              value={subType}
              onValueChange={(v) => setSubType(v as PetNoteSubType)}
            >
              <SelectTrigger id="note-subtype" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="behavior">Behavior</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="feeding">Feeding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="note-content" className="text-sm">
              Note
            </Label>
            <AiGenerateButton
              onClick={async () => {
                const result = await ai.generate({
                  noteType: showSubType ? subType : "general",
                  subjectName: title ?? "Note",
                });
                if (result) setContent(result);
              }}
              isGenerating={ai.isGenerating}
            />
          </div>
          <Textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={5}
            className="min-h-[140px] resize-y text-sm/7"
          />
        </div>

        {/* Visibility + Pin controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {visibility === "internal" ? (
              <EyeOff className="text-muted-foreground size-4" />
            ) : (
              <Eye className="text-primary size-4" />
            )}
            <Label className="cursor-pointer text-sm" htmlFor="note-visibility">
              {visibility === "internal"
                ? "Internal only"
                : "Visible to customer"}
            </Label>
            <Switch
              id="note-visibility"
              checked={visibility === "shared_with_customer"}
              onCheckedChange={(checked) =>
                setVisibility(checked ? "shared_with_customer" : "internal")
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Pin className="text-muted-foreground size-4" />
            <Label className="cursor-pointer text-sm" htmlFor="note-pin">
              Pin
            </Label>
            <Switch
              id="note-pin"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
