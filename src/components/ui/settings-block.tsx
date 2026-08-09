"use client";

import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Edit, Loader2 } from "lucide-react";
import { useUiText } from "@/hooks/use-ui-text";

export function SettingsBlock<T>({
  title,
  description,
  data,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  data: T;
  /**
   * May be async. If it returns a promise, the editor stays open and the
   * button reads "Saving…" until it settles, and a rejection keeps the editor
   * open with the message rather than closing over a save that did not happen.
   *
   * Existing synchronous callers are unaffected — awaiting `undefined` resolves
   * immediately and the behaviour is exactly what it was.
   */
  onSave: (data: T) => void | Promise<unknown>;
  children: (
    isEditing: boolean,
    localData: T,
    setLocalData: (d: T) => void,
  ) => ReactNode;
}) {
  const { t } = useUiText();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  if (!mounted) {
    return null;
  }

  // ── WHY THIS AWAITS ──────────────────────────────────────────────────────
  //
  // It used to call onSave and close the editor in the same breath. Every
  // section wrote to a fixture, so nothing could fail and the difference never
  // showed. Now that a section can write to the DATABASE, a refusal — a
  // receptionist without `settings_general`, RLS declining the row — would
  // close the editor and redisplay the OLD values as though they had just been
  // saved. The user's edit is gone and they were told it worked.
  const handleSave = async () => {
    setProblem(null);
    setSaving(true);
    try {
      await onSave(localData);
      setIsEditing(false);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalData(data);
    setProblem(null);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {saving ? t("Saving…") : t("Save")}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                {t("Cancel")}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              {t("Edit")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {problem && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {problem}
          </p>
        )}
        {children(isEditing, localData, setLocalData)}
      </CardContent>
    </Card>
  );
}
