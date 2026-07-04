"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  History,
  Library,
  Save,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontSize } from "@/lib/tiptap/font-size";
import { ResizableImage } from "@/lib/tiptap/resizable-image";
import { MergeField } from "@/lib/tiptap/merge-field";
import { SignatureBlock } from "@/lib/tiptap/signature-block";
import {
  saveAgreementTemplate,
  agreementQueries,
  type AgreementDocumentType,
  type AgreementTemplate,
  type AgreementTemplateVersion,
} from "@/lib/api/agreements";
import { EditorToolbar } from "./EditorToolbar";
import { ClauseLibraryDrawer } from "./ClauseLibraryDrawer";
import {
  AgreementSettingsPanel,
  type AgreementSettingsValues,
} from "./AgreementSettingsPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import styles from "./agreement-editor.module.css";

const AgreementPreviewDialog = dynamic(
  () =>
    import("./AgreementPreviewDialog").then((m) => m.AgreementPreviewDialog),
  { ssr: false },
);

// No auth layer yet; the platform admin is the author of every version.
const CURRENT_AUTHOR = "Platform Admin";

type RightPanel = "settings" | "versions" | "clauses" | null;

export function AgreementTemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template?: AgreementTemplate | null;
  onClose: () => void;
  onSaved?: (template: AgreementTemplate) => void;
}) {
  const queryClient = useQueryClient();

  // Persisted id (null until the first save of a brand-new template).
  const [savedId, setSavedId] = useState<string | null>(template?.id ?? null);
  const [currentVersion, setCurrentVersion] = useState(template?.version ?? 0);

  const [name, setName] = useState(template?.name ?? "");
  const [type, setType] = useState<AgreementDocumentType>(
    template?.type ?? "Agreement",
  );
  const [description, setDescription] = useState(template?.description ?? "");
  const [expiresAt, setExpiresAt] = useState<string | null>(
    template?.expiresAt ?? null,
  );

  const [rightPanel, setRightPanel] = useState<RightPanel>("settings");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage,
      MergeField,
      SignatureBlock,
      Placeholder.configure({
        placeholder:
          "Start writing the agreement, or insert a clause from the library on the right…",
      }),
    ],
    content: template?.content ?? "",
    editorProps: {
      attributes: { class: "px-10 py-8" },
    },
  });

  const togglePanel = (panel: Exclude<RightPanel, null>) =>
    setRightPanel((current) => (current === panel ? null : panel));

  const applySettings = (patch: Partial<AgreementSettingsValues>) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.type !== undefined) setType(patch.type);
    if (patch.description !== undefined) setDescription(patch.description);
    if ("expiresAt" in patch) setExpiresAt(patch.expiresAt ?? null);
  };

  const handleSave = () => {
    if (!editor) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the template a name before saving.");
      setRightPanel("settings");
      return;
    }

    const id = savedId ?? crypto.randomUUID();

    const saved = saveAgreementTemplate({
      id,
      name: trimmed,
      type,
      status: template?.status ?? "draft",
      content: editor.getHTML(),
      description: description.trim(),
      expiresAt,
      author: CURRENT_AUTHOR,
      savedAt: new Date().toISOString(),
    });

    setSavedId(id);
    setCurrentVersion(saved.version);
    queryClient.invalidateQueries({
      queryKey: agreementQueries.templates().queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: agreementQueries.versions(id).queryKey,
    });
    toast.success(`Saved “${saved.name}” · v${saved.version}`);
    onSaved?.(saved);
  };

  const handleRestore = (version: AgreementTemplateVersion) => {
    editor?.commands.setContent(version.content);
    setName(version.name);
    setType(version.type);
    setDescription(version.description);
    setExpiresAt(version.expiresAt);
    toast.info(
      `Restored version ${version.version}. Save to keep it as a new version.`,
    );
  };

  const openPreview = () => {
    if (!editor) return;
    setPreviewHtml(editor.getHTML());
    setPreviewOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Templates
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">
            {name.trim() || "Untitled agreement template"}
          </h1>
          <Badge variant="outline" className="shrink-0">
            {type}
          </Badge>
          {currentVersion > 0 ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              v{currentVersion}
            </Badge>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={openPreview}
          className="gap-1.5"
        >
          <Eye className="size-4" />
          Preview
        </Button>
        <Button
          variant={rightPanel === "settings" ? "secondary" : "outline"}
          size="sm"
          onClick={() => togglePanel("settings")}
          className="gap-1.5"
        >
          <Settings2 className="size-4" />
          Settings
        </Button>
        <Button
          variant={rightPanel === "versions" ? "secondary" : "outline"}
          size="sm"
          onClick={() => togglePanel("versions")}
          className="gap-1.5"
        >
          <History className="size-4" />
          Versions
        </Button>
        <Button
          variant={rightPanel === "clauses" ? "secondary" : "outline"}
          size="sm"
          onClick={() => togglePanel("clauses")}
          className="gap-1.5"
        >
          <Library className="size-4" />
          Clauses
        </Button>
        <Button size="sm" onClick={handleSave} className="gap-1.5">
          <Save className="size-4" />
          Save
        </Button>
      </div>

      {/* Body: toolbar + canvas + contextual right panel */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {editor ? <EditorToolbar editor={editor} /> : null}
          <div className="bg-muted/30 flex-1 overflow-auto p-6">
            <div
              className={`${styles.canvas} mx-auto min-h-full max-w-[820px] rounded-md border bg-white shadow-sm`}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {rightPanel === "settings" ? (
          <AgreementSettingsPanel
            values={{ name, type, description, expiresAt }}
            onChange={applySettings}
            onClose={() => setRightPanel(null)}
          />
        ) : null}
        {rightPanel === "versions" ? (
          <VersionHistoryPanel
            templateId={savedId}
            currentVersion={currentVersion}
            onRestore={handleRestore}
            onClose={() => setRightPanel(null)}
          />
        ) : null}
        {rightPanel === "clauses" && editor ? (
          <ClauseLibraryDrawer
            editor={editor}
            onClose={() => setRightPanel(null)}
          />
        ) : null}
      </div>

      {previewOpen ? (
        <AgreementPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          html={previewHtml}
          title={name.trim() || "Agreement"}
        />
      ) : null}
    </div>
  );
}
