"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";
import {
  resolveTemplate,
  getMockPreviewData,
  type VariableDataContext,
} from "@/lib/template-variable-resolver";

interface TemplatePreviewPanelProps {
  template: string;
  subject?: string;
  previewData?: VariableDataContext;
  emptyMessage?: string;
}

const IS_VARIABLE = /^\{\{[a-z_]+(?:\|[^}]*)?\}\}$/;
const VARIABLE_SPLIT_PATTERN = /(\{\{[a-z_]+(?:\|[^}]*)?\}\})/g;

let _defaultPreviewData: VariableDataContext | null = null;
function getDefaultPreviewData(): VariableDataContext {
  if (!_defaultPreviewData) {
    _defaultPreviewData = getMockPreviewData();
  }
  return _defaultPreviewData;
}

function HighlightedTemplate({ text }: { text: string }) {
  const parts = text.split(VARIABLE_SPLIT_PATTERN);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        IS_VARIABLE.test(part) ? (
          <span
            key={i}
            className="rounded-sm bg-amber-100 px-1 py-0.5 font-mono text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export function TemplatePreviewPanel({
  template,
  subject,
  previewData,
  emptyMessage = "Start typing to see a preview",
}: TemplatePreviewPanelProps) {
  const [mode, setMode] = useState<"preview" | "template">("preview");
  const data = useMemo(
    () => previewData ?? getDefaultPreviewData(),
    [previewData],
  );

  const resolvedBody = useMemo(
    () => resolveTemplate(template, data),
    [template, data],
  );
  const resolvedSubject = useMemo(
    () => (subject ? resolveTemplate(subject, data) : undefined),
    [subject, data],
  );

  const petName = data.pets?.[0]?.name ?? "customer";

  if (!template.trim()) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-muted-foreground py-6 text-center text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Preview for {petName}&apos;s booking
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={mode === "preview" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setMode("preview")}
            >
              <Eye className="size-3" />
              Preview
            </Button>
            <Button
              variant={mode === "template" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setMode("template")}
            >
              <Code className="size-3" />
              Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {resolvedSubject !== undefined && (
          <div className="mb-3 border-b pb-2">
            <p className="text-muted-foreground mb-0.5 text-xs font-medium">
              Subject
            </p>
            <p className="text-sm font-medium">
              {mode === "preview" ? (
                resolvedSubject
              ) : (
                <HighlightedTemplate text={subject!} />
              )}
            </p>
          </div>
        )}
        <div className="text-sm/relaxed">
          {mode === "preview" ? (
            <span className="whitespace-pre-wrap">{resolvedBody}</span>
          ) : (
            <HighlightedTemplate text={template} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
